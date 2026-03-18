from flask import Blueprint, jsonify, request, session
from db_connect import get_connection
import mysql.connector

dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.route("/api/dashboard/summary", methods=["GET"])
def get_summary():
    user_id = session.get("user_id")
    role = session.get("role")
    
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
        
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        
        dept_filter = None
        if role == "FACULTY":
            cur.execute("SELECT department FROM faculties WHERE email = (SELECT email FROM users WHERE id = %s)", (user_id,))
            f_row = cur.fetchone()
            dept_filter = f_row['department'] if f_row and f_row['department'] else None

        # Total Students
        if dept_filter:
            cur.execute("SELECT COUNT(*) as total FROM students WHERE department = %s", (dept_filter,))
        else:
            cur.execute("SELECT COUNT(*) as total FROM students")
        total = cur.fetchone()['total']
        
        # Average Attendance
        if dept_filter:
            cur.execute("""
                SELECT AVG(sar.attendance_percentage) as avg_attendance 
                FROM student_academic_records sar
                JOIN students s ON sar.student_id = s.student_id
                WHERE s.department = %s
            """, (dept_filter,))
        else:
            cur.execute("SELECT AVG(attendance_percentage) as avg_attendance FROM student_academic_records")
        row = cur.fetchone()
        avg_attendance = float(row['avg_attendance']) if row and row['avg_attendance'] is not None else 0.0
        
        # Average SGPA
        if dept_filter:
            cur.execute("SELECT AVG(sgpa) as avg_sgpa FROM students WHERE department = %s", (dept_filter,))
        else:
            cur.execute("SELECT AVG(sgpa) as avg_sgpa FROM students")
        row = cur.fetchone()
        avg_sgpa = float(row['avg_sgpa']) if row and row['avg_sgpa'] is not None else 0.0
        
        # High Risk Count
        if dept_filter:
            cur.execute("SELECT COUNT(*) as high_risk FROM students WHERE risk_level = 'High' AND department = %s", (dept_filter,))
        else:
            cur.execute("SELECT COUNT(*) as high_risk FROM students WHERE risk_level = 'High'")
        high_risk = cur.fetchone()['high_risk']
        
        summary = {
            "total_students": total,
            "avg_attendance": round(avg_attendance, 1),
            "avg_sgpa": round(avg_sgpa, 2),
            "high_risk_students": high_risk
        }
        
        cur.close()
        return jsonify(summary)
    except Exception as err:
        return jsonify({"error": str(err)}), 500
    finally:
        if conn:
            conn.close()

