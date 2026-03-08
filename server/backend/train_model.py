"""
train_model.py
Trains a RandomForestClassifier using scikit-learn to predict student risk levels.
If real student data is insufficient, it generates a synthetic dataset.
The trained model is exported to server/backend/models/risk_model.pkl
"""

import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, accuracy_score
import joblib
from db_connect import get_connection

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

def get_real_data():
    """Fetch existing historical data from the database."""
    conn = get_connection()
    try:
        query = """
            SELECT attendance_percentage, internal_marks, assignment_score, sgpa, backlogs, risk_level
            FROM students
            WHERE risk_level IS NOT NULL
        """
        df = pd.read_sql(query, conn)
        return df
    except Exception as e:
        print(f"Error fetching real data: {e}")
        return pd.DataFrame()
    finally:
        conn.close()

def generate_synthetic_data(num_samples=1000):
    """Generate synthetic data to train the model if there isn't enough real data."""
    print(f"Generating {num_samples} synthetic student records for robust training...")
    np.random.seed(42)
    
    # Generate features
    # High risk: low attendance, low marks, low SGPA, high backlogs
    # Medium risk: average everything
    # Low risk: high attendance, high marks, high SGPA, zero/low backlogs
    
    data = []
    
    for _ in range(num_samples):
        # 20% high risk, 30% medium risk, 50% low risk
        rand = np.random.random()
        
        if rand < 0.2: # High Risk Profile
            attendance = np.random.uniform(40, 70)
            internal = np.random.uniform(5, 12)
            assignment = np.random.uniform(3, 6)
            sgpa = np.random.uniform(4.0, 6.0)
            backlogs = np.random.randint(2, 6)
            risk = "High"
        elif rand < 0.5: # Medium Risk Profile
            attendance = np.random.uniform(65, 85)
            internal = np.random.uniform(10, 18)
            assignment = np.random.uniform(5, 8)
            sgpa = np.random.uniform(6.0, 7.5)
            backlogs = np.random.randint(0, 3)
            risk = "Medium"
        else: # Low Risk Profile
            attendance = np.random.uniform(80, 100)
            internal = np.random.uniform(15, 25)
            assignment = np.random.uniform(7, 10)
            sgpa = np.random.uniform(7.5, 10.0)
            backlogs = np.random.randint(0, 1)
            risk = "Low"
            
        data.append({
            "attendance_percentage": attendance,
            "internal_marks": internal,
            "assignment_score": assignment,
            "sgpa": sgpa,
            "backlogs": backlogs,
            "risk_level": risk
        })
        
    return pd.DataFrame(data)

def train_and_save():
    os.makedirs(MODELS_DIR, exist_ok=True)
    model_path = os.path.join(MODELS_DIR, "risk_model.pkl")
    scaler_path = os.path.join(MODELS_DIR, "scaler.pkl")
    
    df = get_real_data()
    
    # If we have less than 100 rows, use synthetic data to build a robust model
    if len(df) < 100:
        print(f"Found only {len(df)} real records. Falling back to synthetic training data.")
        df = generate_synthetic_data(1000)
    else:
        print(f"Training on {len(df)} real records from database.")
        
    # Prepare X and y
    features = ['attendance_percentage', 'internal_marks', 'assignment_score', 'sgpa', 'backlogs']
    
    # Drop rows with NaN in critical columns
    df = df.dropna(subset=features + ['risk_level'])
    
    X = df[features]
    y = df['risk_level']
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train Random Forest
    print("Training Random Forest Classifier...")
    model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
    model.fit(X_train_scaled, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test_scaled)
    acc = accuracy_score(y_test, y_pred)
    print(f"\nModel Accuracy: {acc:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    # Save Model and Scaler
    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)
    print(f"\nSaved model to {model_path}")
    print(f"Saved scaler to {scaler_path}")

if __name__ == "__main__":
    train_and_save()
