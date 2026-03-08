from flask import Blueprint, jsonify, request, session
from db_connect import get_connection
import mysql.connector
import csv
import io
import string
import secrets
import bcrypt
import os

admin_bp = Blueprint("admin", __name__)

def check_admin():
    """Helper to check if current session is an admin."""
    if not session.get("user_id"):
        return False, "Unauthorized", 401
    if session.get("role") != "ADMIN":
        return False, "Forbidden. Admin access required.", 403
    return True, None, None

def generate_random_password(length=8):
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def hash_password(password):
    rounds = int(os.environ.get("BCRYPT_ROUNDS", 12))
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds)).decode("utf-8")

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

@admin_bp.route("/api/admin/faculties/batch", methods=["POST"])
def batch_upload_faculties():
    is_admin, msg, code = check_admin()
    if not is_admin: return jsonify({"error": msg}), code

    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    conn = get_connection()
    try:
        stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
        csv_input = csv.DictReader(stream)
        
        cur = conn.cursor()
        credentials_list = []
        
        for row in csv_input:
            email = row.get("email", "").strip()
            name = row.get("name", "").strip()
            dept = row.get("department", "").strip()
            designation = row.get("designation", "").strip()
            
            if not email or not name:
                continue

            # Check existing
            cur.execute("SELECT id FROM users WHERE email=%s", (email,))
            if cur.fetchone():
                continue # Skip existing users
                
            # Create User
            temp_pwd = generate_random_password()
            hashed_pwd = hash_password(temp_pwd)
            cur.execute("INSERT INTO users (email, password_hash, role, must_change_password) VALUES (%s, %s, 'FACULTY', TRUE)",
                        (email, hashed_pwd))
            
            cur.execute("""
                INSERT INTO faculties (name, email, department, designation)
                VALUES (%s, %s, %s, %s)
            """, (name, email, dept, designation))
            
            credentials_list.append({"email": email, "password": temp_pwd})

        conn.commit()
        return jsonify({"message": "Batch processed successfully", "credentials": credentials_list})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@admin_bp.route("/api/admin/students", methods=["GET"])
def get_students():
    is_admin, msg, code = check_admin()
    if not is_admin: return jsonify({"error": msg}), code

    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT s.student_id, s.name, s.department, s.semester, s.sgpa, s.backlogs, u.email
            FROM students s
            JOIN users u ON s.user_id = u.id
            ORDER BY s.created_at DESC
        """)
        students = cur.fetchall()
        return jsonify({"students": students})
    finally:
        conn.close()

@admin_bp.route("/api/admin/students/batch", methods=["POST"])
def batch_upload_students():
    is_admin, msg, code = check_admin()
    if not is_admin: return jsonify({"error": msg}), code

    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    conn = get_connection()
    try:
        stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
        csv_input = csv.DictReader(stream)
        
        cur = conn.cursor()
        credentials_list = []
        
        import random
        for row in csv_input:
            email = row.get("email", "").strip()
            name = row.get("name", "").strip()
            dept = row.get("department", "").strip()
            sem = row.get("semester", "").strip()
            sgpa = float(row.get("sgpa", 0)) if row.get("sgpa") else 0.0
            backlogs = int(row.get("backlogs", 0)) if row.get("backlogs") else 0
            
            if not email or not name:
                continue

            # Check existing
            cur.execute("SELECT id FROM users WHERE email=%s", (email,))
            if cur.fetchone():
                continue # Skip existing users
                
            # Create User
            temp_pwd = generate_random_password()
            hashed_pwd = hash_password(temp_pwd)
            cur.execute("INSERT INTO users (email, password_hash, role, must_change_password) VALUES (%s, %s, 'STUDENT', TRUE)",
                        (email, hashed_pwd))
            user_id = cur.lastrowid
            
            # Risk calc
            risk_score = 0
            if sgpa < 6.5: risk_score += 30
            if backlogs > 0: risk_score += 30
            risk_level = "High" if risk_score >= 60 else ("Medium" if risk_score >= 30 else "Low")
            
            # Generate student ID loosely
            s_id = f"{dept}{sem}{random.randint(1000,9999)}"
            
            cur.execute("""
                INSERT INTO students (student_id, user_id, name, department, semester, sgpa, backlogs, risk_score, risk_level)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (s_id, user_id, name, dept, sem, sgpa, backlogs, risk_score, risk_level))
            
            credentials_list.append({"email": email, "password": temp_pwd, "student_id": s_id})
            
            # Assign subjects
            cur.execute("SELECT id FROM subjects WHERE department=%s AND semester=%s", (dept, sem))
            subjects = cur.fetchall()
            for sub in subjects:
                sub_id = sub[0]
                cur.execute("""
                    INSERT INTO student_academic_records (student_id, subject_id, attendance_percentage, internal_marks, assignment_score)
                    VALUES (%s, %s, 100, 0, 0)
                """, (s_id, sub_id))

        conn.commit()
        return jsonify({"message": "Batch processed successfully", "credentials": credentials_list})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@admin_bp.route("/api/admin/students/<string:student_id>/reset-password", methods=["POST"])
def reset_student_password(student_id):
    is_admin, msg, code = check_admin()
    if not is_admin: return jsonify({"error": msg}), code
    
    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT user_id FROM students WHERE student_id=%s", (student_id,))
        student = cur.fetchone()
        if not student:
            return jsonify({"error": "Student not found"}), 404
            
        new_pwd = generate_random_password()
        hashed = hash_password(new_pwd)
        
        cur.execute("UPDATE users SET password_hash=%s, must_change_password=TRUE WHERE id=%s", (hashed, student['user_id']))
        conn.commit()
        
        return jsonify({"message": "Password reset", "new_password": new_pwd})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@admin_bp.route("/api/admin/students/single", methods=["POST"])