@dashboard_bp.route("/api/dashboard/risk-distribution", methods=["GET"])
def get_risk_distribution():
    user_id = session.get("user_id")
    role = session.get("role")
    
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
        
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        
        dept_filter = None
        if role == "FACULTY":
            cur.execute("SELECT department FROM faculties WHERE email = (SELECT email FROM users WHERE id = %s)", (user_id,))
            f_row = cur.fetchone()
            dept_filter = f_row['department'] if f_row and f_row['department'] else None

        if dept_filter:
            cur.execute("""
                SELECT risk_level, COUNT(*) as count 
                FROM students 
                WHERE department = %s
                GROUP BY risk_level
            """, (dept_filter,))
        else:
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
    user_id = session.get("user_id")
    role = session.get("role")
    
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    if role not in ("ADMIN", "FACULTY"):
        return jsonify({"error": "Forbidden"}), 403
        
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        
        if role == "ADMIN":
            cur.execute("""
                SELECT 
                    s.student_id, s.name, s.department, s.semester, u.email,
                    COALESCE(AVG(sar.attendance_percentage), 0) as attendance_percentage,
                    COALESCE(AVG(sar.internal_marks), 0) as internal_marks, 
                    COALESCE(AVG(sar.assignment_score), 0) as assignment_score,
                    s.sgpa, s.backlogs, 
                    s.risk_score, s.risk_level,
                    NULL as subject_name
                FROM students s
                LEFT JOIN users u ON s.user_id = u.id
                LEFT JOIN student_academic_records sar ON s.student_id = sar.student_id
                GROUP BY s.student_id, s.name, s.department, s.semester, u.email, s.sgpa, s.backlogs, s.risk_score, s.risk_level
                ORDER BY s.created_at DESC
            """)
            students = cur.fetchall()
        elif role == "FACULTY":
            # Get the faculty's department to show relevant students
            cur.execute("SELECT department FROM faculties WHERE email = (SELECT email FROM users WHERE id = %s)", (user_id,))
            f_row = cur.fetchone()
            f_dept = f_row['department'] if f_row and f_row['department'] and f_row['department'].strip() else None
            
            if f_dept:
                cur.execute("""
                    SELECT 
                        s.student_id, s.name, s.department, s.semester, u.email,
                        COALESCE(AVG(sar.attendance_percentage), 0) as attendance_percentage,
                        COALESCE(AVG(sar.internal_marks), 0) as internal_marks, 
                        COALESCE(AVG(sar.assignment_score), 0) as assignment_score,
                        s.sgpa, s.backlogs, 
                        s.risk_score, s.risk_level,
                        NULL as subject_name
                    FROM students s
                    LEFT JOIN users u ON s.user_id = u.id
                    LEFT JOIN student_academic_records sar ON s.student_id = sar.student_id
                    WHERE s.department = %s
                    GROUP BY s.student_id, s.name, s.department, s.semester, u.email, s.sgpa, s.backlogs, s.risk_score, s.risk_level
                    ORDER BY s.risk_score DESC, s.name ASC
                """, (f_dept,))
                students = cur.fetchall()
            else:
                students = []
        
        # Format decimals/floats for JSON compatibility
        for student in students:
            student['attendance_percentage'] = round(float(student['attendance_percentage']), 2) if student['attendance_percentage'] is not None else 0.0
            student['internal_marks'] = round(float(student['internal_marks']), 2) if student['internal_marks'] is not None else 0.0
            student['assignment_score'] = round(float(student['assignment_score']), 2) if student['assignment_score'] is not None else 0.0
            student['sgpa'] = round(float(student['sgpa']), 2) if student['sgpa'] is not None else 0.0
            student['risk_score'] = round(float(student['risk_score']), 2) if student['risk_score'] is not None else 0.0
            student['backlogs'] = int(student['backlogs']) if student['backlogs'] is not None else 0
            
        cur.close()
        return jsonify({"students": students, "total": len(students)})
    except Exception as err:
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
            
        cur.close()
        return jsonify({"message": "Student record saved successfully"}), 201
        
    except mysql.connector.Error as err:
        if conn: conn.rollback()
        return jsonify({"error": str(err)}), 500
    finally:
        if conn:
            conn.close()

@dashboard_bp.route("/api/dashboard/faculty-subjects", methods=["GET"])
def get_faculty_subjects():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        # Assuming faculty_subjects table maps faculty (via email/user_id) to subjects
        cur.execute("""
            SELECT s.id, s.name, s.code, s.department, s.semester
            FROM subjects s
            JOIN faculty_subjects fs ON s.id = fs.subject_id
            JOIN faculties f ON fs.faculty_id = f.id
            JOIN users u ON f.email = u.email
            WHERE u.id = %s
        """, (user_id,))
        subjects = cur.fetchall()
        cur.close()
        return jsonify({"subjects": subjects})
    except Exception as err:
        return jsonify({"error": str(err)}), 500
    finally:
        if conn:
            conn.close()

