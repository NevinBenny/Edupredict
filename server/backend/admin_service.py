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

@admin_bp.route("/api/admin/faculties/<int:faculty_id>", methods=["PUT"])
def update_faculty(faculty_id):
    is_admin, msg, code = check_admin()
    if not is_admin:
        return jsonify({"message": msg}), code
    
    data = request.json
    name = data.get("name")
    department = data.get("department")
    designation = data.get("designation")
    
    if not name:
        return jsonify({"error": "Name is required"}), 400
        
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        cur.execute("""
            UPDATE faculties 
            SET name = %s, department = %s, designation = %s 
            WHERE id = %s
        """, (name, department, designation, faculty_id))
        
        conn.commit()
        cur.close()
        return jsonify({"message": "Faculty updated successfully"})
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 500
    finally:
        if conn:
            conn.close()

@admin_bp.route("/api/admin/faculties/<int:faculty_id>/reset-password", methods=["POST"])
def reset_faculty_password(faculty_id):
    is_admin, msg, code = check_admin()
    if not is_admin:
        return jsonify({"error": msg}), code

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT email FROM faculties WHERE id = %s", (faculty_id,))
        faculty = cur.fetchone()
        if not faculty:
            return jsonify({"error": "Faculty not found"}), 404

        cur.execute("SELECT id FROM users WHERE email = %s", (faculty["email"],))
        user = cur.fetchone()
        if not user:
            return jsonify({"error": "No user account found for this faculty"}), 404

        new_pwd = generate_random_password()
        hashed = hash_password(new_pwd)
        cur.execute("UPDATE users SET password_hash=%s, must_change_password=TRUE WHERE id=%s", (hashed, user["id"]))
        conn.commit()
        return jsonify({"message": "Password reset", "new_password": new_pwd, "email": faculty["email"]})
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
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
        rows = list(csv_input)
        
        cur = conn.cursor(dictionary=True)
        
        # Pre-Validation Pass
        unique_combinations = set()
        for i, row in enumerate(rows, start=2): # Start at 2 to account for header
            dept = row.get("department", "").strip()
            sem = row.get("semester", "").strip()
            if dept and sem:
                unique_combinations.add((dept, sem, i))
                
        # Validate that each dept/sem combination has at least one subject
        for dept, sem, row_num in unique_combinations:
            cur.execute("SELECT COUNT(*) as count FROM subjects WHERE department=%s AND semester=%s", (dept, sem))
            count = cur.fetchone()['count']
            if count == 0:
                return jsonify({"error": f"Row {row_num} specifies Department '{dept}' and Semester '{sem}', but no courses exist for this combination. Upload blocked."}), 400

        cur = conn.cursor()
        credentials_list = []
        
        import random
        for row in rows:
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
    subject_ids = data.get("subject_ids", [])

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
        
        # Assign subjects manually from provided list
        for sub_id in subject_ids:
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

@admin_bp.route("/api/admin/students/<string:student_id>", methods=["PUT"])
def update_student(student_id):
    is_admin, msg, code = check_admin()
    if not is_admin: return jsonify({"error": msg}), code

    data = request.json
    name = data.get("name", "").strip()
    dept = data.get("department", "").strip()
    sem = data.get("semester", "").strip()
    sgpa = float(data.get("sgpa", 0)) if data.get("sgpa") else 0.0
    backlogs = int(data.get("backlogs", 0)) if data.get("backlogs") else 0
    subject_ids = data.get("subject_ids", [])

    if not name or not dept or not sem:
        return jsonify({"error": "Name, department, and semester are required"}), 400

    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        
        # Risk calc
        risk_score = 0
        if sgpa < 6.5: risk_score += 30
        if backlogs > 0: risk_score += 30
        risk_level = "High" if risk_score >= 60 else ("Medium" if risk_score >= 30 else "Low")
        
        cur.execute("""
            UPDATE students 
            SET name=%s, department=%s, semester=%s, sgpa=%s, backlogs=%s, risk_score=%s, risk_level=%s
            WHERE student_id=%s
        """, (name, dept, sem, sgpa, backlogs, risk_score, risk_level, student_id))
        
        # Update subjects: remove old, add new
        cur.execute("DELETE FROM student_academic_records WHERE student_id=%s", (student_id,))
        for sub_id in subject_ids:
            cur.execute("""
                INSERT INTO student_academic_records (student_id, subject_id, attendance_percentage, internal_marks, assignment_score)
                VALUES (%s, %s, 100, 0, 0)
            """, (student_id, sub_id))

        conn.commit()
        return jsonify({"message": "Student updated successfully"})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@admin_bp.route("/api/admin/students/<string:student_id>", methods=["DELETE"])
