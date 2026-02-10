"""
Flask signup service for EduPredict.

Security highlights:
- Passwords arrive in plaintext over HTTPS and are hashed ONLY here with bcrypt.
- No secrets in code; all sourced from environment variables (.env).
- Backend re-validates email + password strength and confirm-match regardless of frontend checks.
- Parameterized queries prevent SQL injection.
- phpMyAdmin is for viewing data only; all logic lives here.
"""

import os
import traceback
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
import bcrypt
import smtplib
from email.message import EmailMessage
from urllib.parse import urlencode
from flask import Flask, jsonify, redirect, request, session
from flask_cors import CORS
from dotenv import load_dotenv
from google_auth_oauthlib.flow import Flow
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from db_connect import get_connection
from user_account import account_bp
from ai_service import ai_bp
from dashboard_service import dashboard_bp
from validators import validate_email, validate_password
from admin_service import admin_bp

load_dotenv()

# Explicit Google OAuth scopes to avoid scope-mismatch warnings
GOOGLE_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
]

def get_cors_origins():
  raw = os.environ.get("CORS_ORIGIN", "http://localhost:5173")
  # Allow comma-separated origins, trim whitespace
  return [o.strip() for o in raw.split(",") if o.strip()] or ["http://localhost:5173"]


app = Flask(__name__)
app.register_blueprint(account_bp)
app.register_blueprint(ai_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(admin_bp)
CORS(app, origins=get_cors_origins(), supports_credentials=True)
app.secret_key = os.environ.get("FLASK_SECRET", "dev-secret-change")
# Session cookie settings optimized for OAuth flow
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = False  # False for HTTP localhost
app.config["SESSION_COOKIE_HTTPONLY"] = True
RESET_LINK_DEBUG = bool(int(os.environ.get("RESET_LINK_DEBUG", "0")))
SMTP_HOST = os.environ.get("SMTP_HOST")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "465"))
SMTP_USER = os.environ.get("SMTP_USER")
SMTP_PASS = os.environ.get("SMTP_PASS")
SMTP_FROM = os.environ.get("SMTP_FROM", "no-reply@ecogrow.local")
SMTP_USE_TLS = bool(int(os.environ.get("SMTP_USE_TLS", "0")))


def hash_password(password: str) -> str:
  """Hash a password with bcrypt (backend only)."""
  rounds = int(os.environ.get("BCRYPT_ROUNDS", 12))
  hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds))
  return hashed.decode("utf-8")


def email_exists(conn, email: str) -> bool:
  cur = conn.cursor()
  cur.execute("SELECT 1 FROM users WHERE email=%s LIMIT 1", (email,))
  exists = cur.fetchone() is not None
  cur.close()
  return exists



def get_role_for_email(conn, email: str) -> str:
  """
  Determine role based on email.
  1. Specific Admin email -> ADMIN
  2. Exists in faculties table -> FACULTY
  3. Default -> USER
  """
  if email == "nevinbenny2028@mca.ajce.in":
    return "ADMIN"
    
  cur = conn.cursor()
  cur.execute("SELECT 1 FROM faculties WHERE email=%s LIMIT 1", (email,))
  is_faculty = cur.fetchone() is not None
  cur.close()
  
  return "FACULTY" if is_faculty else "USER"


def insert_user(conn, email: str, password_hash: str):
  cur = conn.cursor()
  role = get_role_for_email(conn, email)
  cur.execute(
    "INSERT INTO users (email, password_hash, provider, role) VALUES (%s, %s, %s, %s)",
    (email, password_hash, "password", role),
  )
  conn.commit()
  cur.close()


def upsert_google_user(conn, email: str):
  cur = conn.cursor()
  cur.execute("SELECT id, role FROM users WHERE email=%s", (email,))
  existing = cur.fetchone()
  
  target_role = get_role_for_email(conn, email)
  
  if existing:
    user_id, current_role = existing
    
    # Sync role if it should be ADMIN or FACULTY but isn't
    # (e.g. user was added to faculty list AFTER signing up)
    if current_role != target_role and target_role in ["ADMIN", "FACULTY"]:
      cur.execute("UPDATE users SET role=%s WHERE id=%s", (target_role, user_id))
      conn.commit()
      current_role = target_role
      
    cur.close()
    return (user_id, current_role)
  
  cur.execute(
    "INSERT INTO users (email, provider, role) VALUES (%s, %s, %s)",
    (email, "google", target_role),
  )
  conn.commit()
  new_id = cur.lastrowid
  cur.close()
  return (new_id, target_role)


