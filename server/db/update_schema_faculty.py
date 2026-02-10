
import sys
import os

# Add parent directory to path to import db_connect
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from db_connect import get_connection

def update_schema():
    conn = get_connection()
    try:
        cursor = conn.cursor()
        
        print("Modifying users table...")
        
        # 1. Modify ID column to be AUTO_INCREMENT if it's not (Just to be safe/consistent, though it should be)
        # Skipping this as it's likely already correct from schema.sql
        
        # 2. Modify ROLE enum to include FACULTY
        print("Updating role enum...")
        try:
            cursor.execute("ALTER TABLE users MODIFY COLUMN role ENUM('USER', 'ADMIN', 'FACULTY') NOT NULL DEFAULT 'USER'")
            print("✓ Role enum updated")
        except Exception as e:
            print(f"Warning updating role: {e}")

        # 3. Add must_change_password column
        print("Adding must_change_password column...")
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT FALSE")
            print("✓ must_change_password column added")
        except Exception as e:
            if "Duplicate column" in str(e):
                print("✓ must_change_password column already exists")
            else:
                print(f"Warning adding column: {e}")

        conn.commit()
        print("\n✅ Schema updated successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    update_schema()
