import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSharedTrip } from '../utils/tripSharing';
import './SharedTrip.css';

const SharedTrip = () => {
  const { tripId } = useParams();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const result = await getSharedTrip(tripId);
        if (result.success) {
          setTrip(result.data);
        } else {
          setError(result.error || 'Trip not found');
        }
} catch {
    setError('Failed to load shared trip');
  } finally {
        setLoading(false);
      }
    };
    fetchTrip();
  }, [tripId]);

  if (loading) {
    return (
      <div className="st-loading">
        <div className="st-spinner" />
        <p>Loading trip…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="st-error">
        <h2>Trip Not Available</h2>
        <p>{error}</p>
        <Link to="/login" className="st-cta">Create Your Own Trip</Link>
      </div>
    );
  }

  return (
    <div className="st-container">
      <div className="st-header">
        <h1>Shared Trip</h1>
        <Link to="/login" className="st-cta">Plan Your Own</Link>
      </div>
      
      <div className="st-card">
        <div className="st-destination">
          <h2>{trip.destination}</h2>
          <span>{trip.country}</span>
        </div>
        
        <div className="st-meta">
          <div className="st-meta-item">
            <span>📅</span>
            <strong>{trip.duration} days</strong>
          </div>
          <div className="st-meta-item">
            <span>💰</span>
            <strong>{trip.budget}</strong>
          </div>
          <div className="st-meta-item">
            <span>👥</span>
            <strong>{trip.companions}</strong>
          </div>
        </div>

        {trip.ml_prediction && (
          <div className="st-score">
            <span>ML Score:</span>
            <strong>{trip.ml_prediction}</strong>
          </div>
        )}
      </div>

      <div className="st-plan">
        <h3>Itinerary</h3>
        <pre>{trip.trip_plan}</pre>
      </div>
    </div>
  );
};

export default SharedTrip;