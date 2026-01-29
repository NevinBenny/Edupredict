"""
Script to create missing database tables for EduPredict
"""
import sys
import os

# Add parent directory to path to import db_connect
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from db_connect import get_connection

def create_tables():
    conn = get_connection()
    try:
        cursor = conn.cursor()
        
        # Read and execute schema.sql
        with open('schema.sql', 'r', encoding='utf-8') as f:
            sql_script = f.read()
        
        # Split by semicolon and execute each statement
        statements = [stmt.strip() for stmt in sql_script.split(';') if stmt.strip()]
        
        for statement in statements:
            print(f"Executing: {statement[:50]}...")
            cursor.execute(statement)
            print("✓ Success")
        
        conn.commit()
        print("\n✅ All tables created successfully!")
        
        # Verify tables exist
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        print(f"\nTables in database:")
        for table in tables:
            print(f"  - {table[0]}")
        
        cursor.close()
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    create_tables()
