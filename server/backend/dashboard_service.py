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
    required_fields = ["student_id", "name"]
    for field in required_fields:
        if not data.get(field):
            return jsonify({"error": f"Missing required field: {field}"}), 400
            
    sid = data.get("student_id")
    name = data.get("name")
    sub_id = data.get("subject_id")
    att = data.get("attendance_percentage", 0)
    
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        
        # 1. Validate subject_id exists (if provided)
        if sub_id:
            cur.execute("SELECT id FROM subjects WHERE id=%s", (sub_id,))
            if not cur.fetchone():
                return jsonify({"error": "Invalid subject_id. The selected subject does not exist."}), 404
            
        # 2. Ensure student exists in base table
        cur.execute("SELECT id FROM students WHERE student_id=%s", (data['student_id'],))
        existing_student = cur.fetchone()
        
        if not existing_student:
            # Get faculty department for context
            cur.execute("SELECT department FROM faculties WHERE email = (SELECT email FROM users WHERE id = %s)", (session.get("user_id"),))
            f_row = cur.fetchone()
            dept = f_row['department'] if f_row and f_row['department'] else ''
            
            # Create base student record
            cur.execute("""
                INSERT INTO students (student_id, name, department, semester) 
                VALUES (%s, %s, %s, %s)
            """, (sid, name, dept, '1'))
            student_db_id = cur.lastrowid
        else:
            student_db_id = existing_student['id']
        
        # Default calculations if not provided
        internal_marks = data.get("internal_marks", 0)
        assignment_score = data.get("assignment_score", 0)
        
        # 3. Create or Update academic record (ONLY if subject exists)
        if sub_id:
            cur.execute("""
                INSERT INTO student_academic_records 
                (student_id, subject_id, attendance_percentage, internal_marks, assignment_score)
                VALUES (%s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE 
                attendance_percentage=%s, internal_marks=%s, assignment_score=%s
            """, (student_db_id, sub_id, att, internal_marks, assignment_score,
                att, internal_marks, assignment_score))
                
        conn.commit()
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
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
        
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Empty filename"}), 400

    import csv
    import io
    import random
    
    try:
        # 1. Get faculty's department for auto-assignment
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT department FROM faculties WHERE email = (SELECT email FROM users WHERE id = %s)", (user_id,))
        f_row = cur.fetchone()
        f_dept = f_row['department'] if f_row and f_row['department'] else None
        
        # 2. Parse CSV
        content = file.stream.read().decode("utf-8-sig") # Handle BOM
        stream = io.StringIO(content)
        csv_reader = csv.DictReader(stream)
        
        # Robust helper for column mapping
        def get_val(row_dict, *keys):
            headers = {str(k).lower().strip(): v for k, v in row_dict.items() if k is not None}
            for k in keys:
                if k.lower() in headers:
                    return str(headers[k.lower()]).strip()
            return ""

        imported_count = 0
        for row in csv_reader:
            sid = get_val(row, 'student_id', 'id', 'student id')
            name = get_val(row, 'name', 'full name', 'student name')
            sub_id = get_val(row, 'subject_id', 'subject', 'course_id')
            att_str = get_val(row, 'attendance', 'attendance_percentage', 'att')
            dept = get_val(row, 'department', 'dept') or f_dept
            sem = get_val(row, 'semester', 'sem') or '1'
            sgpa_str = get_val(row, 'sgpa')
            backlogs_str = get_val(row, 'backlogs')
            
            if not sid or not name: continue
            
            try:
                att = float(att_str) if att_str else 0.0
                sgpa = float(sgpa_str) if sgpa_str else 0.0
                backlogs = int(backlogs_str) if backlogs_str else 0
            except:
                att, sgpa, backlogs = 0.0, 0.0, 0
            
            # Risk calculation
            risk_score = 0
            if att < 75: risk_score += 40
            if sgpa < 6.5: risk_score += 30
            if backlogs > 0: risk_score += 30
            risk_level = "High" if risk_score >= 60 else ("Medium" if risk_score >= 30 else "Low")

            # 3. Upsert Student
            cur.execute("SELECT id FROM students WHERE student_id=%s", (sid,))
            res = cur.fetchone()
            if not res:
                cur.execute("""
                    INSERT INTO students (student_id, name, department, semester, sgpa, backlogs, risk_score, risk_level)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (sid, name, dept, sem, sgpa, backlogs, risk_score, risk_level))
                s_db_id = cur.lastrowid
            else:
                s_db_id = res['id']
                cur.execute("""
                    UPDATE students 
                    SET name=%s, department=%s, semester=%s, sgpa=%s, backlogs=%s, risk_score=%s, risk_level=%s
                    WHERE id=%s
                """, (name, dept, sem, sgpa, backlogs, risk_score, risk_level, s_db_id))
            
            # 4. Upsert academic record (only if subject_id provided)
            if sub_id:
                cur.execute("""
                    INSERT INTO student_academic_records (student_id, subject_id, attendance_percentage)
                    VALUES (%s, %s, %s)
                    ON DUPLICATE KEY UPDATE attendance_percentage=%s
                """, (s_db_id, sub_id, att, att))
                
            imported_count += 1
            
        conn.commit()
        cur.close()
        return jsonify({"message": f"Successfully imported {imported_count} records"}), 200
    except Exception as err:
        if 'conn' in locals() and conn: conn.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(err)}), 500
    finally:
        if 'conn' in locals() and conn:
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
