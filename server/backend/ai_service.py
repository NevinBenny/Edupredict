from flask import Blueprint, jsonify, session
import random
import os
import joblib
import numpy as np

ai_bp = Blueprint('ai_bp', __name__)

# Load Model and Scaler
MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "risk_model.pkl")
SCALER_PATH = os.path.join(os.path.dirname(__file__), "models", "scaler.pkl")

model = None
scaler = None

if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
    try:
        model = joblib.load(MODEL_PATH)
        scaler = joblib.load(SCALER_PATH)
        print("AI Model and Scaler loaded successfully.")
    except Exception as e:
        print(f"Error loading AI models: {e}")

@ai_bp.route('/api/ai/predict', methods=['GET'])
def predict_risk():
    """
    Advanced AI analysis engine that computes weighted risk scores and 
    generates personalized academic interventions.
    """
    user_id = session.get("user_id")
    role = session.get("role")
    
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
        
    conn = None
    try:
        from db_connect import get_connection
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        
        # Determine department filter for faculty
        dept_filter = None
        if role == "FACULTY":
            cur.execute("SELECT department FROM faculties WHERE email = (SELECT email FROM users WHERE id = %s)", (user_id,))
            f_row = cur.fetchone()
            dept_filter = f_row['department'] if f_row and f_row['department'] else None
        
        # 1. Fetch Students with deep academic history
        query = """
            SELECT 
                s.student_id, s.name, s.department, s.semester, s.risk_level, 
                COALESCE(s.risk_score, 0) as risk_score, s.sgpa, s.backlogs,
                AVG(sar.attendance_percentage) as avg_att,
                AVG(sar.internal_marks) as avg_marks,
                AVG(sar.assignment_score) as avg_assignment
            FROM students s
            LEFT JOIN student_academic_records sar ON s.student_id = sar.student_id
        """
        
        params = []
        if dept_filter:
            query += " WHERE s.department = %s"
            params.append(dept_filter)
            
        query += " GROUP BY s.student_id"
        
        cur.execute(query, tuple(params))
        students = cur.fetchall()
        
        if not students:
            return jsonify({"error": "No data found"}), 404

        # 2. Advanced Risk Reasoning Engine (Real ML Model)
        analyzed_students = []
        high_risk_triggers = []
        
        for s in students:
            # Fallback to simulation if model is not loaded
            if model and scaler:
                # Features: ['attendance_percentage', 'internal_marks', 'assignment_score', 'sgpa', 'backlogs']
                features = np.array([[
                    float(s['avg_att'] or 0),
                    float(s['avg_marks'] or 0),
                    float(s['avg_assignment'] or 0),
                    float(s['sgpa'] or 0),
                    int(s['backlogs'] or 0)
                ]])
                
                features_scaled = scaler.transform(features)
                prediction = model.predict(features_scaled)[0]
                probabilities = model.predict_proba(features_scaled)[0]
                
                # Risk Score based on High/Medium proba
                # Class orders vary, but usually 0:High, 1:Low, 2:Medium (alphabetic)
                # Let's derive a simple score from proba
                risk_level = str(prediction)
                
                # Update local state
                s['risk_level'] = risk_level
                # Score is probability of needing intervention
                # We'll use a weighted score for the UI
                classes = model.classes_.tolist()
                p_high = float(probabilities[classes.index('High')]) if 'High' in classes else 0.0
                p_med = float(probabilities[classes.index('Medium')]) if 'Medium' in classes else 0.0
                s['risk_score'] = float(round((p_high * 100) + (p_med * 40), 1))
            else:
                # Simulation fallback logic
                att = float(s['avg_att'] or 0)
                marks = float(s['avg_marks'] or 0)
                if att < 75 or marks < 14 or s['backlogs'] > 1:
                    s['risk_level'] = 'High'
                    s['risk_score'] = 85.0
                elif att < 85:
                    s['risk_level'] = 'Medium'
                    s['risk_score'] = 45.0
                else:
                    s['risk_level'] = 'Low'
                    s['risk_score'] = 12.0

            # Generate AI Reasons (Explainability)
            reasons = []
            att = float(s['avg_att'] or 0)
            marks = float(s['avg_marks'] or 0)
            backlogs = int(s['backlogs'] or 0)
            
            if att < 75: reasons.append(f"Critical attendance deficit ({att:.1f}%)")
            if marks < 15: reasons.append(f"Low internal assessment performance ({marks:.1f}/25)")
            if backlogs > 1: reasons.append(f"Active backlog accumulation ({backlogs} subjects)")
            if s['sgpa'] < 6.5: reasons.append(f"Sustained SGPA depression ({s['sgpa']})")
            
            s['ai_reasons'] = reasons or ["Stable performance detected"]
            
            # 3. Persist AI Results to DB
            cur.execute("""
                UPDATE students 
                SET risk_level = %s, risk_score = %s 
                WHERE student_id = %s
            """, (s['risk_level'], s['risk_score'], s['student_id']))
            
            analyzed_students.append(s)
            if s['risk_level'] == 'High':
                high_risk_triggers.append(s)

        conn.commit()

        # 4. Aggregated Insights Engine
        total = len(students)
        high_risk = len(high_risk_triggers)
        dept_risk = {}
        for s in students:
            dept = s['department'] or "Unassigned"
            if dept not in dept_risk: dept_risk[dept] = {"count": 0, "total": 0}
            dept_risk[dept]["total"] += 1
            if s['risk_level'] == 'High': dept_risk[dept]["count"] += 1

        insights = []
        # Insight 1: Concentration
        if dept_risk:
            top_dept = max(dept_risk.items(), key=lambda x: x[1]['count']/x[1]['total'] if x[1]['total']>0 else 0)
            if top_dept[1]['count'] > 0:
                insights.append(f"The {top_dept[0]} department shows a higher risk density ({round((top_dept[1]['count']/top_dept[1]['total'])*100)}%). Targeted academic support is advised for this group.")

        # Insight 2: Attendance correlation
        low_att_high_risk = len([s for s in high_risk_triggers if float(s['avg_att'] or 100) < 75])
        if high_risk > 0:
            corr = (low_att_high_risk / high_risk) * 100
            if corr > 60:
                insights.append(f"Strong Correlation Detected: {round(corr)}% of High-Risk students also have sub-75% attendance. Attendance is the leading risk indicator.")

        # Insight 3: Predicted Trend
        potential_migration = len([s for s in students if float(s['avg_marks'] or 25) < 14 and s['risk_level'] != 'High'])
        if potential_migration > 0:
            insights.append(f"AI Projection: Based on current internal marks, {potential_migration} additional students may migrate to Medium/High risk by semester end.")

        # 5. Final Payload
        return jsonify({
            "summary": {
                "total_students": total,
                "high_risk_count": high_risk,
                "avg_risk_score": round(sum(float(s['risk_score']) for s in students)/total, 1) if total > 0 else 0
            },
            "distribution": [
                {"name": "Low Risk", "value": len([s for s in students if s['risk_level'] == 'Low']), "color": "#10B981"},
                {"name": "Medium Risk", "value": len([s for s in students if s['risk_level'] == 'Medium']), "color": "#F59E0B"},
                {"name": "High Risk", "value": high_risk, "color": "#EF4444"}
            ],
            "insights": insights,
            "high_risk_students": [s for s in analyzed_students if s['risk_level'] == 'High']
        })

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500
    finally:
        if conn: conn.close()
