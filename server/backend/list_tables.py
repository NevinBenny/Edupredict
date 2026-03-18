from db_connect import get_connection

def list_tables():
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SHOW TABLES")
        tables = cur.fetchall()
        print(f"Tables: {tables}")
    finally:
        conn.close()

if __name__ == "__main__":
    list_tables()
