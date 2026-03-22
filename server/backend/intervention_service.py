import os
from flask import Blueprint, request, jsonify, send_from_directory, session
from werkzeug.utils import secure_filename
from db_connect import get_connection
import mysql.connector

intervention_bp = Blueprint('intervention', __name__)
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads', 'interventions')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@intervention_bp.route('/api/interventions', methods=['GET'])
def get_interventions():
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        student_id = request.args.get('student_id')
        user_role = session.get('role')
        user_id = session.get('user_id')
        
        # If student, strictly filter by their own record
        if user_role == 'STUDENT':
            cur.execute("SELECT student_id FROM students WHERE user_id = %s", (user_id,))
            s_row = cur.fetchone()
            if not s_row:
                return jsonify({"interventions": []})
            student_id = s_row['student_id']

        # Join with students table to get names
        query = """
        SELECT i.*, s.name as student_name, s.department, s.risk_level
        FROM interventions i
        JOIN students s ON i.student_id = s.student_id
        """
        
        params = []
        if student_id:
            query += " WHERE i.student_id = %s "
            params.append(student_id)
            
        query += " ORDER BY i.assigned_date DESC"
        
        cur.execute(query, tuple(params))
        interventions = cur.fetchall()
        
        cur.close()
        return jsonify({"interventions": interventions})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()

@intervention_bp.route('/api/interventions', methods=['POST'])
def create_intervention():
    # Handle multipart/form-data
    student_id_str = request.form.get('student_id')
    title = request.form.get('title')
    description = request.form.get('description')
    due_date = request.form.get('due_date')
    file = request.files.get('file')
    
    if not student_id_str or not title:
        return jsonify({"error": "Student IDs and Title are required"}), 400
        
    # Split by comma to handle bulk. If it's just one, it works fine.
    student_ids = [sid.strip() for sid in student_id_str.split(',') if sid.strip()]
    
    file_path = None
    if file and file.filename:
        filename = secure_filename(file.filename)
        save_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(save_path)
        file_path = filename

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        # We'll use a transaction for all selected students
        for sid in student_ids:
            cur.execute(
                "INSERT INTO interventions (student_id, title, description, due_date, status, file_path) VALUES (%s, %s, %s, %s, 'Pending', %s)",
                (sid, title, description, due_date, file_path)
            )
        
        conn.commit()
        cur.close()
        
        count = len(student_ids)
        msg = "Intervention assigned successfully" if count == 1 else f"Interventions assigned to {count} students"
        return jsonify({"message": msg}), 201
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()

@intervention_bp.route('/api/uploads/interventions/<filename>')
def serve_intervention_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@intervention_bp.route('/api/uploads/interventions/submissions/<filename>')
def serve_submission_file(filename):
    SUBMISSIONS_FOLDER = os.path.join(UPLOAD_FOLDER, 'submissions')
    return send_from_directory(SUBMISSIONS_FOLDER, filename)

@intervention_bp.route('/api/interventions/<int:id>', methods=['PUT'])
def update_intervention_status(id):
    # Support both JSON (just status change) and multipart/form-data (status + file)
    if request.is_json:
        status = request.json.get('status')
        file = None
    else:
        status = request.form.get('status')
        file = request.files.get('file')
        
    if status not in ['Pending', 'In Progress', 'Submitted', 'Completed']:
        return jsonify({"error": "Invalid status"}), 400
        
    submission_path = None
    if file and file.filename:
        SUBMISSIONS_FOLDER = os.path.join(UPLOAD_FOLDER, 'submissions')
        os.makedirs(SUBMISSIONS_FOLDER, exist_ok=True)
        filename = secure_filename(file.filename)
        # Prefix with ID to avoid collisions
        safe_filename = f"{id}_{filename}"
        save_path = os.path.join(SUBMISSIONS_FOLDER, safe_filename)
        file.save(save_path)
        submission_path = safe_filename

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        user_role = session.get('role')
        user_id = session.get('user_id')
        
        if user_role == 'STUDENT':
            # Ensure they are updating their own intervention
            cur.execute("""
                SELECT 1 FROM interventions i
                JOIN students s ON i.student_id = s.student_id
                WHERE i.id = %s AND s.user_id = %s
            """, (id, user_id))
            if not cur.fetchone():
                return jsonify({"error": "Forbidden"}), 403

        try:
            if submission_path:
                cur.execute("UPDATE interventions SET status=%s, submission_file_path=%s WHERE id=%s", (status, submission_path, id))
            else:
                cur.execute("UPDATE interventions SET status=%s WHERE id=%s", (status, id))
        except mysql.connector.Error as err:
            # Error 1265: Data truncated (ENUM mismatch)
            # Error 1054: Unknown column (missing submission_file_path)
            if err.errno in [1265, 1054]:
                print(f"--- [DEBUG] Auto-fixing interventions table (Error {err.errno}) ---")
                try:
                    # 1. Expand Enum
                    cur.execute("ALTER TABLE interventions MODIFY COLUMN status ENUM('Pending', 'In Progress', 'Submitted', 'Completed') DEFAULT 'Pending'")
                    # 2. Add submission_file_path if it was the cause of 1054
                    try:
                        cur.execute("ALTER TABLE interventions ADD COLUMN submission_file_path VARCHAR(255) AFTER file_path")
                    except mysql.connector.Error as col_err:
                        if col_err.errno != 1060: # Duplicate column is fine
                            raise col_err
                    
                    # Retry the original update
                    if submission_path:
                        cur.execute("UPDATE interventions SET status=%s, submission_file_path=%s WHERE id=%s", (status, submission_path, id))
                    else:
                        cur.execute("UPDATE interventions SET status=%s WHERE id=%s", (status, id))
                    print("--- [DEBUG] Auto-fix and retry successful ---")
                except Exception as fix_err:
                    print(f"--- [DEBUG] Auto-fix failed: {fix_err} ---")
                    raise err 
            else:
                raise err
            
        conn.commit()
        cur.close()
        
        return jsonify({"message": "Status updated successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()
