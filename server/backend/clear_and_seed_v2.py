import os
import hashlib
import random
import mysql.connector
from dotenv import load_dotenv

load_dotenv()

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def main():
    conn = mysql.connector.connect(
        host=os.environ["DB_HOST"],
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
        database=os.environ["DB_NAME"]
    )
    cur = conn.cursor()

    print("Clearing tables...")
    cur.execute("SET FOREIGN_KEY_CHECKS = 0;")
    tables = [
        "student_academic_records",
        "faculty_subjects",
        "interventions",
        "student_history",
        "password_resets",
        "students",
        "subjects",
        "faculties",
        "classes"
    ]
    for t in tables:
        cur.execute(f"TRUNCATE TABLE {t};")
        
    # Keep ADMIN users
    cur.execute("DELETE FROM users WHERE role IN ('STUDENT', 'FACULTY');")
    cur.execute("SET FOREIGN_KEY_CHECKS = 1;")
    conn.commit()

    # Insert subjects
    subjects_data = [
        ('MCA401', 'Machine Learning', 'MCA', '4'),
        ('MCA402', 'Cloud Computing', 'MCA', '4'),
        ('MCA403', 'Big Data Analytics', 'MCA', '4'),
        ('CSE601', 'Compiler Design', 'CSE', '6'),
        ('CSE602', 'Computer Networks', 'CSE', '6')
    ]

    print("Inserting subjects...")
    for code, name, dept, sem in subjects_data:
        cur.execute("INSERT INTO subjects (code, name, department, semester) VALUES (%s, %s, %s, %s)", (code, name, dept, sem))
    conn.commit()

    # Get subject IDs map
    cur.execute("SELECT id, code, department, semester FROM subjects")
    subjects = cur.fetchall()
    subject_map = {row[1]: row[0] for row in subjects}
    mca_sem4_subjects = [row[0] for row in subjects if row[2] == 'MCA' and str(row[3]) == '4']
    cse_sem6_subjects = [row[0] for row in subjects if row[2] == 'CSE' and str(row[3]) == '6']

    # Insert faculties
    faculties_data = [
        ('Dr. John Doe', 'john.doe@faculty.in', 'MCA', 'Professor', ['MCA401', 'MCA402']),
        ('Prof. Jane Smith', 'jane.smith@faculty.in', 'MCA', 'Assistant Professor', ['MCA403']),
        ('Dr. Alan Turing', 'alan.turing@faculty.in', 'CSE', 'Professor', ['CSE601', 'CSE602'])
    ]

    print("Inserting faculties...")
    for name, email, dept, desig, taught_subjects in faculties_data:
        cur.execute("INSERT INTO users (email, password_hash, role) VALUES (%s, %s, 'FACULTY')", (email, hash_password("faculty123")))
        cur.execute("INSERT INTO faculties (name, email, department, designation) VALUES (%s, %s, %s, %s)", 
                    (name, email, dept, desig))
        faculty_id = cur.lastrowid
        
        for sub_code in taught_subjects:
            if sub_code in subject_map:
                cur.execute("INSERT INTO faculty_subjects (faculty_id, subject_id) VALUES (%s, %s)", 
                            (faculty_id, subject_map[sub_code]))
    conn.commit()

    # Insert students
    students_data = [
        # sid, name, dept, sem, sgpa, backlogs, email
        ("MCA24001", "Aarav Menon", "MCA", "4", 7.8, 0, "aarav@mca.ajce.in"),
        ("MCA24002", "Bhavya Nair", "MCA", "4", 5.9, 1, "bhavya@mca.ajce.in"),
        ("MCA24003", "Chirag Pillai", "MCA", "4", 8.6, 0, "chirag@mca.ajce.in"),
        ("MCA24004", "Divya Krishnan", "MCA", "4", 4.5, 2, "divya@mca.ajce.in"),
        ("MCA24005", "Arjun Kumar", "MCA", "4", 6.8, 0, "arjun@mca.ajce.in"),
        ("MCA24006", "Sneha Patel", "MCA", "4", 9.1, 0, "sneha@mca.ajce.in"),
        ("CSE24001", "Ebin Thomas", "CSE", "6", 6.8, 0, "ebin@cse.ajce.in"),
        ("CSE24002", "Fathima Rasheed", "CSE", "6", 8.1, 0, "fathima@cse.ajce.in"),
        ("CSE24003", "Rahul Sharma", "CSE", "6", 5.2, 3, "rahul@cse.ajce.in"),
    ]

    print("Inserting students and generating academic records...")
    for sid, name, dept, sem, sgpa, backlogs, email in students_data:
        # User
        cur.execute("INSERT INTO users (email, password_hash, role, must_change_password) VALUES (%s, %s, 'STUDENT', 0)", 
                    (email, hash_password("student123")))
        user_id = cur.lastrowid
        
        # Calculate risk based on static rules
        risk_score = 0
        if sgpa < 6.5: risk_score += 30
        if backlogs > 0: risk_score += 30
        risk_level = "High" if risk_score >= 60 else ("Medium" if risk_score >= 30 else "Low")
        
        cur.execute("""
            INSERT INTO students (student_id, user_id, name, department, semester, sgpa, backlogs, risk_score, risk_level)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (sid, user_id, name, dept, sem, sgpa, backlogs, risk_score, risk_level))
        
        # Academic records per subject
        subs = mca_sem4_subjects if dept == 'MCA' else cse_sem6_subjects
        for sub_id in subs:
            # Generate somewhat realistic stats correlating with their SGPA
            if sgpa >= 7.5:
                att = random.uniform(85, 100)
                int_marks = random.uniform(35, 50)
                assign_score = random.uniform(85, 100)
            elif sgpa >= 6.0:
                att = random.uniform(70, 85)
                int_marks = random.uniform(25, 40)
                assign_score = random.uniform(65, 85)
            else:
                att = random.uniform(50, 75)
                int_marks = random.uniform(10, 30)
                assign_score = random.uniform(40, 65)
            
            # Risk formula on AI model also penalizes attendance < 75 
            
            cur.execute("""
                INSERT INTO student_academic_records (student_id, subject_id, attendance_percentage, internal_marks, assignment_score)
                VALUES (%s, %s, %s, %s, %s)
            """, (sid, sub_id, att, int_marks, assign_score))

    conn.commit()
    cur.close()
    conn.close()

    print("Seed completed successfully! You can login with:")
    print("Faculty: john.doe@faculty.in / faculty123")
    print("Faculty: alan.turing@faculty.in / faculty123")
    print("Student: aarav@mca.ajce.in / student123")

if __name__ == "__main__":
    main()
