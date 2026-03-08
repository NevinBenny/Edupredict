from flask import Blueprint, jsonify, request
from db_connect import get_connection
import mysql.connector

dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.route("/api/dashboard/summary", methods=["GET"])
def get_summary():
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        
        # Total Students
        cur.execute("SELECT COUNT(*) as total FROM students")
        total = cur.fetchone()['total']
        
        # Average Attendance
        cur.execute("SELECT AVG(attendance_percentage) as avg_attendance FROM students")
        avg_attendance = cur.fetchone()['avg_attendance'] or 0
        
        # Average SGPA
        cur.execute("SELECT AVG(sgpa) as avg_sgpa FROM students")
        avg_sgpa = cur.fetchone()['avg_sgpa'] or 0
        
        # High Risk Count
        cur.execute("SELECT COUNT(*) as high_risk FROM students WHERE risk_level = 'High'")
        high_risk = cur.fetchone()['high_risk']
        
        summary = {
            "total_students": total,
            "avg_attendance": round(float(avg_attendance), 1),
            "avg_sgpa": round(float(avg_sgpa), 2),
            "high_risk_students": high_risk
        }
        
        cur.close()
        return jsonify(summary)
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 500
    finally:
        if conn:
            conn.close()

@dashboard_bp.route("/api/dashboard/risk-distribution", methods=["GET"])
def get_risk_distribution():
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        
        cur.execute("""
            SELECT risk_level, COUNT(*) as count 
            FROM students 
            GROUP BY risk_level
        """)
        rows = cur.fetchall()
        
        # Map to specific frontend format with restrained colors
        risk_map = {
            "Low": {"color": "#10b981", "order": 1},
            "Medium": {"color": "#f59e0b", "order": 2},
            "High": {"color": "#ef4444", "order": 3}
        }
        
        distribution = []
        for row in rows:
            level = row['risk_level']
            if level in risk_map:
                distribution.append({
                    "name": level if "Risk" in level else f"{level} Risk",
                    "value": row['count'],
                    "color": risk_map[level]['color'],
                    "order": risk_map[level]['order']
                })
        
        # Sort by predefined order
        distribution.sort(key=lambda x: x['order'])
        
        cur.close()
        return jsonify(distribution)
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 500
    finally:
        if conn:
            conn.close()

@dashboard_bp.route("/api/students", methods=["GET"])
def get_students():
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        
        cur.execute("""
            SELECT 
                student_id, name, department, semester, 
                attendance_percentage, internal_marks, 
                assignment_score, sgpa, backlogs, 
                risk_score, risk_level 
            FROM students
            ORDER BY created_at DESC
        """)
        students = cur.fetchall()
        
        # Format decimals/floats for JSON compatibility
        for student in students:
            student['attendance_percentage'] = float(student['attendance_percentage'])
            student['sgpa'] = float(student['sgpa'])
            student['risk_score'] = float(student['risk_score'])
            
        cur.close()
        return jsonify({"students": students, "total": len(students)})
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 500
    finally:
        if conn:
            conn.close()

@dashboard_bp.route("/api/students", methods=["POST"])
def add_student():
    data = request.json
    required_fields = ["student_id", "name", "subject_id", "attendance_percentage"]
    
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400
            
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        
        # 1. Validate subject_id exists
        cur.execute("SELECT id FROM subjects WHERE id=%s", (data['subject_id'],))
        if not cur.fetchone():
            return jsonify({"error": "Invalid subject_id. The selected subject does not exist."}), 404
            
        # 2. Ensure student exists in base table
        cur.execute("SELECT id FROM students WHERE student_id=%s", (data['student_id'],))
        existing_student = cur.fetchone()
        
        if not existing_student:
            # Create base student record
            cur.execute("""
                INSERT INTO students (student_id, name, department, semester) 
                VALUES (%s, %s, %s, %s)
            """, (data['student_id'], data['name'], '', '1'))
            student_db_id = cur.lastrowid
        else:
            student_db_id = existing_student['id']
        
        # Default calculations if not provided
        internal_marks = data.get("internal_marks", 0)
        assignment_score = data.get("assignment_score", 0)
        
        # 3. Check if academic record already exists for this subject
        cur.execute("""
            SELECT id FROM student_academic_records 
            WHERE student_id=%s AND subject_id=%s
        """, (student_db_id, data['subject_id']))
        existing_record = cur.fetchone()
        
        if existing_record:
            # Update existing record
            cur.execute("""
                UPDATE student_academic_records 
                SET attendance_percentage=%s, internal_marks=%s, assignment_score=%s
                WHERE id=%s
            """, (data['attendance_percentage'], internal_marks, assignment_score, existing_record['id']))
        else:
            # Insert new record
            cur.execute("""
                INSERT INTO student_academic_records (
                    student_id, subject_id, attendance_percentage, 
                    internal_marks, assignment_score
                ) VALUES (%s, %s, %s, %s, %s)
            """, (student_db_id, data['subject_id'], data['attendance_percentage'], internal_marks, assignment_score))
            
        conn.commit()
        return jsonify({"message": "Student record saved successfully"}), 201
        
    except mysql.connector.Error as err:
        if conn: conn.rollback()
        return jsonify({"error": str(err)}), 500
    finally:
        if conn:
            cur.close()
            conn.close()
