from flask import Blueprint, jsonify
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
        
        # Fetch all students
        cur.execute("SELECT * FROM students")
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
        
        total_risk_score = sum(s['risk_score'] for s in students)
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
        avg_attendance = sum(s['attendance_percentage'] for s in students) / total_students
        if avg_attendance < 75:
            insights.append("Overall class attendance is below 75%. This is a primary contributor to academic risk.")
        elif avg_attendance > 90:
            insights.append("High attendance rates are positively checking risk levels.")
            
        # Academic Factor
        avg_internal = sum(s['internal_marks'] for s in students) / total_students
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
