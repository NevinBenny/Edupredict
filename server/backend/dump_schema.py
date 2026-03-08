import sys
from db_connect import get_connection

def main():
    conn = get_connection()
    if not conn:
        print("Failed to connect to db")
        sys.exit(1)
        
    try:
        cur = conn.cursor()
        cur.execute("SHOW TABLES")
        tables = [row[0] for row in cur.fetchall()]
        
        for table in tables:
            print(f"\\n--- TABLE: {table} ---")
            cur.execute(f"DESCRIBE {table}")
            columns = cur.fetchall()
            for col in columns:
                print(f"  {col[0]:<20} | {col[1]:<15} | Null: {col[2]:<3} | Key: {col[3]:<3} | Default: {col[4]} | Extra: {col[5]}")
                
        # Get foreign keys
        print("\\n--- FOREIGN KEYS ---")
        cur.execute("""
            SELECT 
                TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
            FROM
                INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE
                REFERENCED_TABLE_SCHEMA = 'edupredict'
        """)
        fks = cur.fetchall()
        for fk in fks:
            print(f"  {fk[0]}.{fk[1]} -> {fk[3]}.{fk[4]} (Constraint: {fk[2]})")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    main()