def get_user_with_password(conn, email: str):
  """Fetch user id, hash, provider, and role for login."""
  cur = conn.cursor()
  cur.execute(
    "SELECT id, email, password_hash, provider, role FROM users WHERE email=%s LIMIT 1",
    (email,),
  )
  row = cur.fetchone()
  cur.close()
  return row


def get_user_id(conn, email: str):
  """Return user id and provider for a given email, or None."""
  cur = conn.cursor()
  cur.execute("SELECT id, provider FROM users WHERE email=%s LIMIT 1", (email,))
  row = cur.fetchone()
  cur.close()
  return row


def hash_reset_token(raw: str) -> str:
  return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def create_reset_request(conn, user_id: int, ttl_minutes: int = 30) -> str:
  token = secrets.token_urlsafe(32)
  token_hash = hash_reset_token(token)
  now_utc = datetime.now(timezone.utc)
  # Store naive UTC so DB compares apples-to-apples under UTC session time zone
  created_at = now_utc.replace(tzinfo=None)
  expires_at = (now_utc + timedelta(minutes=ttl_minutes)).replace(tzinfo=None)
  cur = conn.cursor()
  cur.execute(
    "INSERT INTO password_resets (user_id, token_hash, created_at, expires_at) VALUES (%s, %s, %s, %s)",
    (user_id, token_hash, created_at, expires_at),
  )
  conn.commit()
  cur.close()
  return token


def send_reset_email(to_email: str, reset_link: str):
  if not SMTP_HOST or not SMTP_USER or not SMTP_PASS:
    raise RuntimeError("SMTP is not configured (SMTP_HOST/USER/PASS)")

  msg = EmailMessage()
  msg["Subject"] = "Reset your EduPredict password"
  msg["From"] = SMTP_FROM
  msg["To"] = to_email
  msg.set_content(f"Click the link to reset your password: {reset_link}\nIf you did not request this, you can ignore it.")

  if SMTP_USE_TLS:
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as smtp:
      smtp.starttls()
      smtp.login(SMTP_USER, SMTP_PASS)
      smtp.send_message(msg)
  else:
    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as smtp:
      smtp.login(SMTP_USER, SMTP_PASS)
      smtp.send_message(msg)


def build_google_flow(state: str | None = None):
  client_id = os.environ.get("GOOGLE_CLIENT_ID")
  client_secret = os.environ.get("GOOGLE_CLIENT_SECRET")
  redirect_uri = os.environ.get("GOOGLE_REDIRECT_URI")
  if not client_id or not client_secret or not redirect_uri:
    raise RuntimeError("Google OAuth env vars missing (GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI)")
  flow = Flow.from_client_config(
    {
      "web": {
        "client_id": client_id,
        "client_secret": client_secret,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
      }
    },
    scopes=GOOGLE_SCOPES,
    redirect_uri=redirect_uri,
    state=state,
  )
  # state is attached during authorization_url, not at construction
  return flow


@app.post("/api/signup")
def signup_user():
  data = request.get_json(silent=True) or {}
  email = (data.get("email") or "").strip()
  password = data.get("password") or ""
  confirm = data.get("confirmPassword") or ""

  # Authoritative backend validation
  if not validate_email(email):
    return jsonify({"message": "Invalid email format."}), 400
  if not validate_password(password):
    return jsonify({"message": "Password must be 8+ chars and include upper, lower, number, and special."}), 400
  if password != confirm:
    return jsonify({"message": "Passwords do not match."}), 400

  conn = get_connection()
  try:
    if email_exists(conn, email):
      return jsonify({"message": "Email already registered."}), 409

    pw_hash = hash_password(password)  # Hashing happens here (backend only)
    insert_user(conn, email, pw_hash)   # DB write happens here

    return jsonify({"message": "Signup successful."}), 201
  except Exception:
    # Do not leak internal errors or SQL details
    return jsonify({"message": "Unable to process signup right now."}), 500
  finally:
    conn.close()