def delete_student(student_id):
    is_admin, msg, code = check_admin()
    if not is_admin: return jsonify({"error": msg}), code

    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        # Find user_id first to delete from users table
        cur.execute("SELECT user_id FROM students WHERE student_id=%s", (student_id,))
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "Student not found"}), 404
        
        user_id = row['user_id']
        # Deleting from users will cascade if FK is set, or we do it manually.
        # Assuming FK cascade on students.user_id -> users.id is there? 
        # Actually it's safer to delete both.
        cur.execute("DELETE FROM student_academic_records WHERE student_id=%s", (student_id,))
        cur.execute("DELETE FROM students WHERE student_id=%s", (student_id,))
        cur.execute("DELETE FROM users WHERE id=%s", (user_id,))
        
        conn.commit()
        return jsonify({"message": "Student deleted successfully"})
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

# --- DEPARTMENTS MANAGEMENT ENDPOINTS ---

@admin_bp.route("/api/admin/departments", methods=["GET"])
def get_departments():
    is_admin, msg, code = check_admin()
    if not is_admin: return jsonify({"error": msg}), code

    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        # Aggregate unique departments from students, faculties, subjects
        query = """
        SELECT d.department,
               MAX(d.student_count) as student_count,
               MAX(d.faculty_count) as faculty_count,
               MAX(d.course_count) as course_count
        FROM (
            SELECT department, COUNT(id) as student_count, 0 as faculty_count, 0 as course_count FROM students GROUP BY department
            UNION ALL
            SELECT department, 0, COUNT(id), 0 FROM faculties GROUP BY department
            UNION ALL
            SELECT department, 0, 0, COUNT(id) FROM subjects GROUP BY department
        ) d
        WHERE d.department IS NOT NULL AND d.department != ''
        GROUP BY d.department
        ORDER BY d.department
        """
        cur.execute(query)
        departments = cur.fetchall()
        return jsonify({"departments": departments})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@admin_bp.route("/api/admin/departments/<string:old_name>", methods=["PUT"])
def rename_department(old_name):
    is_admin, msg, code = check_admin()
    if not is_admin: return jsonify({"error": msg}), code
    
    data = request.json
    new_name = data.get("new_name", "").strip()
    if not new_name:
        return jsonify({"error": "New name is required"}), 400

    conn = get_connection()
    try:
        cur = conn.cursor()
        # Update references everywhere
        cur.execute("UPDATE students SET department=%s WHERE department=%s", (new_name, old_name))
        cur.execute("UPDATE faculties SET department=%s WHERE department=%s", (new_name, old_name))
        cur.execute("UPDATE subjects SET department=%s WHERE department=%s", (new_name, old_name))
        conn.commit()
        return jsonify({"message": f"Department renamed to {new_name}"})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


# --- COURSES MANAGEMENT ENDPOINTS ---

