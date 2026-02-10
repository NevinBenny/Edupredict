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
        print("Creating interventions table...")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS interventions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            status ENUM('Pending', 'In Progress', 'Completed') DEFAULT 'Pending',
            assigned_date DATE DEFAULT (CURRENT_DATE),
            due_date DATE,
            FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)
        print("Interventions table created successfully.")
        
        conn.commit()
    except mysql.connector.Error as err:
        print(f"Error: {err}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    update_schema()
