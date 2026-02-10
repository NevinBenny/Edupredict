from flask import Blueprint, jsonify, request, session
from db_connect import get_connection
import mysql.connector

from flask import Blueprint, jsonify, request, session
from db_connect import get_connection
import mysql.connector

admin_bp = Blueprint("admin", __name__)

def check_admin():
    """Helper to check if current session is an admin."""
    if not session.get("user_id"):
        return False, "Unauthorized", 401
    if session.get("role") != "ADMIN":
        return False, "Forbidden. Admin access required.", 403
    return True, None, None

@admin_bp.route("/api/admin/stats", methods=["GET"])
def get_dashboard_stats():
    is_admin, msg, code = check_admin()
    if not is_admin:
        return jsonify({"message": msg}), code
    
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        
        # Total Students
        cur.execute("SELECT COUNT(*) as total FROM students")
        total_students = cur.fetchone()['total']
        
        # High Risk Students
        cur.execute("SELECT COUNT(*) as high_risk FROM students WHERE risk_level = 'High'")
        high_risk_students = cur.fetchone()['high_risk']
        
        # Total Faculty
        cur.execute("SELECT COUNT(*) as total FROM faculties")
        total_faculty = cur.fetchone()['total']
        
        cur.close()
        
        return jsonify({
            "totalUsers": total_students, # Reuse prop name or change frontend? Let's use generic names or map them
            "totalStudents": total_students,
            "highRiskStudents": high_risk_students,
            "totalFaculty": total_faculty
        })
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 500
    finally:
        if conn:
            conn.close()

@admin_bp.route("/api/admin/faculties", methods=["GET"])
def get_faculties():
    is_admin, msg, code = check_admin()
    if not is_admin:
        return jsonify({"message": msg}), code
    
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT * FROM faculties ORDER BY created_at DESC")
        faculties = cur.fetchall()
        cur.close()
        return jsonify({"faculties": faculties})
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 500
    finally:
        if conn:
            conn.close()

@admin_bp.route("/api/admin/faculties", methods=["POST"])
def add_faculty():
    is_admin, msg, code = check_admin()
    if not is_admin:
        return jsonify({"message": msg}), code
    
    data = request.json
    name = data.get("name")
    email = data.get("email")
    department = data.get("department")
    designation = data.get("designation")
    password = data.get("password")
    
    if not name or not email or not password:
        return jsonify({"error": "Name, email, and password are required"}), 400
        
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        # 1. Check if user already exists
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            return jsonify({"error": "User with this email already exists"}), 409
            
        # 2. Hash Password
        import bcrypt
        import os
        rounds = int(os.environ.get("BCRYPT_ROUNDS", 12))
        hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds)).decode("utf-8")
        
        # 3. Create User Account (FACULTY role, must_change_password=True)
        cur.execute(
            "INSERT INTO users (email, password_hash, role, provider, must_change_password) VALUES (%s, %s, 'FACULTY', 'password', TRUE)",
            (email, hashed)
        )
        
        # 4. Add to Faculties Table
        cur.execute(
            "INSERT INTO faculties (name, email, department, designation) VALUES (%s, %s, %s, %s)",
            (name, email, department, designation)
        )
        
        conn.commit()
        cur.close()
        return jsonify({"message": "Faculty account created successfully"}), 201
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 500
    finally:
        if conn:
            conn.close()

@admin_bp.route("/api/admin/faculties/<int:faculty_id>", methods=["DELETE"])
def delete_faculty(faculty_id):
    is_admin, msg, code = check_admin()
    if not is_admin:
        return jsonify({"message": msg}), code
        
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM faculties WHERE id = %s", (faculty_id,))
        conn.commit()
        cur.close()
        return jsonify({"message": "Faculty deleted successfully"})
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 500
    finally:
        if conn:
            conn.close()
