import requests
import json

BASE_URL = "http://localhost:5000/api"

def verify_interventions():
    print("1. Fetching Students...")
    try:
        res = requests.get(f"{BASE_URL}/students")
        if res.status_code != 200:
            print(f"Failed to fetch students: {res.status_code}")
            return
        
        data = res.json()
        students = data.get("students", [])
        if not students:
            print("No students found. Cannot verify interventions.")
            return
            
        student_id = students[0]["student_id"]
        print(f"Found student: {student_id}")
        
        print("\n2. Creating Intervention...")
        payload = {
            "student_id": student_id,
            "title": "Test Assignment",
            "description": "This is a test intervention created by verification script.",
            "due_date": "2024-12-31"
        }
        res = requests.post(f"{BASE_URL}/interventions", json=payload)
        if res.status_code == 201:
            print("Intervention created successfully.")
        else:
            print(f"Failed to create intervention: {res.status_code} - {res.text}")
            return

        print("\n3. Fetching Interventions...")
        res = requests.get(f"{BASE_URL}/interventions")
        if res.status_code != 200:
            print(f"Failed to fetch interventions: {res.status_code}")
            return
            
        interventions = res.json().get("interventions", [])
        created_int = next((i for i in interventions if i["student_id"] == student_id and i["title"] == "Test Assignment"), None)
        
        if created_int:
            print(f"Verified intervention exists. ID: {created_int['id']}, Status: {created_int['status']}")
            
            print("\n4. Updating Status...")
            int_id = created_int['id']
            res = requests.put(f"{BASE_URL}/interventions/{int_id}", json={"status": "In Progress"})
            if res.status_code == 200:
                print("Status updated successfully.")
            else:
                print(f"Failed to update status: {res.status_code}")
        else:
            print("Could not find the created intervention in the list.")

    except Exception as e:
        print(f"Error during verification: {e}")

if __name__ == "__main__":
    verify_interventions()
