from flask import Blueprint, jsonify, request, session
from db_connect import get_connection
import mysql.connector
import csv
import io
import string
import secrets
import bcrypt
import os
import random

def get_val(row_dict, *keys):
    """Robust helper to find column values (BOM-safe, case-insensitive, trimmed)"""
    for k, v in row_dict.items():
        if k is None: continue
        ck = str(k).lower().strip().replace('\ufeff', '')
        if ck in keys:
            return str(v).strip() if v is not None else ""
        # Support for common cut-offs like "Departmen" or "Designati"
        for target in keys:
            if len(target) > 5 and target[:7] in ck:
                return str(v).strip() if v is not None else ""
    return ""

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
        # Using utf-8-sig to automatically handle BOM if present
        content = file.stream.read().decode("utf-8-sig", errors="ignore")
        if not content.strip():
            return jsonify({"error": "The uploaded file is empty."}), 400

        # Delimiter detection: Excel in some regions uses ';' instead of ','
        sep = ','
        first_line = content.split('\n')[0]
        if ';' in first_line and (',' not in first_line or first_line.count(';') > first_line.count(',')):
            sep = ';'
        elif '\t' in first_line:
            sep = '\t'

        stream = io.StringIO(content, newline=None)
        csv_input = csv.DictReader(stream, delimiter=sep)
        rows = list(csv_input)

        print(f"\n--- [DEBUG] Batch Faculty Upload Started ---")
        print(f"Delimiter: '{sep}'")
        print(f"Total Rows: {len(rows)}")
        if rows:
            headers = [str(k).strip() for k in rows[0].keys() if k is not None]
            print(f"Detected Headers: {headers}")

        cur = conn.cursor()
        credentials_list = []
        processed_count = 0
        
        for i, row in enumerate(rows):
            # Log raw row for debugging if needed (mask password/hash)
            # print(f"Row {i+2} raw keys: {list(row.keys())}")

            email = get_val(row, "email")
            name = get_val(row, "name", "full name")
            dept = get_val(row, "department", "dept")
            designation = get_val(row, "designation", "role")
            
            if not email or not name:
                print(f"Row {i+2}: SKIPPED (email='{email}', name='{name}')")
                continue

            print(f"Row {i+2}: Processing {email} ({name})")

            # Check existing
            cur.execute("SELECT id FROM users WHERE email=%s", (email,))
            if cur.fetchone():
                print(f"  User already exists, skipping.")
                continue 
                
            # Create User (Consistent with single add_faculty)
            temp_pwd = generate_random_password()
            hashed_pwd = hash_password(temp_pwd)
            cur.execute(
                "INSERT INTO users (email, password_hash, role, provider, must_change_password) VALUES (%s, %s, 'FACULTY', 'password', TRUE)",
                (email, hashed_pwd)
            )
            
            cur.execute("""
                INSERT INTO faculties (name, email, department, designation)
                VALUES (%s, %s, %s, %s)
            """, (name, email, dept, designation))
            
            credentials_list.append({"email": email, "password": temp_pwd})
            processed_count += 1

        conn.commit()
        print(f"--- [DEBUG] Batch Faculty Upload Complete. Processed: {processed_count} ---")
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
        # for dept, sem, row_num in unique_combinations:
        #     cur.execute("SELECT COUNT(*) as count FROM subjects WHERE department=%s AND semester=%s", (dept, sem))
        #     count = cur.fetchone()['count']
        #     if count == 0:
        #         return jsonify({"error": f"Row {row_num} specifies Department '{dept}' and Semester '{sem}', but no courses exist for this combination. Upload blocked."}), 400
        # Robust global get_val is used below

        print(f"\n--- [DEBUG] Batch Student Upload Started ---")
        print(f"Total Rows: {len(rows)}")
        if rows:
            headers = [str(k).strip() for k in rows[0].keys() if k is not None]
            print(f"Detected Headers: {headers}")

        cur = conn.cursor()
        credentials_list = []
        processed_count = 0
        skipped_count = 0
        
        for i, row in enumerate(rows):
            email = get_val(row, "email")
            name = get_val(row, "name", "full name")
            dept = get_val(row, "department", "dept")
            sem = get_val(row, "semester", "sem")
            sgpa_str = get_val(row, "sgpa")
            backlogs_str = get_val(row, "backlogs")
            
            try:
                sgpa = float(sgpa_str) if sgpa_str else 0.0
            except:
                sgpa = 0.0
            try:
                backlogs = int(backlogs_str) if backlogs_str else 0
            except:
                backlogs = 0
            
            if not email or not name:
                print(f"Row {i+2}: SKIPPED (email='{email}', name='{name}')")
                skipped_count += 1
                continue

            print(f"Row {i+2}: Processing {email} ({name}) - {dept}, Sem {sem}")

            # Check existing user
            cur.execute("SELECT id, role FROM users WHERE email=%s", (email,))
            existing_user = cur.fetchone()
            
            user_id = None
            s_id = None
            is_new = False
            
            if existing_user:
                user_id = existing_user[0]
                print(f"  Existing user found (ID: {user_id})")
                cur.execute("SELECT student_id FROM students WHERE user_id=%s", (user_id,))
                student_row = cur.fetchone()
                if student_row:
                    s_id = student_row[0]
                    print(f"  Existing student record: {s_id}")
                cur.execute("UPDATE users SET role='STUDENT' WHERE id=%s", (user_id,))
            else:
                print(f"  Creating new user...")
                temp_pwd = generate_random_password()
                hashed_pwd = hash_password(temp_pwd)
                cur.execute("INSERT INTO users (email, password_hash, role, must_change_password) VALUES (%s, %s, 'STUDENT', TRUE)",
                            (email, hashed_pwd))
                user_id = cur.lastrowid
                is_new = True
                credentials_list.append({"email": email, "password": temp_pwd, "student_id": ""}) 

            # Risk calculation
            risk_score = 0
            if sgpa < 6.5: risk_score += 30
            if backlogs > 0: risk_score += 30
            risk_level = "High" if risk_score >= 60 else ("Medium" if risk_score >= 30 else "Low")
            
            if not s_id:
                # New student record
                prefix = email.split('@')[0].upper()[:8]
                s_id = f"{prefix}{random.randint(100, 999)}"
                print(f"  Inserting student: {s_id}")
                cur.execute("""
                    INSERT INTO students (student_id, user_id, name, department, semester, sgpa, backlogs, risk_score, risk_level)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (s_id, user_id, name, dept, sem, sgpa, backlogs, risk_score, risk_level))
            else:
                # Existing student record update
                print(f"  Updating student: {s_id}")
                cur.execute("""
                    UPDATE students 
                    SET name=%s, department=%s, semester=%s, sgpa=%s, backlogs=%s, risk_score=%s, risk_level=%s
                    WHERE student_id=%s
                """, (name, dept, sem, sgpa, backlogs, risk_score, risk_level, s_id))
            
            if is_new:
                for cred in credentials_list:
                    if cred["email"] == email:
                        cred["student_id"] = s_id
                        break
            
            # Auto-assign courses for this dept/sem
            cur.execute("SELECT id FROM subjects WHERE department=%s AND semester=%s", (dept, sem))
            subjects = cur.fetchall()
            print(f"  Assigned {len(subjects)} subjects for {dept} semester {sem}")
            for sub in subjects:
                cur.execute("""
                    INSERT IGNORE INTO student_academic_records (student_id, subject_id, attendance_percentage, internal_marks, assignment_score)
                    VALUES (%s, %s, 100, 0, 0)
                """, (s_id, sub[0]))
            
            processed_count += 1

        conn.commit()
        print(f"--- [DEBUG] Batch Upload Complete. Processed: {processed_count}, Skipped: {skipped_count} ---")
        return jsonify({
            "message": f"Successfully processed {processed_count} student records ({len(credentials_list)} new records created).", 
            "credentials": credentials_list
        })
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
        user_id = None
        s_id = None
        is_update = False
        temp_pwd = "N/A"
        
        # Check existing user
        cur.execute("SELECT id, role FROM users WHERE email=%s", (email,))
        existing_user = cur.fetchone()
        
        if existing_user:
            user_id = existing_user['id']
            # Check if student record already exists
            cur.execute("SELECT student_id FROM students WHERE user_id=%s", (user_id,))
            student_row = cur.fetchone()
            if student_row:
                s_id = student_row['student_id']
                is_update = True
                # Update existing student
                cur.execute("""
                    UPDATE students 
                    SET name=%s, department=%s, semester=%s, sgpa=%s, backlogs=%s, risk_score=%s, risk_level=%s
                    WHERE student_id=%s
                """, (name, dept, sem, sgpa, backlogs, 0, "Low", s_id)) # Risk recalculated below
            else:
                cur.execute("UPDATE users SET role='STUDENT' WHERE id=%s", (user_id,))
        else:
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
        
        if not s_id:
            # Generate student ID loosely
            s_id = f"{dept}{sem}{random.randint(1000,9999)}"
            cur.execute("""
                INSERT INTO students (student_id, user_id, name, department, semester, sgpa, backlogs, risk_score, risk_level)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (s_id, user_id, name, dept, sem, sgpa, backlogs, risk_score, risk_level))
        else:
            # Update risk for existing student
            cur.execute("UPDATE students SET risk_score=%s, risk_level=%s WHERE student_id=%s", (risk_score, risk_level, s_id))
        
        # Assign subjects manually from provided list (only if provided)
        if subject_ids:
            for sub_id in subject_ids:
                cur.execute("""
                    INSERT IGNORE INTO student_academic_records (student_id, subject_id, attendance_percentage, internal_marks, assignment_score)
                    VALUES (%s, %s, 100, 0, 0)
                """, (s_id, sub_id))

        conn.commit()
        msg = "Student updated successfully" if is_update else "Student created successfully"
        return jsonify({"message": msg, "credentials": {"email": email, "password": temp_pwd if not existing_user else "Existing User"}})
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
        
        # Update subjects: only if explicit list is provided
        if subject_ids:
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
        # Query from centralized departments table and left join counts
        query = """
        SELECT dep.name as department,
               COALESCE(s_count.count, 0) as student_count,
               COALESCE(f_count.count, 0) as faculty_count,
               COALESCE(sub_count.count, 0) as course_count
        FROM departments dep
        LEFT JOIN (SELECT department, COUNT(*) as count FROM students GROUP BY department) s_count ON dep.name = s_count.department
        LEFT JOIN (SELECT department, COUNT(*) as count FROM faculties GROUP BY department) f_count ON dep.name = f_count.department
        LEFT JOIN (SELECT department, COUNT(*) as count FROM subjects GROUP BY department) sub_count ON dep.name = sub_count.department
        ORDER BY dep.name
        """
        cur.execute(query)
        departments = cur.fetchall()
        return jsonify({"departments": departments})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@admin_bp.route("/api/admin/departments", methods=["POST"])
def add_department():
    is_admin, msg, code = check_admin()
    if not is_admin: return jsonify({"error": msg}), code
    
    data = request.json
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": "Department name is required"}), 400
        
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("INSERT INTO departments (name) VALUES (%s)", (name,))
        conn.commit()
        return jsonify({"message": f"Department '{name}' added successfully"})
    except mysql.connector.Error as err:
        if err.errno == 1062:
            return jsonify({"error": "Department already exists"}), 409
        return jsonify({"error": str(err)}), 500
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
        # Update centralized table first
        cur.execute("UPDATE departments SET name=%s WHERE name=%s", (new_name, old_name))
        
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