@app.post("/api/login")
def login_user():
  data = request.get_json(silent=True) or {}
  email = (data.get("email") or "").strip()
  password = data.get("password") or ""

  if not validate_email(email):
    return jsonify({"message": "Invalid email format."}), 400
  if not password:
    return jsonify({"message": "Password is required."}), 400

  conn = get_connection()
  try:
    user_row = get_user_with_password(conn, email)
    if not user_row:
      return jsonify({"message": "Invalid credentials."}), 401

    user_id, _, password_hash, provider, role = user_row
    if provider != "password":
      return jsonify({"message": "Use Google sign-in for this account."}), 400

    if not password_hash:
      return jsonify({"message": "Invalid credentials."}), 401

    if not bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8")):
      return jsonify({"message": "Invalid credentials."}), 401

    # Final safety check for admin role override
    if email == "nevinbenny2028@mca.ajce.in" and role != "ADMIN":
      role = "ADMIN"
      # Sync in DB if needed
      temp_cur = conn.cursor()
      temp_cur.execute("UPDATE users SET role='ADMIN' WHERE id=%s", (user_id,))
      conn.commit()
      temp_cur.close()

    session["user_id"] = user_id
    session["email"] = email
    session["role"] = role
    
    # Check for forced password change
    cur = conn.cursor()
    cur.execute("SELECT must_change_password FROM users WHERE id=%s", (user_id,))
    must_change = cur.fetchone()[0] == 1
    cur.close()

    return jsonify({
      "message": "Login successful.",
      "user": {
        "id": user_id,
        "email": email,
        "role": role
      },
      "requirePasswordChange": must_change
    }), 200
  except Exception:
    return jsonify({"message": "Unable to process login right now."}), 500
  finally:
    conn.close()


@app.route("/api/auth/force-change-password", methods=["POST"])
def force_change_password():
    if "user_id" not in session:
        return jsonify({"message": "Unauthorized"}), 401
    
    data = request.json
    new_password = data.get("newPassword")
    
    if not new_password or len(new_password) < 8:
        return jsonify({"message": "Password must be at least 8 characters"}), 400
        
    user_id = session["user_id"]
    hashed = hash_password(new_password)
    
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        # Update password and clear flag
        cur.execute(
            "UPDATE users SET password_hash=%s, must_change_password=FALSE WHERE id=%s",
            (hashed, user_id)
        )
        conn.commit()
        cur.close()
        
        return jsonify({"message": "Password updated successfully"})
        
    except mysql.connector.Error as err:
        return jsonify({"message": "Database error"}), 500
    finally:
        if conn:
            conn.close()


@app.post("/api/forgot-password")
def forgot_password():
  data = request.get_json(silent=True) or {}
  email = (data.get("email") or "").strip()

  if not validate_email(email):
    return jsonify({"message": "If the account exists, a reset link will be emailed."}), 200

  conn = get_connection()
  try:
    user_row = get_user_id(conn, email)
    if not user_row:
      # Avoid revealing account existence
      return jsonify({"message": "If the account exists, a reset link will be emailed."}), 200

    user_id, provider = user_row
    if provider != "password":
      return jsonify({"message": "If the account exists, a reset link will be emailed."}), 200

    token = create_reset_request(conn, user_id)
    frontend_origin = os.environ.get("CORS_ORIGIN", "http://localhost:5173").split(",")[0].strip()
    reset_link = f"{frontend_origin}/reset?token={token}"

    # Send reset email (SMTP must be configured via env vars)
    send_reset_email(email, reset_link)

    response_body = {"message": "If the account exists, a reset link will be emailed."}
    if RESET_LINK_DEBUG:
      response_body["reset_link"] = reset_link

    return jsonify(response_body), 200
  except Exception:
    return jsonify({"message": "Unable to process reset right now."}), 500
  finally:
    conn.close()


