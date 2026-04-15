import React from 'react';
import './ApiDocs.css';

const ENDPOINTS = [
  {
    method: 'POST',
    path: '/api/generate-trip',
    desc: 'Generates an AI travel itinerary using Gemini Pro based on specific user parameters.',
    body: '{\n  "destination": "Goa",\n  "days": 3,\n  "budget": "moderate",\n  "companions": "couple",\n  "interests": ["beaches", "food"],\n  "specificPlaces": ["Baga Beach"]\n}',
    response: '{\n  "success": true,\n  "tripPlan": "## Trip to Goa\\n...",\n  "costEstimate": 15000\n}'
  },
  {
    method: 'POST',
    path: '/predict',
    url: import.meta.env.VITE_ML_API_URL || 'https://ai-trip-backend-lari.onrender.com/predict',
    desc: 'Python ML Flask sub-API. Predicts user satisfaction out of 10 based on XGBoost model for Indian tourism.',
    body: '{\n  "Destination": "Goa",\n  "Budget": "moderate",\n  "Duration (Days)": 3,\n  "Accommodation Type": "Resort",\n  ... \n}',
    response: '{\n  "ml_score": 8.7,\n  "recommendations": { "tips": ["Carry sunscreen"] }\n}'
  },
  {
    method: 'GET',
    path: '/api/trip-history',
    desc: 'Fetches the authenticated user\'s saved trip history from Supabase.',
    body: 'None (Requires Auth Token in headers)',
    response: '{\n  "trips": [\n    { "id": "...", "destination": "...", "ml_score": 8.7 }\n  ]\n}'
  },
  {
    method: 'GET',
    path: 'https://wttr.in/:location?format=j1',
    desc: 'External Open API used for the 3-day Weather Forecaster widget.',
    body: 'None. Free unauthenticated access.',
    response: '{\n  "current_condition": [...],\n  "weather": [...]\n}'
  }
];

const ApiDocs = ({ onClose }) => {
  return (
    <div className="apid-overlay" onClick={onClose}>
      <div className="apid-modal" onClick={e => e.stopPropagation()}>
        <div className="apid-header">
          <div className="apid-title">
            <span>📚</span>
            <div>
              <h2>API Documentation</h2>
              <p>Endpoints & Integrations overview</p>
            </div>
          </div>
          <button className="apid-close" onClick={onClose}>×</button>
        </div>

        <div className="apid-body">
          <p className="apid-intro">
            AI Trip Planner uses a hybrid architecture spanning a <strong>Node.js/Express</strong> backend for generation, a <strong>Python Flask</strong> API for Machine Learning logic, and <strong>Supabase</strong> for edge data streaming.
          </p>

          <div className="apid-list">
            {ENDPOINTS.map((ep, i) => (
              <div className="apid-card" key={i}>
                <div className="apid-card-head">
                  <span className={`apid-method ${ep.method.toLowerCase()}`}>{ep.method}</span>
                  <span className="apid-path">{ep.path}</span>
                </div>
                <p className="apid-card-desc">{ep.desc}</p>
                {ep.url && <div className="apid-card-url">Base URL: {ep.url}</div>}
                <div className="apid-code-block">
                  <div className="apid-code-title">Request Body</div>
                  <pre>{ep.body}</pre>
                </div>
                <div className="apid-code-block res">
                  <div className="apid-code-title">Expected Response</div>
                  <pre>{ep.response}</pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiDocs;
