
import mysql.connector
from db_connect import get_connection

def debug_faculty():
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        
        print("--- Checking Faculties Table ---")
        cur.execute("SELECT * FROM faculties")
        faculties = cur.fetchall()
        for f in faculties:
            print(f)
            
        print("\n--- Checking Classes Table ---")
        cur.execute("SELECT * FROM classes")
        classes = cur.fetchall()
        for c in classes:
            print(c)
            
        print("\n--- Checking Users Table ---")
        cur.execute("SELECT * FROM users")
        users = cur.fetchall()
        for u in users:
            print(u)
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_faculty()