@admin_bp.route("/api/admin/courses", methods=["GET"])
def get_courses():
    is_admin, msg, code = check_admin()
    if not is_admin: return jsonify({"error": msg}), code
    
    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT s.*, 
                   GROUP_CONCAT(fs.faculty_id) as faculty_ids,
                   GROUP_CONCAT(f.name SEPARATOR ', ') as faculty_names
            FROM subjects s
            LEFT JOIN faculty_subjects fs ON s.id = fs.subject_id
            LEFT JOIN faculties f ON fs.faculty_id = f.id
            GROUP BY s.id
            ORDER BY s.department, s.semester, s.code
        """)
        courses = cur.fetchall()
        for c in courses:
            if c['faculty_ids']:
                # Handle potential duplicate IDs if JOIN returns multiple rows unexpectedly, though GROUP_CONCAT handles simple cases
                c['faculty_ids'] = list(set([int(i) for i in str(c['faculty_ids']).split(',')]))
            else:
                c['faculty_ids'] = []
                
            if not c['faculty_names']:
                c['faculty_names'] = "Unassigned"
                
        return jsonify({"courses": courses})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@admin_bp.route("/api/admin/courses", methods=["POST"])
def add_course():
    is_admin, msg, code = check_admin()
    if not is_admin: return jsonify({"error": msg}), code
    
    data = request.json
    code_val = data.get("code", "").strip()
    name = data.get("name", "").strip()
    dept = data.get("department", "").strip()
    sem = data.get("semester", "")
    faculty_ids = data.get("faculty_ids", [])
    
    if not code_val or not name or not dept or not str(sem).strip():
        return jsonify({"error": "All fields (code, name, department, semester) are required"}), 400
        
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("INSERT INTO subjects (code, name, department, semester) VALUES (%s, %s, %s, %s)", 
                   (code_val, name, dept, sem))
        course_id = cur.lastrowid
        
        for f_id in faculty_ids:
            cur.execute("INSERT INTO faculty_subjects (faculty_id, subject_id) VALUES (%s, %s)", (f_id, course_id))
            
        conn.commit()
        return jsonify({"message": "Course created successfully"})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@admin_bp.route("/api/admin/courses/<int:course_id>", methods=["PUT"])
def update_course(course_id):
    is_admin, msg, code = check_admin()
    if not is_admin: return jsonify({"error": msg}), code
    
    data = request.json
    code_val = data.get("code", "").strip()
    name = data.get("name", "").strip()
    dept = data.get("department", "").strip()
    sem = data.get("semester", "")
    faculty_ids = data.get("faculty_ids", [])
    
    if not code_val or not name or not dept or not str(sem).strip():
        return jsonify({"error": "All fields are required"}), 400
        
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE subjects 
            SET code=%s, name=%s, department=%s, semester=%s 
            WHERE id=%s
        """, (code_val, name, dept, sem, course_id))
        
        cur.execute("DELETE FROM faculty_subjects WHERE subject_id=%s", (course_id,))
        for f_id in faculty_ids:
            cur.execute("INSERT INTO faculty_subjects (faculty_id, subject_id) VALUES (%s, %s)", (f_id, course_id))
            
        conn.commit()
        return jsonify({"message": "Course updated successfully"})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@admin_bp.route("/api/admin/courses/<int:course_id>", methods=["DELETE"])
def delete_course(course_id):
    is_admin, msg, code = check_admin()
    if not is_admin: return jsonify({"error": msg}), code
    
    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        
        # 1. Check for linked faculty
        cur.execute("SELECT COUNT(*) as count FROM faculty_subjects WHERE subject_id=%s", (course_id,))
        faculty_count = cur.fetchone()['count']
        if faculty_count > 0:
            return jsonify({"error": f"Cannot delete course: {faculty_count} faculty member(s) are currently assigned to this subject."}), 400
            
        # 2. Check for linked student records
        cur.execute("SELECT COUNT(*) as count FROM student_academic_records WHERE subject_id=%s", (course_id,))
        student_count = cur.fetchone()['count']
        if student_count > 0:
            return jsonify({"error": f"Cannot delete course: {student_count} student grade record(s) are currently tied to this subject."}), 400

        cur.execute("DELETE FROM subjects WHERE id=%s", (course_id,))
        conn.commit()
        return jsonify({"message": "Course deleted successfully"})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()
