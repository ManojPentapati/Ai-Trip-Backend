import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './TripHistory.css'; // Reuse TripHistory styles

const Favourites = ({ userId, onClose, onViewTrip }) => {
  const [trips, setTrips]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  useEffect(() => { fetchFavourites(); }, []);

  // ── Fetch only favourite trips ──────────────────────────────────────────
  const fetchFavourites = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('No active session');

      const response = await fetch('http://localhost:3001/api/trip-history', {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();

      if (result.success) {
        const favourites = (result.data || [])
          .filter(t => t.is_favorite)
          .map(trip => ({
            ...trip,
            ml_recommendations: trip.ml_recommendations
              ? (typeof trip.ml_recommendations === 'string'
                  ? (() => { try { return JSON.parse(trip.ml_recommendations); } catch { return null; } })()
                  : trip.ml_recommendations)
              : null,
          }));
        setTrips(favourites);
      } else {
        throw new Error(result.error || 'Failed to load favourites');
      }
    } catch (err) {
      setError('Failed to load favourites');
    } finally {
      setLoading(false);
    }
  };

  // ── View trip — close modal first so TripResultsWindow is visible ───────
  const handleViewTrip = (trip) => {
    const fullTrip = {
      ...trip,
      ml_recommendations: trip.ml_recommendations
        ? (typeof trip.ml_recommendations === 'string'
            ? (() => { try { return JSON.parse(trip.ml_recommendations); } catch { return null; } })()
            : trip.ml_recommendations)
        : null,
      ml_prediction: trip.ml_prediction || null,
    };
    onClose();          // close Favourites first
    onViewTrip(fullTrip); // then open the trip
  };

  // ── Helpers ─────────────────────────────────────────────────────────────
  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  const formatTime = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const getInitialColor = (name) => {
    const colors = ['#C9A84C', '#5CB87A', '#E05C5C', '#5B8FE8', '#A87CDC', '#E8874C'];
    return colors[(name?.charCodeAt(0) || 0) % colors.length];
  };

  const budgetIcons    = { cheap: '💵', budget: '💵', moderate: '💳', luxury: '💎' };
  const companionIcons = { single: '👤', couple: '💑', family: '👨‍👩‍👧‍👦', friends: '👥' };

  // ── Filter + Paginate ────────────────────────────────────────────────────
  const filtered = trips.filter(t =>
    t.destination?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalPages    = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated     = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="th-overlay" onClick={onClose}>
      <div className="th-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="th-header">
          <div className="th-header-left">
            <div className="th-header-icon">⭐</div>
            <div>
              <h2 className="th-title">Favourites</h2>
              <p className="th-subtitle">
                {loading ? 'Loading...' : `${trips.length} saved trip${trips.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <button className="th-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Search — only when trips exist */}
        {!loading && !error && trips.length > 0 && (
          <div className="th-filters">
            <div className="th-search-wrap">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="th-search-icon">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
              <input
                type="text"
                placeholder="Search favourites..."
                className="th-search"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="th-content">

          {/* Loading */}
          {loading && (
            <div className="th-state">
              <div className="th-spinner" />
              <p>Loading your favourites...</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="th-state">
              <div className="th-state-icon">⚠️</div>
              <h3>Something went wrong</h3>
              <p>{error}</p>
              <button className="th-retry-btn" onClick={fetchFavourites}>Try Again</button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && trips.length === 0 && (
            <div className="th-state">
              <div className="th-state-icon">⭐</div>
              <h3>No favourites yet</h3>
              <p>Open any trip and tap the ☆ star icon to save it here as a favourite!</p>
            </div>
          )}

          {/* No search results */}
          {!loading && !error && trips.length > 0 && filtered.length === 0 && (
            <div className="th-state">
              <div className="th-state-icon">🔍</div>
              <h3>No results found</h3>
              <p>Try a different search term.</p>
            </div>
          )}

          {/* Trip list */}
          {!loading && !error && filtered.length > 0 && (
            <div className="th-list">
              {paginated.map((trip, idx) => (
                <div key={trip.id} className="th-card" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <div className="th-card-accent" style={{ background: getInitialColor(trip.destination) }} />

                  <div className="th-card-avatar"
                    style={{ background: `linear-gradient(135deg, ${getInitialColor(trip.destination)}, #111110)` }}>
                    {trip.destination?.charAt(0)?.toUpperCase()}
                  </div>

                  <div className="th-card-info">
                    <div className="th-card-top">
                      <div>
                        <h3 className="th-card-dest">{trip.destination}</h3>
                        {trip.country && <span className="th-card-country">🌍 {trip.country}</span>}
                      </div>
                      <div className="th-card-datetime">
                        <span>{formatDate(trip.created_at)}</span>
                        <span className="th-card-time">{formatTime(trip.created_at)}</span>
                      </div>
                    </div>
                    <div className="th-card-tags">
                      <span className="th-tag duration">📅 {trip.duration} days</span>
                      <span className="th-tag budget">{budgetIcons[trip.budget] || '💰'} {trip.budget}</span>
                      <span className="th-tag companions">{companionIcons[trip.companions] || '👤'} {trip.companions}</span>
                      <span className="th-tag fav">⭐ Favourite</span>
                      {trip.ml_prediction && (
                        <span className="th-tag ml-score">🤖 {trip.ml_prediction}/10</span>
                      )}
                    </div>
                  </div>

                  <div className="th-card-actions">
                    <button className="th-view-btn" onClick={() => handleViewTrip(trip)}>
                      View Trip
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="th-pagination">
              <button className="th-page-btn" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>← Prev</button>
              <div className="th-page-nums">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button key={page} className={`th-page-num ${currentPage === page ? 'active' : ''}`} onClick={() => setCurrentPage(page)}>{page}</button>
                ))}
              </div>
              <button className="th-page-btn" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next →</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Favourites;
