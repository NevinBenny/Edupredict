from flask import Blueprint, jsonify, request, session
from db_connect import get_connection
import mysql.connector

subject_bp = Blueprint("subject", __name__)

def check_admin():
    if not session.get("user_id"):
        return False, "Unauthorized", 401
    if session.get("role") != "ADMIN":
        return False, "Forbidden. Admin access required.", 403
    return True, None, None

@subject_bp.route("/api/admin/subjects", methods=["GET"])
def get_subjects():
    is_admin, msg, code = check_admin()
    if not is_admin:
        return jsonify({"message": msg}), code
        
    department = request.args.get("department")
    semester = request.args.get("semester")
    
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        
        query = "SELECT * FROM subjects WHERE 1=1"
        params = []
        if department:
            query += " AND department = %s"
            params.append(department)
        if semester:
            query += " AND semester = %s"
            params.append(semester)
            
        query += " ORDER BY department, semester, name"
        
        cur.execute(query, tuple(params))
        subjects = cur.fetchall()
        
        # Hydrate with assigned faculties
        for sub in subjects:
            cur.execute("""
                SELECT f.id, f.name, f.email 
                FROM faculties f
                JOIN faculty_subjects fs ON f.id = fs.faculty_id
                WHERE fs.subject_id = %s
            """, (sub['id'],))
            sub['faculties'] = cur.fetchall()
            
        return jsonify({"subjects": subjects})
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 500
    finally:
        if conn: conn.close()

@subject_bp.route("/api/admin/subjects", methods=["POST"])
def create_subject():
    is_admin, msg, code = check_admin()
    if not is_admin:
        return jsonify({"message": msg}), code
        
    data = request.json
    code_str = data.get("code")
    name = data.get("name")
    dept = data.get("department")
    sem = data.get("semester")
    
    if not all([code_str, name, dept, sem]):
        return jsonify({"error": "Missing required fields"}), 400
        
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO subjects (code, name, department, semester)
            VALUES (%s, %s, %s, %s)
        """, (code_str.upper(), name, dept, sem))
        conn.commit()
        return jsonify({"message": "Subject created", "id": cur.lastrowid}), 201
    except mysql.connector.IntegrityError:
        return jsonify({"error": f"Subject with code {code_str} already exists"}), 409
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 500
    finally:
        if conn: conn.close()

@subject_bp.route("/api/admin/subjects/<int:subject_id>/assign", methods=["POST"])
def assign_faculty_to_subject(subject_id):
    is_admin, msg, code = check_admin()
    if not is_admin:
        return jsonify({"message": msg}), code
        
    faculty_id = request.json.get("faculty_id")
    if not faculty_id:
        return jsonify({"error": "faculty_id is required"}), 400
        
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        # Verify both exist
        cur.execute("SELECT id FROM subjects WHERE id=%s", (subject_id,))
        if not cur.fetchone(): return jsonify({"error": "Subject not found"}), 404
        
        cur.execute("SELECT id FROM faculties WHERE id=%s", (faculty_id,))
        if not cur.fetchone(): return jsonify({"error": "Faculty not found"}), 404
        
        cur.execute("INSERT IGNORE INTO faculty_subjects (faculty_id, subject_id) VALUES (%s, %s)", (faculty_id, subject_id))
        conn.commit()
        return jsonify({"message": "Faculty assigned to subject successfully"})
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 500
    finally:
        if conn: conn.close()
