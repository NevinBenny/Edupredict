import os
from flask import Blueprint, request, jsonify, send_from_directory
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
        
        # Join with students table to get names
        query = """
        SELECT i.*, s.name as student_name, s.department, s.risk_level
        FROM interventions i
        JOIN students s ON i.student_id = s.student_id
        ORDER BY i.assigned_date DESC
        """
        cur.execute(query)
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
    student_id = request.form.get('student_id')
    title = request.form.get('title')
    description = request.form.get('description')
    due_date = request.form.get('due_date')
    file = request.files.get('file')
    
    if not student_id or not title:
        return jsonify({"error": "Student ID and Title are required"}), 400
        
    file_path = None
    if file and file.filename:
        filename = secure_filename(file.filename)
        # Ensure unique name or folder structure if needed
        # For simplicity, just save
        save_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(save_path)
        file_path = filename

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        cur.execute(
            "INSERT INTO interventions (student_id, title, description, due_date, status, file_path) VALUES (%s, %s, %s, %s, 'Pending', %s)",
            (student_id, title, description, due_date, file_path)
        )
        conn.commit()
        cur.close()
        
        return jsonify({"message": "Intervention assigned successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()

@intervention_bp.route('/api/uploads/interventions/<filename>')
def serve_intervention_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@intervention_bp.route('/api/interventions/<int:id>', methods=['PUT'])
def update_intervention_status(id):
    data = request.json
    status = data.get('status')
    
    if status not in ['Pending', 'In Progress', 'Completed']:
        return jsonify({"error": "Invalid status"}), 400
        
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        cur.execute("UPDATE interventions SET status=%s WHERE id=%s", (status, id))
        conn.commit()
        cur.close()
        
        return jsonify({"message": "Status updated successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()
