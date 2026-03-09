from flask import Blueprint, jsonify, request, session
from db_connect import get_connection
import mysql.connector
from utils import get_faculty_class_id, generate_student_id

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/api/dashboard/summary", methods=["GET"])
def get_summary():
    conn = None
    try:
        conn = get_connection()
        class_id = get_faculty_class_id(conn)
        
        # Security: If Faculty but no class assigned, return empty stats
        if session.get("role") == "FACULTY" and not class_id:
            conn.close()
            return jsonify({
                "total_students": 0,
                "avg_attendance": 0,
                "avg_sgpa": 0,
                "high_risk_students": 0
            })

        cur = conn.cursor(dictionary=True)

        where = "WHERE class_id = %s" if class_id else ""
        params = (class_id,) if class_id else ()

        cur.execute(f"SELECT COUNT(*) as total FROM students {where}", params)
        total = cur.fetchone()['total']
        
        # Average Attendance from academic records
        cur.execute("SELECT AVG(attendance_percentage) as avg_attendance FROM student_academic_records")
        row = cur.fetchone()
        avg_attendance = float(row['avg_attendance']) if row and row['avg_attendance'] is not None else 0.0
        
        # Average SGPA from students
        cur.execute("SELECT AVG(sgpa) as avg_sgpa FROM students")
        row = cur.fetchone()
        avg_sgpa = float(row['avg_sgpa']) if row and row['avg_sgpa'] is not None else 0.0
        
        # High Risk Count
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
    conn = None
    try:
        conn = get_connection()
        class_id = get_faculty_class_id(conn)
        
        # Security: If Faculty but no class assigned, return empty distribution
        if session.get("role") == "FACULTY" and not class_id:
            conn.close()
            return jsonify([])

        cur = conn.cursor(dictionary=True)

        where = "WHERE class_id = %s" if class_id else ""
        params = (class_id,) if class_id else ()

        cur.execute(f"""
            SELECT risk_level, COUNT(*) as count
            FROM students {where}
            GROUP BY risk_level
        """, params)
        rows = cur.fetchall()

        risk_map = {
            "Low":    {"color": "#10b981", "order": 1},
            "Medium": {"color": "#f59e0b", "order": 2},
            "High":   {"color": "#ef4444", "order": 3}
        }

        distribution = []
        for row in rows:
            level = row['risk_level']
            if level in risk_map:
                distribution.append({
                    "name": f"{level} Risk",
                    "value": row['count'],
                    "color": risk_map[level]['color'],
                    "order": risk_map[level]['order']
                })

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
        class_id = get_faculty_class_id(conn)
        
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
            # First, get the faculty's department to show relevant students
            cur.execute("SELECT department FROM faculties WHERE email = (SELECT email FROM users WHERE id = %s)", (user_id,))
            f_row = cur.fetchone()
            f_dept = f_row['department'] if f_row and f_row['department'] and f_row['department'].strip() else None
            
            students = []
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
            
            if not students:
                # Fallback to all students if no students found for dept or no dept
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
                    ORDER BY s.risk_score DESC, s.name ASC
                """)
                students = cur.fetchall()
        
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
        
        # ── Faculty Scoping & Auto-Fill ───────────────────────────────────────
        class_id = None
        department = data.get("department", "").strip()
        semester = data.get("semester", "").strip()

        if session.get("role") == "FACULTY":
            # Get full class details for the logged-in faculty
            email = session.get("email")
            cur.execute("""
                SELECT c.id, c.department, c.semester 
                FROM faculties f
                JOIN classes c ON f.class_id = c.id
                WHERE f.email = %s
            """, (email,))
            classroom = cur.fetchone()
            
            if not classroom:
                cur.close()
                return jsonify({"error": "You must be assigned to a class to add students."}), 403
            
            class_id = classroom["id"]
            department = classroom["department"]
            semester = classroom["semester"]
        
        # ── Usage & Logic Validation ──────────────────────────────────────────
        # For non-faculty (e.g. legacy/admin), dept/sem must be in body
        if not department or not semester:
            cur.close()
            return jsonify({"error": "Department and Semester are required."}), 400

        required_fields = ["name", "attendance_percentage"]
        for field in required_fields:
            if not data.get(field):
                cur.close()
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # Auto-generate ID if not provided
        student_id = data.get("student_id")
        if not student_id:
            student_id = generate_student_id(conn, department)

        # ── Risk Calculation ──────────────────────────────────────────────────
        internal_marks   = data.get("internal_marks", 0)
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
