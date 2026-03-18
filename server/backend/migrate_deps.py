from db_connect import get_connection

def migrate_departments():
    conn = get_connection()
    try:
        cur = conn.cursor()
        
        # 1. Create departments table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS departments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)
        
        # 2. Extract existing departments
        cur.execute("""
            SELECT department FROM students WHERE department IS NOT NULL AND department != ''
            UNION
            SELECT department FROM faculties WHERE department IS NOT NULL AND department != ''
            UNION
            SELECT department FROM subjects WHERE department IS NOT NULL AND department != ''
        """)
        existing_deps = cur.fetchall()
        
        # 3. Insert into departments table
        for (dep_name,) in existing_deps:
            cur.execute("INSERT IGNORE INTO departments (name) VALUES (%s)", (dep_name,))
            
        conn.commit()
        print(f"Migrated {len(existing_deps)} departments.")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_departments()
