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
        print("Adding file_path column to interventions table...")
        # Check if column exists first to avoid error (optional, but safe)
        try:
            cursor.execute("ALTER TABLE interventions ADD COLUMN file_path VARCHAR(255)")
            print("Column 'file_path' added successfully.")
        except mysql.connector.Error as err:
            if "Duplicate column" in str(err):
                print("Column 'file_path' already exists.")
            else:
                raise err
        
        conn.commit()
    except mysql.connector.Error as err:
        print(f"Error: {err}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    update_schema()