@dashboard_bp.route("/api/students/import", methods=["POST"])
def import_students():
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Empty filename"}), 400

    # Basic CSV parsing logic (simulated for now, can use pandas later)
    import csv
    import io
    
    stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
    csv_reader = csv.DictReader(stream)
    
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        imported_count = 0
        for row in csv_reader:
            # Required: student_id, name, subject_id, attendance
            # This is a simplified import
            student_id = row.get('student_id')
            name = row.get('name')
            subject_id = row.get('subject_id')
            att = row.get('attendance', 0)
            
            if not student_id or not subject_id: continue
            
            # 1. Ensure student exists
            cur.execute("SELECT id FROM students WHERE student_id=%s", (student_id,))
            res = cur.fetchone()
            if not res:
                cur.execute("INSERT INTO students (student_id, name) VALUES (%s, %s)", (student_id, name))
                s_db_id = cur.lastrowid
            else:
                s_db_id = res[0]
            
            # 2. Upsert academic record
            cur.execute("""
                INSERT INTO student_academic_records (student_id, subject_id, attendance_percentage)
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE attendance_percentage=%s
            """, (s_db_id, subject_id, att, att))
            imported_count += 1
            
        conn.commit()
        cur.close()
        return jsonify({"message": f"Successfully imported {imported_count} records"}), 200
    except Exception as err:
        if conn: conn.rollback()
        return jsonify({"error": str(err)}), 500
    finally:
        if conn:
            conn.close()

@dashboard_bp.route("/api/dashboard/my-summary", methods=["GET"])
def get_my_summary():
    user_id = session.get("user_id")
    role = session.get("role")
    
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    if role != "STUDENT":
        return jsonify({"error": "Forbidden"}), 403
        
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        
        # Get student basic info
        cur.execute("""
            SELECT student_id, name, department, semester, sgpa, backlogs, risk_score, risk_level
            FROM students 
            WHERE user_id = %s
        """, (user_id,))
        student = cur.fetchone()
        
        if not student:
            return jsonify({"error": "Student record not found"}), 404
            
        # Get overall attendance
        cur.execute("""
            SELECT AVG(attendance_percentage) as avg_attendance
            FROM student_academic_records
            WHERE student_id = %s
        """, (student['student_id'],))
        att_row = cur.fetchone()
        avg_attendance = float(att_row['avg_attendance']) if att_row and att_row['avg_attendance'] is not None else 0.0
        
        summary = {
            "name": student['name'],
            "student_id": student['student_id'],
            "department": student['department'],
            "semester": student['semester'],
            "sgpa": round(float(student['sgpa']), 2),
            "backlogs": int(student['backlogs']),
            "risk_score": round(float(student['risk_score']), 2),
            "risk_level": student['risk_level'],
            "avg_attendance": round(avg_attendance, 1)
        }
        
        cur.close()
        return jsonify(summary)
    except Exception as err:
        return jsonify({"error": str(err)}), 500
    finally:
        if conn:
            conn.close()

@dashboard_bp.route("/api/dashboard/my-courses", methods=["GET"])
def get_my_courses():
    if not session.get("user_id"):
        return jsonify({"error": "Unauthorized"}), 401
        
    user_id = session.get("user_id")
    role = session.get("role")
    
    if role != "STUDENT":
        return jsonify({"error": "Forbidden"}), 403
        
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        
        cur.execute("""
            SELECT 
                sub.name as subject_name, sub.course_code, sub.department, sub.semester,
                sar.attendance_percentage, sar.internal_marks, sar.assignment_score
            FROM students s
            JOIN student_academic_records sar ON s.student_id = sar.student_id
            JOIN subjects sub ON sar.subject_id = sub.id
            WHERE s.user_id = %s
            ORDER BY sub.semester DESC, sub.name ASC
        """, (user_id,))
        courses = cur.fetchall()
        
        # Format decimals/floats
        for row in courses:
            row['attendance_percentage'] = float(row['attendance_percentage']) if row['attendance_percentage'] is not None else 0.0
            
        cur.close()
        return jsonify({"courses": courses})
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 500
    finally:
        if conn:
            conn.close()
@dashboard_bp.route("/api/dashboard/faculty-profile", methods=["GET"])
def get_faculty_profile():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
        
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT name, department, designation FROM faculties WHERE email = (SELECT email FROM users WHERE id = %s)", (user_id,))
        faculty = cur.fetchone()
        cur.close()
        
        if not faculty:
            return jsonify({"error": "Faculty record not found"}), 404
            
        return jsonify(faculty)
    except Exception as err:
        return jsonify({"error": str(err)}), 500
    finally:
        if conn:
            conn.close()
