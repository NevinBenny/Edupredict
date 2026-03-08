import csv
import io
import traceback
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

@admin_bp.route("/api/admin/students/batch-upload", methods=["POST"])
def batch_upload_students():
    is_admin, msg, code = check_admin()
    if not is_admin:
        return jsonify({"message": msg}), code

    if 'file' not in request.files:
        return jsonify({"message": "No file part in the request"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"message": "No selected file"}), 400

    if not file.filename.endswith('.csv'):
        return jsonify({"message": "Invalid file format. Please upload a CSV file."}), 400

    try:
        # Read and decode CSV
        stream = io.StringIO(file.stream.read().decode('utf-8'))
        csv_input = csv.DictReader(stream)
        
        # Expected headers
        required_headers = ['student_id', 'name', 'email', 'department', 'semester']
        actual_headers = csv_input.fieldnames
        
        if not all(header in actual_headers for header in required_headers):
            return jsonify({"message": f"CSV is missing required columns. Must include: {', '.join(required_headers)}"}), 400

        import bcrypt
        import os
        import secrets
        rounds = int(os.environ.get("BCRYPT_ROUNDS", 12))

        conn = get_connection()
        cur = conn.cursor()

        inserted_count = 0
        skipped_count = 0
        errors = []
        generated_credentials = []
        
        insert_query = """
            INSERT INTO students
                (student_id, name, department, semester,
                 attendance_percentage, internal_marks, assignment_score,
                 sgpa, backlogs, class_id, user_id)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """
        
        insert_user_query = """
            INSERT INTO users (email, password_hash, provider, role, must_change_password)
            VALUES (%s, %s, 'password', 'STUDENT', TRUE)
        """

        for row_index, row in enumerate(csv_input, start=2): # Start at 2 for 1-based indexing + header row
            try:
                # Extract and cast values safely
                raw_student_id = row.get('student_id', '').strip()
                student_id = raw_student_id.upper()
                name = row.get('name', '').strip()
                student_email = row.get('email', '').strip()
                dept = row.get('department', '').strip()
                sem = row.get('semester', '').strip() or None
                
                # Numeric fields (default to 0 if not provided for safe insertion)
                att = float(row.get('attendance_percentage', 0) or 0)
                internal = float(row.get('internal_marks', 0) or 0)
                assign = float(row.get('assignment_score', 0) or 0)
                sgpa = float(row.get('sgpa', 0) or 0)
                backlogs = int(row.get('backlogs', 0) or 0)
                class_id = row.get('class_id')
                class_id = int(class_id) if class_id and str(class_id).isdigit() else None
                
                if not student_id or not name or not student_email:
                    errors.append(f"Row {row_index}: Missing required student_id, name, or email.")
                    skipped_count += 1
                    continue

                try:
                    # 1. First, create the user account with a unique password
                    temp_password = secrets.token_urlsafe(6) # 8 character random string
                    temp_pwd_hash = bcrypt.hashpw(temp_password.encode("utf-8"), bcrypt.gensalt(rounds)).decode("utf-8")
                    
                    try:
                        cur.execute(insert_user_query, (student_email, temp_pwd_hash))
                        user_id = cur.lastrowid
                    except mysql.connector.IntegrityError:
                        # User account might already exist (e.g. from a previous partial upload)
                        # We can silently ignore and fetch the existing user_id
                        cur.execute("SELECT id FROM users WHERE email=%s", (student_email,))
                        user_id_row = cur.fetchone()
                        user_id = user_id_row[0] if user_id_row else None
                        
                    # 2. Insert the actual academic record
                    cur.execute(insert_query, (
                        student_id, name, dept, sem, att, internal, assign, sgpa, backlogs, class_id, user_id
                    ))
                    inserted_count += 1
                    
                    generated_credentials.append({
                        "name": name,
                        "email": student_email,
                        "password": temp_password
                    })
                except mysql.connector.IntegrityError:
                     # Duplicate student_id in `students` table
                     errors.append(f"Row {row_index}: Student ID {student_id} already exists.")
                     skipped_count += 1

            except ValueError as ve:
                errors.append(f"Row {row_index}: Invalid number format. ({ve})")
                skipped_count += 1
            except Exception as e:
                errors.append(f"Row {row_index}: Unexpected error. ({e})")
                skipped_count += 1

        conn.commit()
        cur.close()
        
        return jsonify({
            "message": "Batch processing complete.",
            "results": {
                "inserted": inserted_count,
                "skipped": skipped_count,
                "errors": errors[:10], # Return max 10 errors to keep payload small
                "credentials": generated_credentials
            }
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"message": f"Failed to process CSV: {str(e)}"}), 500
    finally:
        if conn:
            conn.close()

@admin_bp.route("/api/admin/students", methods=["GET"])
def get_all_students():
    is_admin, msg, code = check_admin()
    if not is_admin:
        return jsonify({"message": msg}), code
    
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT s.student_id, s.name, s.department, s.semester, s.risk_level, u.email, u.id as user_id, s.id as db_id
            FROM students s
            JOIN users u ON s.user_id = u.id
            ORDER BY s.student_id ASC
        """)
        students = cur.fetchall()
        return jsonify({"students": students})
        
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

@admin_bp.route("/api/admin/students/<student_db_id>/reset-password", methods=["POST"])
def reset_student_password(student_db_id):
    is_admin, msg, code = check_admin()
    if not is_admin:
        return jsonify({"message": msg}), code

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        
        # 1. Look up student and their user account
        cur.execute("SELECT user_id, name FROM students WHERE id = %s", (student_db_id,))
        student = cur.fetchone()
        
        if not student or not student['user_id']:
            return jsonify({"error": "Student account not found or not provisioned properly"}), 404
            
        user_id = student['user_id']
        
        # 2. Generate new unique password
        import secrets
        import bcrypt
        import os
        
        new_password = secrets.token_urlsafe(6)
        rounds = int(os.environ.get("BCRYPT_ROUNDS", 12))
        hashed = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt(rounds)).decode("utf-8")
        
        # 3. Update users table and force password change on next login
        cur.execute(
            "UPDATE users SET password_hash = %s, must_change_password = TRUE WHERE id = %s", 
            (hashed, user_id)
        )
        conn.commit()
        
        return jsonify({
            "message": "Password reset successfully", 
            "new_password": new_password
        })
        
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

