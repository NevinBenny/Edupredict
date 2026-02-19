from flask import session
from db_connect import get_connection
from datetime import datetime
import mysql.connector

def check_admin():
    """Helper to check if current session is an admin."""
    if not session.get("user_id"):
        return False, "Unauthorized", 401
    if session.get("role") != "ADMIN":
        return False, "Forbidden. Admin access required.", 403
    return True, None, None

def get_faculty_class_id(conn):
    """If the logged-in user is FACULTY, return their class_id; else None."""
    if session.get("role") != "FACULTY":
        return None
    email = session.get("email")
    if not email:
        return None
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT class_id FROM faculties WHERE email = %s", (email,))
    row = cur.fetchone()
    cur.close()
    return row["class_id"] if row else None

def generate_student_id(conn, department):
    """
    Auto-generate a student ID based on department and year.
    Format: <DEPT_PREFIX><YY><4-digit-seq>  e.g. MCA250016
    """
    year_suffix = datetime.now().strftime("%y")
    dept_prefix = "".join(c for c in department.upper() if c.isalpha())[:6]
    prefix = f"{dept_prefix}{year_suffix}"

    cur = conn.cursor(dictionary=True)
    cur.execute(
        "SELECT student_id FROM students WHERE student_id LIKE %s ORDER BY student_id DESC LIMIT 1",
        (f"{prefix}%",)
    )
    last = cur.fetchone()
    cur.close()

    if last:
        try:
            # Extract number part after prefix and increment
            # safely handle if the stored ID format differs slighty
            seq_str = last["student_id"][len(prefix):]
            if seq_str.isdigit():
                seq = int(seq_str) + 1
            else:
                seq = 1
        except ValueError:
            seq = 1
    else:
        seq = 1

    return f"{prefix}{seq:04d}"
