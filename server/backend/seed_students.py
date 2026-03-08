"""
Seed script: insert test students for MCA Sem 4 (unassigned, for class assignment testing).
Run once: python seed_students.py
"""
import os
from dotenv import load_dotenv
import mysql.connector
import random

load_dotenv()

conn = mysql.connector.connect(
    host=os.environ["DB_HOST"],
    user=os.environ["DB_USER"],
    password=os.environ["DB_PASSWORD"],
    database=os.environ["DB_NAME"]
)
cur = conn.cursor()

# 15 MCA Sem 4 students (unassigned — no class_id)
students = [
    ("MCA24001", "Aarav Menon",       "MCA", "4", 82.5, 78, 85, 7.8, 0),
    ("MCA24002", "Bhavya Nair",       "MCA", "4", 68.0, 55, 60, 5.9, 1),
    ("MCA24003", "Chirag Pillai",     "MCA", "4", 91.0, 88, 92, 8.6, 0),
    ("MCA24004", "Divya Krishnan",    "MCA", "4", 55.0, 40, 45, 4.5, 2),
    ("MCA24005", "Ebin Thomas",       "MCA", "4", 74.0, 65, 70, 6.8, 0),
    ("MCA24006", "Fathima Rasheed",   "MCA", "4", 88.5, 82, 88, 8.1, 0),
    ("MCA24007", "Gokul Varma",       "MCA", "4", 61.0, 50, 55, 5.2, 1),
    ("MCA24008", "Hana Suresh",       "MCA", "4", 95.0, 92, 95, 9.2, 0),
    ("MCA24009", "Irfan Siddiqui",    "MCA", "4", 48.0, 35, 40, 3.8, 3),
    ("MCA24010", "Jisha George",      "MCA", "4", 79.0, 72, 78, 7.4, 0),
    ("MCA24011", "Kiran Babu",        "MCA", "4", 66.0, 58, 62, 6.0, 1),
    ("MCA24012", "Lakshmi Priya",     "MCA", "4", 85.0, 80, 84, 8.0, 0),
    ("MCA24013", "Muhammed Ashraf",   "MCA", "4", 52.0, 42, 48, 4.2, 2),
    ("MCA24014", "Neethu Rajan",      "MCA", "4", 77.0, 70, 75, 7.1, 0),
    ("MCA24015", "Omkar Desai",       "MCA", "4", 93.0, 90, 93, 9.0, 0),
]

inserted = 0
skipped  = 0

for sid, name, dept, sem, att, internal, assign, sgpa, backlogs in students:
    risk_score = 0
    if att < 75:      risk_score += 40
    if sgpa < 6.5:    risk_score += 30
    if backlogs > 0:  risk_score += 30
    risk_level = "High" if risk_score >= 60 else ("Medium" if risk_score >= 30 else "Low")

    try:
        cur.execute("""
            INSERT INTO students
                (student_id, name, department, semester,
                 attendance_percentage, internal_marks, assignment_score,
                 sgpa, backlogs, risk_score, risk_level)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (sid, name, dept, sem, att, internal, assign, sgpa, backlogs, risk_score, risk_level))
        inserted += 1
    except mysql.connector.IntegrityError:
        skipped += 1  # already exists

conn.commit()
cur.close()
conn.close()
print(f"Done. Inserted: {inserted}, Skipped (already exist): {skipped}")
