import os
from flask import Blueprint, jsonify, request, session
from db_connect import get_connection

student_bp = Blueprint('student_bp', __name__)

@student_bp.route('/api/student/my-data', methods=['GET'])
def get_my_data():
    """
    Fetches the academic data and assigned interventions for the currently logged-in student.
    Uses the session email to extract the student ID (e.g., mca24001@mca.ajce.in -> MCA24001).
    """
    # Assuming the frontend sends the email via headers or we use session
    # For a stateless API, usually passed via Authorization token, but let's 
    # check if we can get it from the header for now (based on Login flow)
    email = request.headers.get('X-User-Email')
    
    if not email:
        return jsonify({"error": "Unauthorized. Email not provided."}), 401
    
    # Extract student ID from email (everything before the @, converted to uppercase)
    student_id = email.split('@')[0].upper()
    
    conn = get_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
        
    try:
        cur = conn.cursor(dictionary=True)
        
        # 1. Fetch student academic record
        cur.execute("SELECT * FROM students WHERE student_id = %s", (student_id,))
        student_data = cur.fetchone()
        
        if not student_data:
             return jsonify({"error": f"Student record for {student_id} not found."}), 404
             
        # 2. Fetch assigned interventions
        cur.execute("""
            SELECT id, title, description, status, assigned_date, due_date 
            FROM interventions 
            WHERE student_id = %s 
            ORDER BY created_at DESC
        """, (student_id,))
        interventions = cur.fetchall()
        
        # Format the response
        response = {
            "profile": {
                "student_id": student_data["student_id"],
                "name": student_data["name"],
                "department": student_data["department"],
                "semester": student_data["semester"],
            },
            "academics": {
                "attendance": student_data["attendance_percentage"],
                "internal_marks": student_data["internal_marks"],
                "assignment_score": student_data["assignment_score"],
                "sgpa": student_data["sgpa"],
                "backlogs": student_data["backlogs"]
            },
            "ai_insights": {
                "risk_score": student_data["risk_score"],
                "risk_level": student_data["risk_level"]
            },
            "interventions": interventions
        }
        
        return jsonify(response)
        
    except Exception as e:
        print(f"Error fetching student data: {e}")
        return jsonify({"error": "An error occurred while fetching your data."}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()
