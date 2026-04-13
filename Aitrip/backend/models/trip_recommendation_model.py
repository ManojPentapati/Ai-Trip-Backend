"""
AI Trip Planner - Trip Recommendation Model v6.0
Vignan University | Final Year Project | B.Tech CSE Data Science
"""

import joblib
import numpy as np
import hashlib
import os
from datetime import datetime


class TripRecommendationModel:
    def __init__(self):
        self.model           = None
        self.scaler          = None
        self.label_encoders  = {}
        self.is_trained      = False
        self.model_type      = None
        self.best_model_name = None
        self.metrics         = {}
        self.hotel_lookup       = {}
        self.restaurant_lookup  = {}
        self.cuisine_lookup     = {}
        self.attraction_lookup  = {}
        self.transport_lookup   = {}
        self.state_to_city      = {}
        self.state_popularity   = {}
        self.best_months           = {}
        self.base_scores           = {}
        self.threshold             = 7.5
        self.score_map             = None
        self.label_map             = None
        self.state_features        = {}
        self.monthly_tourism_score = {}
        self.feature_names         = []

    def load_model(self, filepath='models/trip_recommendation_model.pkl'):
        try:
            data = joblib.load(filepath)
            self.model           = data.get('model', None)
            self.scaler          = data.get('scaler', None)
            self.label_encoders  = data.get('label_encoders', {})
            self.is_trained      = data.get('is_trained', True)
            self.model_type      = data.get('model_type', 'binary_classification')
            self.best_model_name = data.get('best_model_name', 'GradientBoosting')
            self.metrics         = data.get('metrics', {})
            self.hotel_lookup      = data.get('hotel_lookup', {})
            self.restaurant_lookup = data.get('restaurant_lookup', {})
            self.cuisine_lookup    = data.get('cuisine_lookup', {})
            self.attraction_lookup = data.get('attraction_lookup', {})
            self.transport_lookup  = data.get('transport_lookup', {})
            self.state_to_city     = data.get('state_to_city', {})
            self.state_popularity  = data.get('state_popularity', {})
            self.best_months       = data.get('best_months', {})
            self.base_scores       = data.get('base_scores', {})
            self.threshold         = data.get('threshold', 7.5)
            self.score_map             = data.get('score_map', None)
            self.label_map             = data.get('label_map', None)
            self.state_features        = data.get('state_features', {})
            self.monthly_tourism_score = data.get('monthly_tourism_score', {})
            self.feature_names         = data.get('feature_names', [])
            version = data.get('version', '5.0')
            print(f"Model v{version} loaded | Type: {self.model_type} | Algorithm: {self.best_model_name}")
            if self.metrics:
                acc = self.metrics.get('accuracy', self.metrics.get('test_accuracy', 'N/A'))
                print(f"  Metrics: accuracy={acc}")
        except Exception as e:
            print(f"Error loading model: {e}")
            self.is_trained = False

    # Maps common city/destination names to their state
    CITY_TO_STATE = {
        'bangalore': 'Karnataka', 'bengaluru': 'Karnataka',
        'mysore': 'Karnataka', 'mysuru': 'Karnataka',
        'mumbai': 'Maharashtra', 'bombay': 'Maharashtra', 'pune': 'Maharashtra',
        'delhi': 'Delhi', 'new delhi': 'Delhi',
        'goa': 'Goa', 'panaji': 'Goa',
        'jaipur': 'Rajasthan', 'udaipur': 'Rajasthan', 'jodhpur': 'Rajasthan',
        'jaisalmer': 'Rajasthan', 'ajmer': 'Rajasthan',
        'agra': 'Uttar Pradesh', 'varanasi': 'Uttar Pradesh', 'lucknow': 'Uttar Pradesh',
        'hyderabad': 'Telangana', 'secunderabad': 'Telangana',
        'chennai': 'Tamil Nadu', 'madurai': 'Tamil Nadu', 'ooty': 'Tamil Nadu',
        'coimbatore': 'Tamil Nadu', 'trichy': 'Tamil Nadu',
        'kolkata': 'West Bengal', 'darjeeling': 'West Bengal', 'siliguri': 'West Bengal',
        'kochi': 'Kerala', 'cochin': 'Kerala', 'thiruvananthapuram': 'Kerala',
        'kozhikode': 'Kerala', 'munnar': 'Kerala', 'alleppey': 'Kerala',
        'shimla': 'Himachal Pradesh', 'manali': 'Himachal Pradesh',
        'dharamsala': 'Himachal Pradesh', 'mcleod ganj': 'Himachal Pradesh',
        'rishikesh': 'Uttarakhand', 'haridwar': 'Uttarakhand', 'dehradun': 'Uttarakhand',
        'nainital': 'Uttarakhand', 'mussoorie': 'Uttarakhand',
        'amritsar': 'Punjab', 'chandigarh': 'Punjab',
        'srinagar': 'Jammu and Kashmir', 'leh': 'Jammu and Kashmir',
        'guwahati': 'Assam', 'kaziranga': 'Assam',
        'gangtok': 'Sikkim', 'pelling': 'Sikkim',
        'shillong': 'Meghalaya', 'cherrapunji': 'Meghalaya',
        'bhubaneswar': 'Odisha', 'puri': 'Odisha',
        'visakhapatnam': 'Andhra Pradesh', 'vizag': 'Andhra Pradesh',
        'tirupati': 'Andhra Pradesh', 'vijayawada': 'Andhra Pradesh',
        'patna': 'Bihar', 'bodh gaya': 'Bihar',
        'raipur': 'Chhattisgarh', 'ahmedabad': 'Gujarat',
        'vadodara': 'Gujarat', 'surat': 'Gujarat',
        'bhopal': 'Madhya Pradesh', 'indore': 'Madhya Pradesh',
        'khajuraho': 'Madhya Pradesh', 'ujjain': 'Madhya Pradesh',
        'port blair': 'Andaman and Nicobar Islands',
        'andaman': 'Andaman and Nicobar Islands',
    }

    def _resolve_state(self, destination):
        """Resolve destination (city or state name) to state key used in lookups."""
        # First check if it's already a state name
        if destination in self.base_scores:
            return destination
        if destination in self.attraction_lookup:
            return destination
        # Try city to state mapping
        dest_lower = destination.lower().strip()
        if dest_lower in self.CITY_TO_STATE:
            return self.CITY_TO_STATE[dest_lower]
        # Try partial match
        for city, state in self.CITY_TO_STATE.items():
            if city in dest_lower or dest_lower in city:
                return state
        # Return as-is (might be a state name with different casing)
        return destination

    def _resolve_city(self, destination):
        """Get the primary city for hotel/restaurant lookup."""
        dest_lower = destination.lower().strip()
        # Direct city lookups
        city_map = {
            'bangalore': 'Bangalore', 'bengaluru': 'Bangalore',
            'mumbai': 'Mumbai', 'bombay': 'Mumbai',
            'delhi': 'Delhi', 'new delhi': 'Delhi',
            'goa': 'Goa', 'jaipur': 'Jaipur', 'udaipur': 'Udaipur',
            'agra': 'Agra', 'varanasi': 'Varanasi',
            'hyderabad': 'Hyderabad', 'chennai': 'Chennai',
            'kolkata': 'Kolkata', 'kochi': 'Kochi', 'cochin': 'Kochi',
            'shimla': 'Shimla', 'manali': 'Manali',
            'dharamsala': 'Dharamsala', 'rishikesh': 'Rishikesh',
            'amritsar': 'Amritsar', 'srinagar': 'Srinagar',
            'darjeeling': 'Darjeeling', 'gangtok': 'Gangtok',
            'shillong': 'Shillong', 'bhubaneswar': 'Bhubaneswar',
            'visakhapatnam': 'Visakhapatnam', 'vizag': 'Visakhapatnam',
            'patna': 'Patna', 'mysore': 'Mysore', 'mysuru': 'Mysore',
            'ooty': 'Ooty', 'madurai': 'Madurai',
            'jodhpur': 'Jodhpur', 'jaisalmer': 'Jaisalmer',
        }
        if dest_lower in city_map:
            return city_map[dest_lower]
        return None

    def _get_season(self, month, destination):
        state = self._resolve_state(destination)
        best = self.best_months.get(state, [10,11,12,1,2])
        if month in best: return 'peak'
        shoulder = list(set([(m%12)+1 for m in best]+[(m-2)%12+1 for m in best]))
        if month in shoulder: return 'shoulder'
        return 'off_peak'

    def _deterministic_jitter(self, destination, duration, budget, companions, month):
        """Generate a small deterministic variation so same inputs always give same score but different trips differ."""
        key = f"{destination}:{duration}:{budget}:{companions}:{month}"
        h = int(hashlib.md5(key.encode()).hexdigest()[:8], 16)
        return ((h % 100) - 50) / 200.0  # Range: -0.25 to +0.25

    def _calculate_score(self, destination, duration, budget, companions, month):
        state  = self._resolve_state(destination)
        base   = self.base_scores.get(state, self.base_scores.get(destination, 7.0))
        pop    = self.state_popularity.get(state, self.state_popularity.get(destination, 0.3))
        season = self._get_season(month, destination)
        bf  = {'budget':-0.8,'moderate':0.0,'luxury':0.8}.get(budget.lower(), 0.0)
        cf  = {'single':0.0,'couple':0.4,'family':0.2,'friends':0.3}.get(companions.lower(), 0.0)
        sf  = {'peak':0.5,'shoulder':0.0,'off_peak':-0.8}.get(season, 0.0)
        df_ = -0.5 if duration<=2 else 0.3 if duration<=5 else 0.5 if duration<=8 else 0.2
        pf  = pop * 0.3
        jitter = self._deterministic_jitter(destination, duration, budget, companions, month)
        return round(float(np.clip(base+bf+cf+sf+df_+pf+jitter, 4.0, 9.5)), 1)

    def _ml_predict(self, destination, duration, budget, companions, month):
        """Use the ML model for prediction if available and compatible."""
        if not (self.is_trained and self.model and self.scaler and self.label_encoders):
            return None
        try:
            state = self._resolve_state(destination)
            season = self._get_season(month, destination)
            le_dest = self.label_encoders.get('destination')
            le_bud  = self.label_encoders.get('budget')
            le_comp = self.label_encoders.get('companions')
            le_sea  = self.label_encoders.get('season')
            dest_enc = le_dest.transform([state])[0] if state in le_dest.classes_ else 0
            pop = float(self.state_popularity.get(state, 0.3))

            # Build feature vector based on model version
            if self.state_features and len(self.feature_names) > 7:
                # v6.0 model — 12 enriched features from all 6 datasets
                sf = self.state_features.get(state, {})
                hotel_q   = sf.get('avg_hotel_rating', 3.0)
                rest_q    = sf.get('avg_dining_rating', 3.5)
                attr_d    = sf.get('attraction_count_norm', 0.1)
                infra     = sf.get('hotel_count_norm', 0.1) * 0.2 + rest_q * 0.05
                monthly   = self.monthly_tourism_score.get(int(month), 0.5) * 0.2
                X = np.array([[dest_enc, le_bud.transform([budget.lower()])[0],
                              le_comp.transform([companions.lower()])[0],
                              le_sea.transform([season])[0],
                              int(duration), int(month), pop,
                              hotel_q, rest_q, attr_d, infra, monthly]])
            else:
                # v5.0 model — 7 basic features
                X = np.array([[dest_enc, le_bud.transform([budget.lower()])[0],
                              le_comp.transform([companions.lower()])[0],
                              le_sea.transform([season])[0],
                              int(duration), int(month), pop]])

            X_scaled = self.scaler.transform(X)
            if self.model_type == 'regression':
                return round(float(np.clip(self.model.predict(X_scaled)[0], 4.0, 9.5)), 1)
            else:
                label = self.model.predict(X_scaled)[0]
                if self.score_map:
                    return float(self.score_map.get(int(label), 7.0))
                return None
        except Exception as e:
            print(f"ML predict warning: {e}")
            return None

    def predict(self, destination, duration, budget, companions, country, month=None):
        if month is None: month = datetime.now().month
        duration = int(duration); month = int(month)
        budget_l = budget.lower(); companions_l = companions.lower()
        # Try ML regression first
        if self.model_type == 'regression':
            ml_score = self._ml_predict(destination, duration, budget_l, companions_l, month)
            if ml_score is not None:
                return ml_score
        # Fallback to formula
        return self._calculate_score(destination, duration, budget_l, companions_l, month)

    def _get_hotels(self, destination, budget):
        budget_lower = budget.lower()
        # First try direct city resolution
        direct_city = self._resolve_city(destination)
        if direct_city:
            h = self.hotel_lookup.get(direct_city, {}).get(budget_lower, [])
            if h: return h[:3]
            h = self.hotel_lookup.get(direct_city, {}).get('moderate', [])
            if h: return h[:3]
        # Then try state_to_city mapping
        state = self._resolve_state(destination)
        for city in self.state_to_city.get(state, self.state_to_city.get(destination, [destination])):
            h = self.hotel_lookup.get(city, {}).get(budget_lower, [])
            if h: return h[:3]
            h = self.hotel_lookup.get(city, {}).get('moderate', [])
            if h: return h[:3]
        return ['Check TripAdvisor or MakeMyTrip for hotels']

    def _get_restaurants(self, destination, budget):
        budget_lower = budget.lower()
        # First try direct city resolution
        direct_city = self._resolve_city(destination)
        if direct_city:
            r = self.restaurant_lookup.get(direct_city, {}).get(budget_lower, [])
            if r: return r[:3]
            r = self.restaurant_lookup.get(direct_city, {}).get('moderate', [])
            if r: return r[:3]
        # Then try state_to_city mapping
        state = self._resolve_state(destination)
        for city in self.state_to_city.get(state, self.state_to_city.get(destination, [destination])):
            r = self.restaurant_lookup.get(city, {}).get(budget_lower, [])
            if r: return r[:3]
            r = self.restaurant_lookup.get(city, {}).get('moderate', [])
            if r: return r[:3]
        return ['Try local restaurants and street food']

    def _get_attractions(self, destination, companions):
        # Try direct destination first
        att = self.attraction_lookup.get(destination, {})
        if not att:
            # Try resolving to state
            state = self._resolve_state(destination)
            att = self.attraction_lookup.get(state, {})
        if not att:
            return ['Visit local heritage sites', 'Explore natural landmarks']
        return att.get(companions.lower(), att.get('couple', []))[:5]

    def generate_recommendations(self, destination, duration, budget, companions, country, month=None):
        if month is None: month = datetime.now().month
        month    = int(month)
        duration = int(duration)
        season   = self._get_season(month, destination)
        score    = self._calculate_score(destination, duration, budget, companions, month)
        verdict  = 'Recommended' if score >= self.threshold else 'Not Recommended'

        month_names    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
        best_months_list = self.best_months.get(destination, [10,11,12,1,2])
        best_months_str  = ', '.join([month_names[m-1] for m in best_months_list])

        if season == 'peak':
            season_note = f'Great time to visit {destination}! Currently peak season.'
        elif season == 'shoulder':
            season_note = f'Good time to visit with moderate crowds.'
        else:
            season_note = f'Off-peak season. Best time to visit: {best_months_str}.'

        # Calculate confidence based on how strongly the score exceeds/falls below threshold
        score_diff = abs(score - self.threshold)
        confidence = round(min(50 + score_diff * 20, 99.0), 1)
        # If ML model has predict_proba (binary), use it
        if self.is_trained and self.model and self.model_type == 'binary_classification':
            try:
                state = self._resolve_state(destination)
                le_dest = self.label_encoders.get('destination')
                le_bud  = self.label_encoders.get('budget')
                le_comp = self.label_encoders.get('companions')
                le_sea  = self.label_encoders.get('season')
                dest_enc = le_dest.transform([state])[0] if state in le_dest.classes_ else 0
                # Build feature vector based on model version
                if self.state_features and len(self.feature_names) > 7:
                    sf = self.state_features.get(state, {})
                    hotel_q   = sf.get('avg_hotel_rating', 3.0)
                    rest_q    = sf.get('avg_dining_rating', 3.5)
                    attr_d    = sf.get('attraction_count_norm', 0.1)
                    infra     = sf.get('hotel_count_norm', 0.1) * 0.2 + rest_q * 0.05
                    monthly   = self.monthly_tourism_score.get(int(month), 0.5) * 0.2
                    X = np.array([[dest_enc, le_bud.transform([budget.lower()])[0],
                                  le_comp.transform([companions.lower()])[0],
                                  le_sea.transform([season])[0],
                                  int(duration), int(month), float(self.state_popularity.get(state, 0.3)),
                                  hotel_q, rest_q, attr_d, infra, monthly]])
                else:
                    X = np.array([[dest_enc, le_bud.transform([budget.lower()])[0],
                                  le_comp.transform([companions.lower()])[0],
                                  le_sea.transform([season])[0],
                                  int(duration), int(month), float(self.state_popularity.get(state, 0.3))]])
                proba = self.model.predict_proba(self.scaler.transform(X))[0]
                confidence = round(float(max(proba)) * 100, 1)
            except Exception as e:
                print(f"Confidence calc warning: {e}")

        # Tips
        tips = []
        if season == 'peak':
            tips.append(f'Book accommodations in advance — peak season for {destination}.')
        else:
            tips.append(f'Best time to visit is {best_months_str}.')
        if duration <= 2:
            tips.append('Plan carefully to cover key highlights in limited time.')
        if budget.lower() in ['budget','cheap']:
            tips.append('Use IRCTC trains for inter-city travel — cost effective.')
            tips.append('Government hotels (TTDC/KTDC/HPTDC) offer great value.')
        elif budget.lower() == 'luxury':
            tips.append('Book heritage hotels for a royal Indian experience.')
            tips.append('Hire a private guide for personalized cultural insights.')
        if companions.lower() == 'couple':
            tips.append('Ask hotels about honeymoon packages — many offer special amenities.')
        elif companions.lower() == 'family':
            tips.append('Check for family combo tickets at attractions.')
        elif companions.lower() == 'friends':
            tips.append('Consider renting a self-drive car for group flexibility.')
        elif companions.lower() == 'single':
            tips.append('Join group tours to meet fellow travellers.')
        tips.append('Download offline Google Maps before visiting remote areas.')
        tips.append('Emergency: 100 (Police), 108 (Ambulance), 1363 (Tourist Helpline).')

        return {
            'verdict':     verdict,
            'confidence':  confidence,
            'season':      season,
            'season_note': season_note,
            'best_months': best_months_str,
            'accommodations': self._get_hotels(destination, budget),
            'restaurants':    self._get_restaurants(destination, budget),
            'cuisines':       self.cuisine_lookup.get(
                                self.state_to_city.get(destination, [destination])[0]
                                if self.state_to_city.get(destination) else destination, []
                              )[:5],
            'attractions': self._get_attractions(destination, companions),
            'transportation': {
                'info':  self.transport_lookup.get(self._resolve_state(destination),
                         self.transport_lookup.get(destination, 'Check local transport options.')),
                'local': 'Use Ola/Uber for city travel. Hire local guide for remote areas.'
            },
            'tips': tips[:6],
        }

    def train(self, df=None):
        print("No pre-trained model found. Run the Colab notebook first.")
        print("Place trip_recommendation_model.pkl in: Aitrip/backend/models/")
        self.is_trained = False
        return {'mae':0,'r2':0,'rmse':0,'accuracy_within_1':0,'training_samples':0,'destinations_covered':0}

    def save_model(self, filepath='models/trip_recommendation_model.pkl'):
        if not self.is_trained:
            print("No trained model to save.")
            return
        os.makedirs(os.path.dirname(filepath) if os.path.dirname(filepath) else '.', exist_ok=True)
        joblib.dump({
            'model': self.model, 'scaler': self.scaler,
            'label_encoders': self.label_encoders,
            'is_trained': self.is_trained,
            'model_type': self.model_type,
            'best_model_name': self.best_model_name,
            'metrics': self.metrics,
            'hotel_lookup': self.hotel_lookup,
            'restaurant_lookup': self.restaurant_lookup,
            'cuisine_lookup': self.cuisine_lookup,
            'attraction_lookup': self.attraction_lookup,
            'transport_lookup': self.transport_lookup,
            'state_to_city': self.state_to_city,
            'state_popularity': self.state_popularity,
            'best_months': self.best_months,
            'base_scores': self.base_scores,
            'threshold': self.threshold,
            'version': '6.0',
            'score_map': self.score_map,
            'label_map': self.label_map,
        }, filepath)
        print(f"Model saved to {filepath}")


if __name__ == "__main__":
    model = TripRecommendationModel()
    model_path = os.path.join(os.path.dirname(__file__), 'trip_recommendation_model.pkl')
    if not os.path.exists(model_path):
        model_path = os.path.join(os.path.dirname(__file__), 'models', 'trip_recommendation_model.pkl')
    if os.path.exists(model_path):
        model.load_model(model_path)
        tests = [
            ('Goa',5,'moderate','couple','India',12),
            ('Rajasthan',7,'luxury','couple','India',11),
            ('Bihar',3,'budget','family','India',12),
        ]
        for dest, dur, bud, comp, country, month in tests:
            score = model.predict(dest, dur, bud, comp, country, month)
            recs  = model.generate_recommendations(dest, dur, bud, comp, country, month)
            print(f"\n{dest} ({dur}d, {bud}, {comp}) → {score}/10 [{recs['season']}] {recs['verdict']}")
            print(f"  Hotels: {recs['accommodations']}")
    else:
        print(f"Model not found at {model_path}")