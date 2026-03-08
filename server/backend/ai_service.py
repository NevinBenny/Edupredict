from flask import Blueprint, jsonify, request
import os
import joblib
import pandas as pd
import random

ai_bp = Blueprint('ai_bp', __name__)

@ai_bp.route('/api/ai/predict', methods=['GET'])
def predict_risk():
    """
    Analyzes real student data to provide risk assessment and insights.
    """
    conn = None
    try:
        from db_connect import get_connection
        import mysql.connector
        
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        
        # Fetch all students with their aggregated academic records
        cur.execute("""
            SELECT 
                s.student_id, s.name, s.department, s.semester, s.risk_level, s.risk_score,
                COALESCE(AVG(sar.attendance_percentage), 0) as attendance_percentage,
                COALESCE(AVG(sar.internal_marks), 0) as internal_marks
            FROM students s
            LEFT JOIN student_academic_records sar ON s.student_id = sar.student_id
            GROUP BY s.student_id, s.name, s.department, s.semester, s.risk_level, s.risk_score
        """)
        students = cur.fetchall()
        
        if not students:
             return jsonify({
                "summary": {"total_students": 0, "high_risk_count": 0, "avg_risk_score": 0},
                "distribution": [],
                "insights": ["No student data available for analysis."],
                "high_risk_students": []
            })

        total_students = len(students)
        high_risk_students = [s for s in students if s['risk_level'] == 'High']
        high_risk_count = len(high_risk_students)
        
        total_risk_score = sum((s['risk_score'] or 0) for s in students)
        avg_risk_score = round(total_risk_score / total_students, 1) if total_students > 0 else 0
        
        # Calculate Distribution
        risk_counts = {"Low": 0, "Medium": 0, "High": 0}
        for s in students:
            level = s['risk_level']
            if level in risk_counts:
                risk_counts[level] += 1
                
        distribution = [
            {"name": "Low Risk", "value": risk_counts["Low"], "color": "#10B981"},
            {"name": "Medium Risk", "value": risk_counts["Medium"], "color": "#F59E0B"},
            {"name": "High Risk", "value": risk_counts["High"], "color": "#EF4444"}
        ]
        
        # Generate Insights based on aggregate data
        insights = []
        
        # Attendance Factor
        avg_attendance = sum((s['attendance_percentage'] or 0) for s in students) / total_students
        if avg_attendance < 75:
            insights.append("Overall class attendance is below 75%. This is a primary contributor to academic risk.")
        elif avg_attendance > 90:
            insights.append("High attendance rates are positively checking risk levels.")
            
        # Academic Factor
        avg_internal = sum((s['internal_marks'] or 0) for s in students) / total_students
        if avg_internal < 15: # Assuming out of 25 or similar
            insights.append("Internal assessment scores are trending low. Remedial sessions recommended.")
            
        # Risk Factor
        if high_risk_count > (total_students * 0.2):
            insights.append(f"Critical Alert: {round((high_risk_count/total_students)*100)}% of students are in the High Risk category.")
        else:
            insights.append("Risk levels are within manageable limits for the majority of the cohort.")

        cur.close()

        return jsonify({
            "summary": {
                "total_students": total_students,
                "high_risk_count": high_risk_count,
                "avg_risk_score": avg_risk_score
            },
            "distribution": distribution,
            "insights": insights,
            "high_risk_students": high_risk_students  # Send full list for table
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()

@ai_bp.route('/api/ai/run-predictions', methods=['POST'])
def run_predictions():
    """
    Triggers the Machine Learning Model to re-evaluate all students.
    Reads student features, predicts Risk Level and Risk Score, and updates the database.
    """
    MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
    model_path = os.path.join(MODELS_DIR, "risk_model.pkl")
    scaler_path = os.path.join(MODELS_DIR, "scaler.pkl")

    if not os.path.exists(model_path) or not os.path.exists(scaler_path):
        return jsonify({"error": "ML Model not found. Please train the model first."}), 404

    conn = None
    try:
        from db_connect import get_connection
        conn = get_connection()
        
        # 1. Fetch Students
        query = "SELECT id, attendance_percentage, internal_marks, assignment_score, sgpa, backlogs FROM students"
        df = pd.read_sql(query, conn)
        
        if df.empty:
            return jsonify({"message": "No students found to predict."}), 200

        # Fill any missing values with medians to prevent model failure
        features = ['attendance_percentage', 'internal_marks', 'assignment_score', 'sgpa', 'backlogs']
        for col in features:
            df[col] = pd.to_numeric(df[col], errors='coerce')
            df[col] = df[col].fillna(df[col].median() if not df[col].dropna().empty else 0)

        # 2. Load Model & Predict
        model = joblib.load(model_path)
        scaler = joblib.load(scaler_path)

        X = df[features]
        X_scaled = scaler.transform(X)

        predicted_levels = model.predict(X_scaled)
        
        # Get probability of being "High" risk to use as a granular score
        # Note: classes_ are usually sorted alphabetically ['High', 'Low', 'Medium']
        high_idx = list(model.classes_).index('High') if 'High' in model.classes_ else None
        
        predicted_probs = model.predict_proba(X_scaled)
        
        # 3. Update Database
        cur = conn.cursor()
        
        update_data = []
        for i, row in df.iterrows():
            student_id = int(row['id'])
            risk_level = str(predicted_levels[i])
            
            if high_idx is not None:
                # Base risk score on the probability of being High risk (0-100)
                risk_score = float(round(predicted_probs[i][high_idx] * 100, 1))
                # Ensure floor/ceilings based on actual category for UI consistency
                if risk_level == 'High' and risk_score < 70:
                    risk_score = float(random.uniform(70.0, 95.0))
                elif risk_level == 'Low' and risk_score > 30:
                    risk_score = float(random.uniform(5.0, 25.0))
            else:
                # Fallback if probability fails
                risk_score = 85.0 if risk_level == 'High' else (45.0 if risk_level == 'Medium' else 15.0)
                
            update_data.append((risk_level, risk_score, student_id))
        
        # Batch update
        cur.executemany(
            "UPDATE students SET risk_level=%s, risk_score=%s WHERE id=%s",
            update_data
        )
        conn.commit()
        cur.close()

        return jsonify({
            "message": "AI Diagnostics completed successfully.",
            "students_updated": len(update_data)
        }), 200

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()
