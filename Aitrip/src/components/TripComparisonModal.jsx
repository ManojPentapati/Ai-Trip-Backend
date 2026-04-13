import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './TripComparisonModal.css';

const TripComparisonModal = ({ onClose, currentTrip }) => {
  const [trips, setTrips] = useState([]);
  const [tripAId, setTripAId] = useState(currentTrip?.id || '');
  const [tripBId, setTripBId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserTrips();
  }, []);

  const loadUserTrips = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('trips')
        .select('id, destination, duration, budget, companions, created_at, ml_prediction, trip_plan')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setTrips(data || []);
      if (data?.length >= 2 && !tripAId) {
        setTripAId(data[0].id);
        setTripBId(data[1].id);
      }
    } catch(e) { console.error('Error fetching trips:', e); }
    finally { setLoading(false); }
  };

  const tripA = trips.find(t => t.id === tripAId);
  const tripB = trips.find(t => t.id === tripBId);

  return (
    <div className="tcmp-overlay" onClick={onClose}>
      <div className="tcmp-modal" onClick={e => e.stopPropagation()}>
        <div className="tcmp-header">
          <div className="tcmp-title">
            <span>⚖️</span>
            <div>
              <h2>Compare Trips</h2>
              <p>Side-by-side itinerary analysis</p>
            </div>
          </div>
          <button className="tcmp-close" onClick={onClose}>×</button>
        </div>

        {loading ? (
           <div className="tcmp-loading"><div className="tcmp-spinner"/> Loading trips...</div>
        ) : trips.length < 2 ? (
          <div className="tcmp-empty">You need at least 2 saved trips to compare.</div>
        ) : (
          <div className="tcmp-body">
            {/* Selection row */}
            <div className="tcmp-selectors">
              <select value={tripAId} onChange={e => setTripAId(e.target.value)}>
                <option value="">Select Trip A</option>
                {trips.filter(t => t.id !== tripBId).map(t => (
                  <option key={t.id} value={t.id}>{t.destination} ({t.duration} days)</option>
                ))}
              </select>
              <div className="tcmp-vs">VS</div>
              <select value={tripBId} onChange={e => setTripBId(e.target.value)}>
                <option value="">Select Trip B</option>
                {trips.filter(t => t.id !== tripAId).map(t => (
                  <option key={t.id} value={t.id}>{t.destination} ({t.duration} days)</option>
                ))}
              </select>
            </div>

            {tripA && tripB ? (
              <div className="tcmp-grid">
                <div className="tcmp-col">
                  <h3>{tripA.destination}</h3>
                  <div className="tcmp-stat"><span>🗓️ Duration:</span> <strong>{tripA.duration} days</strong></div>
                  <div className="tcmp-stat"><span>💰 Budget:</span> <strong>{tripA.budget}</strong></div>
                  <div className="tcmp-stat"><span>👥 Group:</span> <strong>{tripA.companions}</strong></div>
                  <div className="tcmp-stat"><span>🤖 ML Score:</span> <strong>{tripA.ml_prediction ? `${parseFloat(tripA.ml_prediction).toFixed(1)}/10` : 'N/A'}</strong></div>
                  <div className="tcmp-plan">
                    <h4>Overview</h4>
                    <p>{tripA.trip_plan?.substring(0, 300)}...</p>
                  </div>
                </div>

                <div className="tcmp-col">
                  <h3>{tripB.destination}</h3>
                  <div className="tcmp-stat"><span>🗓️ Duration:</span> <strong>{tripB.duration} days</strong></div>
                  <div className="tcmp-stat"><span>💰 Budget:</span> <strong>{tripB.budget}</strong></div>
                  <div className="tcmp-stat"><span>👥 Group:</span> <strong>{tripB.companions}</strong></div>
                  <div className="tcmp-stat"><span>🤖 ML Score:</span> <strong>{tripB.ml_prediction ? `${parseFloat(tripB.ml_prediction).toFixed(1)}/10` : 'N/A'}</strong></div>
                  <div className="tcmp-plan">
                    <h4>Overview</h4>
                    <p>{tripB.trip_plan?.substring(0, 300)}...</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="tcmp-empty">Please select two trips to compare.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TripComparisonModal;
