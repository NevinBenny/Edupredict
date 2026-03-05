import requests

print("Running AI Predictions Endpoint...")
try:
    response = requests.post("http://localhost:5000/api/ai/run-predictions")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Error: {e}")
