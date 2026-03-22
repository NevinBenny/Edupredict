import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

def get_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "edupredict")
    )

def update_schema():
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        print("Checking status ENUM and submission_file_path column...")
        
        # 1. Update ENUM to include 'Submitted'
        # Note: If it's already VARCHAR, this won't hurt. If it's ENUM, it will expand it.
        # However, to be extra safe with existing data, we use ALTER.
        # In MySQL, altering an ENUM to add an element at the end is usually fast.
        try:
            cursor.execute("ALTER TABLE interventions MODIFY COLUMN status ENUM('Pending', 'In Progress', 'Submitted', 'Completed') DEFAULT 'Pending'")
            print("Status ENUM updated successfully.")
        except mysql.connector.Error as err:
            print(f"Status ENUM Error: {err}")

        # 2. Add submission_file_path column
        try:
            cursor.execute("ALTER TABLE interventions ADD COLUMN submission_file_path VARCHAR(255) AFTER file_path")
            print("Column 'submission_file_path' added successfully.")
        except mysql.connector.Error as err:
            if "Duplicate column" in str(err):
                print("Column 'submission_file_path' already exists.")
            else:
                print(f"Column Error: {err}")
        
        conn.commit()
        print("Migration complete.")
    except mysql.connector.Error as err:
        print(f"Error: {err}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    update_schema()
