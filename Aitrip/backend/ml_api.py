"""
AI Trip Planner - Flask ML API
Vignan University | Final Year Project | B.Tech CSE Data Science

Endpoints:
  GET  /health                     - Health check
  POST /predict-trip-satisfaction  - Main prediction + recommendations
  POST /submit-feedback            - Collect user satisfaction (for future ML retraining)
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os
import traceback
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)

# ── Load ML Model ───────────────────────────────────────────────────────────────
sys.path.append(os.path.dirname(__file__))
ml_model = None

try:
    from models.trip_recommendation_model import TripRecommendationModel
    ml_model = TripRecommendationModel()
    model_path = os.path.join(os.path.dirname(__file__), 'models', 'trip_recommendation_model.pkl')
    if os.path.exists(model_path):
        ml_model.load_model(model_path)
        print(f"[OK] ML model loaded: {ml_model.is_trained}")
    else:
        print(f"[WARN] Model file not found at {model_path}")
        print("    Running in fallback mode")
        ml_model.is_trained = False
except Exception as e:
    print(f"[ERROR] loading model: {e}")
    ml_model = type('obj', (object,), {'is_trained': False, 'predict': lambda *a, **k: 7.0})()

# Feedback storage
FEEDBACK_FILE = os.path.join(os.path.dirname(__file__), 'user_feedback.json')

def load_feedback():
    if os.path.exists(FEEDBACK_FILE):
        with open(FEEDBACK_FILE, 'r') as f:
            return json.load(f)
    return []

def save_feedback(data):
    with open(FEEDBACK_FILE, 'w') as f:
        json.dump(data, f)

print(f"[OK] ML API ready, trained={getattr(ml_model, 'is_trained', False)}")

# ── Health Check ─────────────────────────────────────────────────────────────
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status':        'healthy',
        'model_loaded': getattr(ml_model, 'is_trained', False),
        'model_version': '6.0',
        'model_type':   getattr(ml_model, 'model_type', 'unknown'),
        'destinations':  len(getattr(ml_model, 'base_scores', {})),
    })

# ── Main Prediction Endpoint ───────────────────────────────────────────
@app.route('/predict-trip-satisfaction', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        
        # Validate
        required = ['destination', 'duration', 'budget', 'companions', 'country']
        for f in required:
            if f not in data:
                return jsonify({'error': f'Missing: {f}'}), 400

        destination = data['destination']
        duration   = int(data['duration'])
        budget     = data['budget']
        companions = data['companions']
        country    = data['country']
        month     = data.get('month')

        # ── Get ML prediction (or fallback) ──
        if getattr(ml_model, 'is_trained', False):
            prediction = ml_model.predict(destination, duration, budget, companions, country, month)
            recommendations = ml_model.generate_recommendations(destination, duration, budget, companions, country, month)
        else:
            # Fallback prediction
            prediction = 7.0 + (hash(destination) % 10 - 5) * 0.1
            prediction = max(4.0, min(9.5, prediction))
            recommendations = _fallback_recommendations(destination)

        return jsonify({
            'success': True,
            'predicted_satisfaction': round(float(prediction), 2),
            'verdict': recommendations.get('verdict', 'Check it out'),
            'confidence': recommendations.get('confidence', 'medium'),
            'season': recommendations.get('season', 'any'),
            'season_note': recommendations.get('season_note', ''),
            'best_months': recommendations.get('best_months', ''),
            'recommendations': recommendations,
        })

    except Exception as e:
        print(f"Error: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

def _fallback_recommendations(destination):
    """Fallback when ML model not available"""
    return {
        'verdict': 'Recommended',
        'confidence': 'medium',
        'season': 'peak',
        'season_note': f'{destination} is great to visit year-round',
        'best_months': '[10, 11, 12, 1, 2, 3]',
        'accommodations': [f'Hotel {destination}', ' Boutique Stay', ' Resort'],
        'restaurants': ['Local Restaurant', 'Food Court'],
        'attractions': [f'{destination} Main Market', 'City Center'],
        'cuisines': ['Local', 'Continental'],
        'transportation': {'info': 'Local transport available', 'local': 'Use Ola/Uber'},
        'tips': ['Check weather before travel', 'Book hotels in advance'],
    }

# ── Submit Feedback (for future ML retraining) ────────────────────────────────────────
@app.route('/submit-feedback', methods=['POST'])
def submit_feedback():
    try:
        data = request.get_json()
        
        required = ['destination', 'duration', 'budget', 'companions', 'satisfaction']
        for f in required:
            if f not in data:
                return jsonify({'error': f'Missing: {f}'}), 400
        
        # Load existing feedback
        feedback_list = load_feedback()
        
        # Add new feedback
        feedback_list.append({
            'destination': data['destination'],
            'duration': int(data['duration']),
            'budget': data['budget'],
            'companions': data['companions'],
            'satisfaction': float(data['satisfaction']),
            'timestamp': datetime.now().isoformat(),
        })
        
        save_feedback(feedback_list)
        
        return jsonify({
            'success': True,
            'message': 'Feedback saved for future ML training',
            'total_feedback': len(feedback_list),
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── Run ───────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)