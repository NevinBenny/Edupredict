import os
from dotenv import load_dotenv

load_dotenv('server/backend/.env')

print(f"GOOGLE_CLIENT_ID: {os.environ.get('GOOGLE_CLIENT_ID')}")
print(f"GOOGLE_CLIENT_SECRET: {'***' if os.environ.get('GOOGLE_CLIENT_SECRET') else 'None'}")
print(f"GOOGLE_REDIRECT_URI: {os.environ.get('GOOGLE_REDIRECT_URI')}")
