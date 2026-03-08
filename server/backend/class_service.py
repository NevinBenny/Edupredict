from flask import Blueprint, jsonify, request, session
from db_connect import get_connection
import mysql.connector
from utils import check_admin, generate_student_id

class_bp = Blueprint("classes", __name__)


# ── List all classes ──────────────────────────────────────────────────────────
@class_bp.route("/api/admin/classes", methods=["GET"])
def get_classes():
    is_admin, msg, code = check_admin()
    if not is_admin:
        return jsonify({"message": msg}), code

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT
                c.id,
                c.name,
                c.department,
                c.semester,
                c.created_at,
                f.name  AS faculty_name,
                f.email AS faculty_email,
                f.id    AS faculty_id,
                (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) AS student_count
            FROM classes c
            LEFT JOIN faculties f ON f.class_id = c.id
            ORDER BY c.created_at DESC
        """)
        classes = cur.fetchall()
        cur.close()
        return jsonify({"classes": classes})
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 500
    finally:
        if conn:
            conn.close()


# ── Create a class ────────────────────────────────────────────────────────────
@class_bp.route("/api/admin/classes", methods=["POST"])
def create_class():
    is_admin, msg, code = check_admin()
    if not is_admin:
        return jsonify({"message": msg}), code

    data = request.json
    name = data.get("name", "").strip()
    department = data.get("department", "").strip()
    semester = data.get("semester", "").strip()

    if not name:
        return jsonify({"error": "Class name is required"}), 400

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO classes (name, department, semester) VALUES (%s, %s, %s)",
            (name, department, semester)
        )
        conn.commit()
        new_id = cur.lastrowid
        cur.close()
        return jsonify({"message": "Class created", "id": new_id}), 201
    except mysql.connector.IntegrityError:
        return jsonify({"error": f"Class '{name}' already exists"}), 409
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 500
    finally:
        if conn:
            conn.close()


# ── Delete a class ────────────────────────────────────────────────────────────
@class_bp.route("/api/admin/classes/<int:class_id>", methods=["DELETE"])
def delete_class(class_id):
    is_admin, msg, code = check_admin()
    if not is_admin:
        return jsonify({"message": msg}), code

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        # Unlink students and faculty first (FK is SET NULL, but let's be explicit)
        cur.execute("UPDATE students SET class_id = NULL WHERE class_id = %s", (class_id,))
        cur.execute("UPDATE faculties SET class_id = NULL WHERE class_id = %s", (class_id,))
        cur.execute("DELETE FROM classes WHERE id = %s", (class_id,))
        conn.commit()
        cur.close()
        return jsonify({"message": "Class deleted"})
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 500
    finally:
        if conn:
            conn.close()


# ── Assign a faculty to a class ───────────────────────────────────────────────
@class_bp.route("/api/admin/classes/<int:class_id>/assign-faculty", methods=["PUT"])
def assign_faculty(class_id):
    is_admin, msg, code = check_admin()
    if not is_admin:
        return jsonify({"message": msg}), code

    data = request.json
    faculty_id = data.get("faculty_id")

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        # Unassign any faculty currently holding this class
        cur.execute("UPDATE faculties SET class_id = NULL WHERE class_id = %s", (class_id,))
        if faculty_id:
            cur.execute("UPDATE faculties SET class_id = %s WHERE id = %s", (class_id, faculty_id))
        conn.commit()
        cur.close()
        return jsonify({"message": "Faculty assigned to class"})
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 500
    finally:
        if conn:
            conn.close()


# ── Get students in a class ───────────────────────────────────────────────────
@class_bp.route("/api/admin/classes/<int:class_id>/students", methods=["GET"])
def get_class_students(class_id):
    is_admin, msg, code = check_admin()
    if not is_admin:
        return jsonify({"message": msg}), code

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT s.student_id, s.name, s.department, s.semester,
                   AVG(r.attendance_percentage) as attendance_percentage, 
                   s.sgpa, s.risk_level, s.backlogs
            FROM students s
            LEFT JOIN student_academic_records r ON s.student_id = r.student_id
            WHERE s.class_id = %s
            GROUP BY s.student_id, s.name, s.department, s.semester, s.sgpa, s.risk_level, s.backlogs
            ORDER BY s.name
        """, (class_id,))
        students = cur.fetchall()
        for s in students:
            s["attendance_percentage"] = float(s["attendance_percentage"])
            s["sgpa"] = float(s["sgpa"])
        cur.close()
        return jsonify({"students": students})
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 500
    finally:
        if conn:
            conn.close()