def add_single_student():
    is_admin, msg, code = check_admin()
    if not is_admin: return jsonify({"error": msg}), code

    data = request.json
    email = data.get("email", "").strip()
    name = data.get("name", "").strip()
    dept = data.get("department", "").strip()
    sem = data.get("semester", "").strip()
    sgpa = float(data.get("sgpa", 0)) if data.get("sgpa") else 0.0
    backlogs = int(data.get("backlogs", 0)) if data.get("backlogs") else 0

    if not email or not name or not dept or not sem:
        return jsonify({"error": "Name, email, department, and semester are required"}), 400

    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        # Check existing
        cur.execute("SELECT id FROM users WHERE email=%s", (email,))
        if cur.fetchone():
            return jsonify({"error": "User with this email already exists"}), 409

        # Create User
        temp_pwd = generate_random_password()
        hashed_pwd = hash_password(temp_pwd)
        cur.execute("INSERT INTO users (email, password_hash, role, must_change_password) VALUES (%s, %s, 'STUDENT', TRUE)",
                    (email, hashed_pwd))
        user_id = cur.lastrowid
        
        # Risk calc
        risk_score = 0
        if sgpa < 6.5: risk_score += 30
        if backlogs > 0: risk_score += 30
        risk_level = "High" if risk_score >= 60 else ("Medium" if risk_score >= 30 else "Low")
        
        # Generate student ID loosely
        import random
        s_id = f"{dept}{sem}{random.randint(1000,9999)}"
        
        cur.execute("""
            INSERT INTO students (student_id, user_id, name, department, semester, sgpa, backlogs, risk_score, risk_level)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (s_id, user_id, name, dept, sem, sgpa, backlogs, risk_score, risk_level))
        
        # Assign subjects
        cur.execute("SELECT id FROM subjects WHERE department=%s AND semester=%s", (dept, sem))
        subjects = cur.fetchall()
        for sub in subjects:
            sub_id = sub['id']
            cur.execute("""
                INSERT INTO student_academic_records (student_id, subject_id, attendance_percentage, internal_marks, assignment_score)
                VALUES (%s, %s, 100, 0, 0)
            """, (s_id, sub_id))

        conn.commit()
        return jsonify({"message": "Student created successfully", "credentials": {"email": email, "password": temp_pwd}})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# --- ADMIN MANAGEMENT ENDPOINTS ---

@admin_bp.route("/api/admin/admins", methods=["GET"])
def get_admins():
    is_admin, msg, code = check_admin()
    if not is_admin: return jsonify({"error": msg}), code

    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(
            "SELECT id, email, role, provider, created_at, status, is_default FROM users WHERE role = 'ADMIN' ORDER BY created_at DESC"
        )
        admins = cur.fetchall()
        return jsonify({"admins": admins, "total": len(admins)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@admin_bp.route("/api/admin/admins/single", methods=["POST"])
def add_single_admin():
    is_admin, msg, code = check_admin()
    if not is_admin: return jsonify({"error": msg}), code

    data = request.json
    email = data.get("email", "").strip()

    if not email:
        return jsonify({"error": "Email is required"}), 400

    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id FROM users WHERE email=%s", (email,))
        if cur.fetchone():
            return jsonify({"error": "User with this email already exists"}), 409

        temp_pwd = generate_random_password()
        hashed_pwd = hash_password(temp_pwd)
        cur.execute(
            "INSERT INTO users (email, password_hash, role, must_change_password) VALUES (%s, %s, 'ADMIN', TRUE)",
            (email, hashed_pwd)
        )
        conn.commit()
        return jsonify({"message": "Admin created successfully", "credentials": {"email": email, "password": temp_pwd}})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@admin_bp.route("/api/admin/admins/<int:admin_id>/retire", methods=["PUT"])
def toggle_admin_retire(admin_id):
    is_admin, msg, code = check_admin()
    if not is_admin: return jsonify({"error": msg}), code

    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        # Cannot retire if default
        cur.execute("SELECT status, is_default FROM users WHERE id=%s AND role='ADMIN'", (admin_id,))
        admin_user = cur.fetchone()
        
        if not admin_user:
            return jsonify({"error": "Admin not found"}), 404
        if admin_user['is_default']:
            return jsonify({"error": "Cannot retire the default admin account"}), 400
            
        new_status = 'RETIRED' if admin_user['status'] == 'ACTIVE' else 'ACTIVE'
        cur.execute("UPDATE users SET status=%s WHERE id=%s", (new_status, admin_id))
        conn.commit()
        
        return jsonify({"message": f"Admin status updated to {new_status}"})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@admin_bp.route("/api/admin/admins/<int:admin_id>/default", methods=["PUT"])
def make_admin_default(admin_id):
    is_admin, msg, code = check_admin()
    if not is_admin: return jsonify({"error": msg}), code
    
    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id, status FROM users WHERE id=%s AND role='ADMIN'", (admin_id,))
        admin_user = cur.fetchone()
        
        if not admin_user:
            return jsonify({"error": "Admin not found"}), 404
        if admin_user['status'] == 'RETIRED':
            return jsonify({"error": "Cannot make a retired admin the default"}), 400
            
        # Reset all others
        cur.execute("UPDATE users SET is_default=FALSE WHERE role='ADMIN'")
        # Set this one
        cur.execute("UPDATE users SET is_default=TRUE WHERE id=%s", (admin_id,))
        conn.commit()
        
        return jsonify({"message": "Admin set as default"})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

