from db_connect import get_connection

conn = get_connection()
cur = conn.cursor()

try:
    print("Adding status and is_default to users table...")
    cur.execute("ALTER TABLE users ADD COLUMN status ENUM('ACTIVE', 'RETIRED') DEFAULT 'ACTIVE'")
    print("Added status column.")
except Exception as e:
    print("Warning adding status:", e)

try:
    cur.execute("ALTER TABLE users ADD COLUMN is_default BOOLEAN DEFAULT FALSE")
    print("Added is_default column.")
    
    # Make the first admin the default if none exists
    cur.execute("UPDATE users SET is_default = TRUE WHERE role = 'ADMIN' LIMIT 1")
    conn.commit()
    print("Set first admin as default.")
except Exception as e:
    print("Warning adding is_default:", e)

cur.close()
conn.close()
print("Done.")
