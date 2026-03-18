import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

def inspect_db():
    conn = mysql.connector.connect(
        host=os.environ.get("DB_HOST", "127.0.0.1"),
        user=os.environ.get("DB_USER"),
        password=os.environ.get("DB_PASSWORD"),
        database=os.environ.get("DB_NAME")
    )
    cur = conn.cursor(dictionary=True)
    
    email = 'nevinphilip16@gmail.com'
    print(f"--- Inspecting user: {email} ---")
    
    cur.execute("SELECT id, email, role FROM users WHERE email=%s", (email,))
    user = cur.fetchone()
    print("User table record:", user)
    
    if user:
        cur.execute("SELECT * FROM faculties WHERE email=%s", (email,))
        faculty = cur.fetchone()
        print("Faculties table record:", faculty)
        
        cur.execute("SELECT * FROM students WHERE user_id=%s", (user['id'],))
        student = cur.fetchone()
        print("Students table record (if any):", student)
        
    print("\n--- All Faculties ---")
    cur.execute("SELECT * FROM faculties")
    for f in cur.fetchall():
        print(f)
        
    cur.close()
    conn.close()

if __name__ == "__main__":
    inspect_db()
