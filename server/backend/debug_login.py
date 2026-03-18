from db_connect import get_connection
import bcrypt

def check_user():
    email = "nevin@admin.in"
    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id, email, password_hash, provider, role FROM users WHERE email=%s", (email,))
        user = cur.fetchone()
        print("User found:", user)
        
        if user and user['password_hash']:
            # Check if admin@123 matches
            test_pw = "admin@123"
            if bcrypt.checkpw(test_pw.encode('utf-8'), user['password_hash'].encode('utf-8')):
                print(f"Password 'admin@123' MATCHES for {email}")
            else:
                print(f"Password 'admin@123' DOES NOT MATCH for {email}")
                
            # Check if Admin123! matches (what user tried in screenshot)
            user_tried = "Admin123!"
            if bcrypt.checkpw(user_tried.encode('utf-8'), user['password_hash'].encode('utf-8')):
                print(f"Password 'Admin123!' MATCHES for {email}")
            else:
                print(f"Password 'Admin123!' DOES NOT MATCH for {email}")
        
        cur.close()
    finally:
        conn.close()

if __name__ == "__main__":
    check_user()