# ── Add a brand-new student directly into a class ─────────────────────────────
@class_bp.route("/api/admin/classes/<int:class_id>/students", methods=["POST"])
def add_student_to_class(class_id):
    is_admin, msg, code = check_admin()
    if not is_admin:
        return jsonify({"message": msg}), code

    data = request.json
    required = ["name", "department", "semester", "attendance_percentage"]
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"Missing required field: {field}"}), 400

    internal_marks   = float(data.get("internal_marks", 0))
    assignment_score = float(data.get("assignment_score", 0))
    sgpa             = float(data.get("sgpa", 0.0))
    backlogs         = int(data.get("backlogs", 0))
    attendance       = float(data["attendance_percentage"])
    department       = data["department"].strip()
    semester         = data["semester"].strip()

    # Auto risk calculation
    risk_score = 0
    if attendance < 75:   risk_score += 40
    if sgpa < 6.5:        risk_score += 30
    if backlogs > 0:      risk_score += 30
    risk_level = "High" if risk_score >= 60 else ("Medium" if risk_score >= 30 else "Low")

    conn = None
    try:
        conn = get_connection()
        
        # Auto-generate ID using shared utility
        student_id = generate_student_id(conn, department)

        cur = conn.cursor()
        cur.execute("""
            INSERT INTO students
                (student_id, name, department, semester,
                 sgpa, backlogs, risk_score, risk_level, class_id)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            student_id, data["name"], department, semester,
            sgpa, backlogs, risk_score, risk_level, class_id
        ))
        
        # V2: Auto-enroll in Subjects and insert records
        if semester and department:
            cur.execute("SELECT id FROM subjects WHERE department=%s AND semester=%s", (department, semester))
            matching_subjects = cur.fetchall()
            
            if matching_subjects:
                insert_records_query = """
                    INSERT IGNORE INTO student_academic_records 
                    (student_id, subject_id, attendance_percentage, internal_marks, assignment_score)
                    VALUES (%s, %s, %s, %s, %s)
                """
                for sub in matching_subjects:
                    cur.execute(insert_records_query, (
                        student_id, sub[0], attendance, internal_marks, assignment_score
                    ))
                    
        conn.commit()
        cur.close()
        return jsonify({"message": "Student added to class", "student_id": student_id}), 201
    except mysql.connector.IntegrityError:
        return jsonify({"error": f"Student ID '{student_id}' already exists — please retry"}), 409
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 500
    finally:
        if conn:
            conn.close()


# ── Bulk-assign existing (unclassed) students to a class ──────────────────────
@class_bp.route("/api/admin/classes/<int:class_id>/assign-students", methods=["PUT"])
def assign_students(class_id):
    is_admin, msg, code = check_admin()
    if not is_admin:
        return jsonify({"message": msg}), code

    data = request.json
    student_ids = data.get("student_ids", [])   # list of student_id strings

    if not student_ids:
        return jsonify({"error": "No student IDs provided"}), 400

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        fmt = ",".join(["%s"] * len(student_ids))
        cur.execute(
            f"UPDATE students SET class_id = %s WHERE student_id IN ({fmt})",
            [class_id] + student_ids
        )
        conn.commit()
        cur.close()
        return jsonify({"message": f"{cur.rowcount} student(s) assigned to class"})
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 500
    finally:
        if conn:
            conn.close()


# ── Get unassigned students (for the assign-existing modal) ───────────────────
@class_bp.route("/api/admin/students/unassigned", methods=["GET"])
def get_unassigned_students():
    is_admin, msg, code = check_admin()
    if not is_admin:
        return jsonify({"message": msg}), code

    department = request.args.get("department", "").strip()
    semester   = request.args.get("semester", "").strip()

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)

        conditions = ["class_id IS NULL"]
        params = []
        if department:
            conditions.append("department = %s")
            params.append(department)
        if semester:
            conditions.append("semester = %s")
            params.append(semester)

        where = "WHERE " + " AND ".join(conditions)
        cur.execute(f"""
            SELECT student_id, name, department, semester
            FROM students
            {where}
            ORDER BY name
        """, params)
        students = cur.fetchall()
        cur.close()
        return jsonify({"students": students})
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 500
    finally:
        if conn:
            conn.close()


# ── Get unassigned faculty (for the assign-faculty modal) ─────────────────────
@class_bp.route("/api/admin/faculties/unassigned", methods=["GET"])
def get_unassigned_faculties():
    is_admin, msg, code = check_admin()
    if not is_admin:
        return jsonify({"message": msg}), code

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT id, name, email, department, designation
            FROM faculties
            WHERE class_id IS NULL
            ORDER BY name
        """)
        faculties = cur.fetchall()
        cur.close()
        return jsonify({"faculties": faculties})
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 500
    finally:
        if conn:
            conn.close()
