from db_connect import get_connection

def describe_students():
    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("DESCRIBE students")
        rows = cur.fetchall()
        for row in rows:
            print(row)
        
        print("\n--- student_academic_records ---")
        cur.execute("DESCRIBE student_academic_records")
        rows = cur.fetchall()
        for row in rows:
            print(row)
    finally:
        conn.close()

if __name__ == "__main__":
    describe_students()
