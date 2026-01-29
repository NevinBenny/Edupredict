from flask import Blueprint, jsonify
import random

ai_bp = Blueprint('ai_bp', __name__)

@ai_bp.route('/api/ai/predict', methods=['GET'])
def predict_risk():
    """
    Simulates an AI model prediction for student academic risk analysis.
    In the future, this will connect to a real ML model.
    """
    # Mock data simulation
    risks = ["Low", "Moderate", "High"]
    selected_risk = random.choice(risks)
    
    confidence = random.randint(70, 99)
    
    analysis_text = {
        "Low": "Student performance is stable. Attendance and internal assessment scores are within the expected range for the current semester.",
        "Moderate": "Slight decline in attendance or internal marks detected. Early intervention suggested to prevent further academic slide.",
        "High": "Critical warning: High probability of academic failure detected based on low attendance and poor performance in recent assessments."
    }
    
    recommendations = {
        "Low": ["Continue current study habits", "Participate in enrichment programs"],
        "Moderate": ["Schedule a meeting with the academic advisor", "Join peer tutoring sessions for challenging subjects"],
        "High": ["Mandatory counseling session", "Intensive remedial classes", "Peer mentorship assignment"]
    }

    return jsonify({
        "risk_level": selected_risk,
        "confidence_score": confidence,
        "analysis": analysis_text[selected_risk],
        "recommendations": recommendations[selected_risk],
        "timestamp": "2024-10-27T10:00:00Z" # Mock static timestamp or dynamic
    })
