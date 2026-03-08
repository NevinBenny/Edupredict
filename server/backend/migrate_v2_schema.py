import os
import sys
from db_connect import get_connection

def main():
    conn = get_connection()
    if not conn:
        print("Failed to connect to database.")
        sys.exit(1)
        
    try:
        cur = conn.cursor()
        print("Starting V2 Schema Migration...")
        
        # 1. Fix the users role ENUM
        print("1. Fixing users role ENUM to include STUDENT...")
        cur.execute("ALTER TABLE users MODIFY COLUMN role ENUM('USER', 'ADMIN', 'FACULTY', 'STUDENT') NOT NULL DEFAULT 'USER';")
        
        # 2. Create Subjects Table
        print("2. Creating subjects table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS subjects (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(20) NOT NULL UNIQUE,
                name VARCHAR(150) NOT NULL,
                department VARCHAR(100) NOT NULL,
                semester INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 3. Create Faculty-Subjects Mapping (Many-to-Many)
        print("3. Creating faculty_subjects mapping table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS faculty_subjects (
                faculty_id INT NOT NULL,
                subject_id INT NOT NULL,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (faculty_id, subject_id),
                FOREIGN KEY (faculty_id) REFERENCES faculties(id) ON DELETE CASCADE,
                FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
            )
        """)
        
        # 4. Create Student Academic Records (Denormalized to Normalized)
        print("4. Creating student_academic_records table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS student_academic_records (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id VARCHAR(50) NOT NULL,
                subject_id INT NOT NULL,
                attendance_percentage FLOAT DEFAULT 0,
                internal_marks FLOAT DEFAULT 0,
                assignment_score FLOAT DEFAULT 0,
                recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_student_subject (student_id, subject_id),
                FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
                FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
            )
        """)
        
        # 5. Drop old columns from students table
        # We wrap this in a try-except block because if we run this script twice, it will fail the second time
        print("5. Dropping flat academic columns from students table...")
        try:
            cur.execute("""
                ALTER TABLE students 
                DROP COLUMN attendance_percentage,
                DROP COLUMN internal_marks,
                DROP COLUMN assignment_score;
            """)
            print("  Successfully dropped legacy columns.")
        except Exception as drop_err:
            print(f"  Note while dropping columns (might already be dropped): {drop_err}")
            
        print("Migration complete. Committing changes...")
        conn.commit()
        print("V2 Schema Migration Successful!")
        
    except Exception as e:
        print(f"Migration Failed: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    main()
