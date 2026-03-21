import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

def inspect_columns():
    conn = mysql.connector.connect(
        host=os.environ.get("DB_HOST", "127.0.0.1"),
        user=os.environ.get("DB_USER"),
        password=os.environ.get("DB_PASSWORD"),
        database=os.environ.get("DB_NAME")
    )
    cur = conn.cursor()
    
    print("--- Columns in students table ---")
    cur.execute("DESCRIBE students")
    for row in cur.fetchall():
        print(row)
        
    cur.close()
    conn.close()

if __name__ == "__main__":
    inspect_columns()
