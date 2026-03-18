import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

def inspect_students():
    conn = mysql.connector.connect(
        host=os.environ.get("DB_HOST", "127.0.0.1"),
        user=os.environ.get("DB_USER"),
        password=os.environ.get("DB_PASSWORD"),
        database=os.environ.get("DB_NAME")
    )
    cur = conn.cursor(dictionary=True)
    
    print("--- Distinct Departments in Students Table ---")
    cur.execute("SELECT DISTINCT department FROM students")
    for row in cur.fetchall():
        print(f"'{row['department']}'")
    
    print("\n--- Faculty Record for nevinphilip16@gmail.com ---")
    cur.execute("SELECT * FROM faculties WHERE email='nevinphilip16@gmail.com'")
    f = cur.fetchone()
    print(f)
    
    if f:
        dept = f['department']
        print(f"\n--- Students in department '{dept}' ---")
        cur.execute("SELECT student_id, name, department FROM students WHERE department=%s", (dept,))
        students = cur.fetchall()
        print(f"Count: {len(students)}")
        for s in students:
            print(s)
            
    cur.close()
    conn.close()

if __name__ == "__main__":
    inspect_students()
