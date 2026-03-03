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

        cur.execute(f"SELECT AVG(attendance_percentage) as avg_attendance FROM students {where}", params)
        avg_attendance = cur.fetchone()['avg_attendance'] or 0

        cur.execute(f"SELECT AVG(sgpa) as avg_sgpa FROM students {where}", params)
        avg_sgpa = cur.fetchone()['avg_sgpa'] or 0

        cur.execute(f"SELECT COUNT(*) as high_risk FROM students WHERE risk_level = 'High' {'AND class_id = %s' if class_id else ''}", params)
        high_risk = cur.fetchone()['high_risk']

        summary = {
            "total_students": total,
            "avg_attendance": round(float(avg_attendance), 1),
            "avg_sgpa": round(float(avg_sgpa), 2),
            "high_risk_students": high_risk
        }

        cur.close()
        return jsonify(summary)
    except mysql.connector.Error as err:
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
    conn = None
    try:
        conn = get_connection()
        class_id = get_faculty_class_id(conn)
        
        # Security: If Faculty but no class assigned, return empty list
        if session.get("role") == "FACULTY" and not class_id:
            conn.close()
            return jsonify({"students": [], "total": 0})

        cur = conn.cursor(dictionary=True)

        where = "WHERE s.class_id = %s" if class_id else ""
        params = (class_id,) if class_id else ()

        cur.execute(f"""
            SELECT
                s.student_id, s.name, s.department, s.semester,
                s.attendance_percentage, s.internal_marks,
                s.assignment_score, s.sgpa, s.backlogs,
                s.risk_score, s.risk_level,
                s.class_id,
                c.name AS class_name
            FROM students s
            LEFT JOIN classes c ON c.id = s.class_id
            {where}
            ORDER BY s.created_at DESC
        """, params)
        students = cur.fetchall()

        for student in students:
            student['attendance_percentage'] = float(student['attendance_percentage'])
            student['sgpa'] = float(student['sgpa'])
            student['risk_score'] = float(student['risk_score'])

        cur.close()
        return jsonify({"students": students, "total": len(students)})
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 500
    finally:
        if conn:
            conn.close()


@dashboard_bp.route("/api/students", methods=["POST"])
def add_student():
    data = request.json
    
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        
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
        sgpa             = data.get("sgpa", 0.0)
        backlogs         = data.get("backlogs", 0)

        risk_score = 0
        if float(data["attendance_percentage"]) < 75: risk_score += 40
        if float(sgpa) < 6.5:                         risk_score += 30
        if int(backlogs) > 0:                         risk_score += 30

        risk_level = "Low"
        if risk_score >= 60:   risk_level = "High"
        elif risk_score >= 30: risk_level = "Medium"

        risk_score = data.get("risk_score", risk_score)
        risk_level = data.get("risk_level", risk_level)

        # ── Insert ────────────────────────────────────────────────────────────
        # Re-use cursor if needed or create new one (already open)
        cur.execute("""
            INSERT INTO students (
                student_id, name, department, semester,
                attendance_percentage, internal_marks,
                assignment_score, sgpa, backlogs,
                risk_score, risk_level, class_id
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            student_id, data["name"], department,
            semester, data["attendance_percentage"],
            internal_marks, assignment_score, sgpa, backlogs,
            risk_score, risk_level, class_id
        ))
        conn.commit()
        last_id = cur.lastrowid
        cur.close()

        return jsonify({"message": "Student added successfully", "id": last_id, "student_id": student_id}), 201

    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 500
    finally:
        if conn:
            conn.close()
