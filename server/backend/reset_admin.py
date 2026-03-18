import os
import bcrypt
from db_connect import get_connection

def reset_admin_password():
    email = "nevin@admin.in"
    new_password = "admin@123"
    
    print(f"Resetting password for {email}...")
    
    conn = get_connection()
    try:
        cur = conn.cursor()
        
        # Hash the new password
        rounds = 12
        password_bytes = new_password.encode("utf-8")
        salt = bcrypt.gensalt(rounds)
        password_hash = bcrypt.hashpw(password_bytes, salt).decode("utf-8")
        
        # Update the user record
        cur.execute(
            "UPDATE users SET password_hash=%s, role='ADMIN' WHERE email=%s",
            (password_hash, email)
        )
        
        if cur.rowcount == 0:
            print(f"User {email} not found. Creating new admin...")
            cur.execute(
                "INSERT INTO users (email, password_hash, provider, role) VALUES (%s, %s, %s, %s)",
                (email, password_hash, "password", "ADMIN")
            )
        
        conn.commit()
        print(f"Success! Password for {email} has been reset to: {new_password}")
        cur.close()
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    reset_admin_password()
