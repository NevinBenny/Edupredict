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
        print("Adding user_id to students table...")
        
        # Check if user_id column already exists
        cur.execute("SHOW COLUMNS FROM students LIKE 'user_id'")
        if not cur.fetchone():
            cur.execute("""
                ALTER TABLE students 
                ADD COLUMN user_id INT,
                ADD CONSTRAINT fk_student_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            """)
            print("Successfully added user_id column.")
        else:
            print("user_id column already exists.")
            
        conn.commit()
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    main()
