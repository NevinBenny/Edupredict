"""
Migration: Add Class-Faculty Assignment System
- Creates `classes` table
- Adds `class_id` FK to `students`
- Adds `class_id` FK to `faculties`
"""
import os
from dotenv import load_dotenv
import mysql.connector

load_dotenv()

conn = mysql.connector.connect(
    host=os.environ["DB_HOST"],
    user=os.environ["DB_USER"],
    password=os.environ["DB_PASSWORD"],
    database=os.environ["DB_NAME"]
)
cur = conn.cursor()

steps = [
    (
        "Create `classes` table",
        """
        CREATE TABLE IF NOT EXISTS classes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            department VARCHAR(100),
            semester VARCHAR(20),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """
    ),
    (
        "Add `class_id` to `students`",
        """
        ALTER TABLE students
            ADD COLUMN IF NOT EXISTS class_id INT NULL,
            ADD CONSTRAINT fk_student_class
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;
        """
    ),
    (
        "Add `class_id` to `faculties`",
        """
        ALTER TABLE faculties
            ADD COLUMN IF NOT EXISTS class_id INT NULL,
            ADD CONSTRAINT fk_faculty_class
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;
        """
    ),
]

for label, sql in steps:
    try:
        cur.execute(sql)
        conn.commit()
        print(f"[OK]  {label}")
    except mysql.connector.Error as e:
        # 1060 = Duplicate column, 1826 = Duplicate FK — safe to ignore
        if e.errno in (1060, 1826, 1050):
            print(f"[SKIP] {label} — already applied ({e.msg})")
        else:
            print(f"[ERR]  {label} — {e}")
            raise

cur.close()
conn.close()
print("\nMigration complete.")
