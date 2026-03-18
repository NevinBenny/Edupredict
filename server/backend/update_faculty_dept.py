import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

def update_faculty():
    conn = mysql.connector.connect(
        host=os.environ.get("DB_HOST", "127.0.0.1"),
        user=os.environ.get("DB_USER"),
        password=os.environ.get("DB_PASSWORD"),
        database=os.environ.get("DB_NAME")
    )
    cur = conn.cursor(dictionary=True)
    
    email = 'nevinphilip16@gmail.com'
    new_dept = 'MCA'
    
    print(f"Updating department for {email} to {new_dept}...")
    cur.execute("UPDATE faculties SET department=%s WHERE email=%s", (new_dept, email))
    conn.commit()
    print("Update successful.")
    
    cur.close()
    conn.close()

if __name__ == "__main__":
    update_faculty()