@app.post("/api/reset-password")
def reset_password():
  data = request.get_json(silent=True) or {}
  token = (data.get("token") or "").strip()
  password = data.get("password") or ""
  confirm = data.get("confirmPassword") or ""

  if not token:
    return jsonify({"message": "Reset token is required."}), 400
  if password != confirm:
    return jsonify({"message": "Passwords do not match."}), 400
  if not validate_password(password):
    return jsonify({"message": "Password must be 8+ chars and include upper, lower, number, and special."}), 400

  token_hash = hash_reset_token(token)
  conn = get_connection()
  try:
    cur = conn.cursor()
    cur.execute(
      """
      SELECT pr.id, pr.user_id, u.provider
      FROM password_resets pr
      JOIN users u ON u.id = pr.user_id
      WHERE pr.token_hash=%s AND pr.used=0 AND pr.expires_at > UTC_TIMESTAMP()
      LIMIT 1
      """,
      (token_hash,),
    )
    row = cur.fetchone()
    if not row:
      cur.close()
      return jsonify({"message": "Invalid or expired reset link."}), 400

    reset_id, user_id, provider = row
    
    # Close previous cursor to ensure clean state before transaction
    cur.close()

    if provider != "password":
      return jsonify({"message": "Invalid or expired reset link."}), 400

    pw_hash = hash_password(password)

    try:
      # Ends the implicit transaction started by the SELECT query
      conn.commit()
      
      conn.start_transaction()
      # Open new cursor for the transaction updates
      cur = conn.cursor()
      cur.execute("UPDATE users SET password_hash=%s WHERE id=%s", (pw_hash, user_id))
      cur.execute("UPDATE password_resets SET used=1 WHERE id=%s", (reset_id,))
      conn.commit()
      cur.close()

      return jsonify({"message": "Password updated successfully."}), 200
    except Exception:
      conn.rollback()
      with open("server_error.log", "w") as f:
        traceback.print_exc(file=f)
      return jsonify({"message": "Unable to reset password right now."}), 500
  except Exception:
    with open("server_error.log", "w") as f:
      traceback.print_exc(file=f)
    return jsonify({"message": "Unable to reset password right now."}), 500
  finally:
    conn.close()


@app.get("/api/users")
def get_all_users():
  """Fetch all users for admin panel. Requires admin role."""
  # Check if user is authenticated and is admin
  user_id = session.get("user_id")
  user_role = session.get("role")
  
  if not user_id:
    return jsonify({"message": "Unauthorized."}), 401
  
  if user_role != "ADMIN":
    return jsonify({"message": "Forbidden. Admin access required."}), 403
  
  conn = get_connection()
  try:
    cur = conn.cursor()
    cur.execute(
      "SELECT id, email, role, provider, created_at FROM users ORDER BY created_at DESC",
    )
    rows = cur.fetchall()
    cur.close()
    
    users = []
    for row in rows:
      user_id_db, email, role, provider, created_at = row
      users.append({
        "id": user_id_db,
        "email": email,
        "role": role,
        "provider": provider,
        "createdAt": created_at.isoformat() if created_at else None,
        "status": "Active",  # Can be extended with last_login tracking
      })
    
    return jsonify({"users": users, "total": len(users)}), 200
  except Exception as e:
    with open("server_error.log", "w") as f:
      traceback.print_exc(file=f)
    return jsonify({"message": "Unable to fetch users."}), 500
  finally:
    conn.close()




@app.get("/health")
def health():
  return jsonify({"status": "ok"})


@app.get("/api/google/start")
def google_start():
  flow = build_google_flow()
  auth_url, state = flow.authorization_url(
    access_type="offline",
    include_granted_scopes="true",  # Google expects a string "true"/"false"
    prompt="select_account",
  )
  session["state"] = state
  return redirect(auth_url)


@app.get("/api/google/callback")
def google_callback():
  state = request.args.get("state") or session.get("state")
  if not state:
    return jsonify({"message": "Missing OAuth state."}), 400

  flow = build_google_flow(state=state)
  flow.fetch_token(authorization_response=request.url)

  id_info = id_token.verify_oauth2_token(
    flow.credentials.id_token,
    google_requests.Request(),
    os.environ.get("GOOGLE_CLIENT_ID"),
  )

  email = id_info.get("email")
  if not email:
    return jsonify({"message": "Google token missing email."}), 400

  conn = get_connection()
  try:
    user_id, role = upsert_google_user(conn, email)
    
    # establish session
    session["user_id"] = user_id
    session["email"] = email
    session["role"] = role
  finally:
    conn.close()

  # Redirect to frontend dashboard after successful Google auth
  origin = os.environ.get("CORS_ORIGIN", "http://localhost:5173").split(",")[0].strip()
  target = f"{origin}/welcome"
  return redirect(target)


if __name__ == "__main__":
  app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=bool(int(os.environ.get("FLASK_DEBUG", 0))))
