import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './Dashboard.css';
import TripPlannerModal from './TripPlannerModal';
import TripResultsWindow from './TripResultsWindow';
import TripHistory from './TripHistory';
import Favourites from './Favourites';
import Profile from './Profile';
import Settings from './Settings';
import OnboardingTour, { shouldShowOnboarding } from './OnboardingTour';
import AdminDashboard from './AdminDashboard';
import ApiDocs from './ApiDocs';
import TripComparisonModal from './TripComparisonModal';

const Dashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showProfile, setShowProfile]   = useState(false);
  const [showSettings, setShowSettings]   = useState(false);
  const [darkMode, setDarkMode]           = useState(() => localStorage.getItem('theme') !== 'light');

  const isAdmin = user?.email?.toLowerCase().includes('admin') || user?.email === 'admin@gmail.com';

  // Apply dark/light mode to whole app
  useEffect(() => {
    document.body.classList.toggle('light-mode', !darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);
  const [showTripPlanner, setShowTripPlanner] = useState(false);
  const defaultBudget = localStorage.getItem('default_budget') || 'moderate';
  const defaultCompanions = localStorage.getItem('default_companions') || 'couple';
  const [showTripResults, setShowTripResults] = useState(false);
  const [tripResultsData, setTripResultsData] = useState(null);
  const [tripMetadata, setTripMetadata] = useState({});
  const [showTripHistory, setShowTripHistory] = useState(false);
  const [showFavourites, setShowFavourites] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [favoriteTrips, setFavoriteTrips] = useState([]);
  const [favoriteTripsLoading, setFavoriteTripsLoading] = useState(true);
  const [recentTrips, setRecentTrips] = useState([]);
  const [recentTripsLoading, setRecentTripsLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState({ activeTrips: 0, destinations: 0, countries: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  useEffect(() => { if (shouldShowOnboarding()) setShowOnboarding(true); }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const saveTripToHistory = async (tripPlan, metadata) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://ai-trip-backend-1-eiwk.onrender.com'}/api/save-trip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          destination:       metadata.destination,
          duration:          metadata.duration,
          budget:            metadata.budget,
          companions:        metadata.companions,
          country:           metadata.country,
          tripPlan:          tripPlan,
          mlPrediction:      metadata.mlPrediction      || null,
          mlRecommendations: metadata.mlRecommendations || null,
        })
      });
      const result = await response.json();
      if (result.success) { fetchRecentTrips(); fetchDashboardStats(); showToast('Trip saved to history! 🗺️'); }
    } catch (error) { console.error('Error saving trip:', error); }
  };

  function handleTripPlanSubmit(resultsData, mlPrediction, mlRecommendations, metadata) {
    setTripResultsData(resultsData);
    setTripMetadata({ ...metadata, mlPrediction, mlRecommendations });
    setSelectedTrip(null);
    setShowTripPlanner(false);
    setShowTripResults(true);
    saveTripToHistory(resultsData, { ...metadata, mlPrediction, mlRecommendations });
  }

  function handleCloseTripResults() {
    setShowTripResults(false);
    setTripResultsData(null);
    setTripMetadata({});
    setSelectedTrip(null);
  }

  async function handleViewTrip(trip) {
    setSelectedTrip(trip);
    setShowTripHistory(false);
    setShowTripResults(true);

    // trip_plan can be a string or JSON object — always convert to string
    let tripPlan = trip.trip_plan;
    if (typeof tripPlan === 'object' && tripPlan !== null) {
      tripPlan = JSON.stringify(tripPlan);
    }
    setTripResultsData(tripPlan);

    // Get existing ML data from trip
    let mlPrediction      = trip.ml_prediction     || trip.mlPrediction     || null;
    let mlRecommendations = trip.ml_recommendations || trip.mlRecommendations || null;

    // If no ML data saved (old trip), fetch it fresh from ML API
    if (!mlPrediction || !mlRecommendations) {
      try {
        const mlResponse = await fetch(`${import.meta.env.VITE_ML_API_URL || 'https://ai-trip-backend-lari.onrender.com'}/predict-trip-satisfaction`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            destination: trip.destination,
            duration:    trip.duration,
            budget:      trip.budget,
            companions:  trip.companions,
            country:     trip.country || 'India',
          })
        });
        if (mlResponse.ok) {
          const mlData      = await mlResponse.json();
          mlPrediction      = mlData.predicted_satisfaction;
          mlRecommendations = mlData.recommendations;
        }
      } catch (e) {
        console.log('ML API not available for old trip:', e.message);
      }
    }

    setTripMetadata({
      destination:       trip.destination,
      duration:          trip.duration,
      budget:            trip.budget,
      companions:        trip.companions,
      mlPrediction,
      mlRecommendations,
    });
  }

  const fetchDashboardStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://ai-trip-backend-1-eiwk.onrender.com'}/api/dashboard-stats`, { headers: { 'Authorization': `Bearer ${token}` } });
      const result = await response.json();
      if (result.success) setDashboardStats(result.data);
    } catch (error) { console.error('Error fetching stats:', error); }
    finally { setStatsLoading(false); }
  };

  const fetchRecentTrips = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://ai-trip-backend-1-eiwk.onrender.com'}/api/recent-trips`, { headers: { 'Authorization': `Bearer ${token}` } });
      const result = await response.json();
      if (result.success) setRecentTrips(result.data);
    } catch (error) { console.error('Error fetching recent trips:', error); }
    finally { setRecentTripsLoading(false); }
  };

  const fetchFavoriteTrips = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://ai-trip-backend-1-eiwk.onrender.com'}/api/favorite-trips`, { headers: { 'Authorization': `Bearer ${token}` } });
      const result = await response.json();
      if (result.success) setFavoriteTrips(result.data);
    } catch (error) { console.error('Error fetching favorites:', error); }
    finally { setFavoriteTripsLoading(false); }
  };

  const toggleFavoriteTrip = async (tripId, isFavorite) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const method = isFavorite ? 'DELETE' : 'POST';
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://ai-trip-backend-1-eiwk.onrender.com'}/api/trip-history/${tripId}/favorite`, {
        method, headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        fetchFavoriteTrips(); fetchRecentTrips();
        setSelectedTrip(prev => prev?.id === tripId ? { ...prev, is_favorite: !isFavorite } : prev);
        showToast(isFavorite ? 'Removed from favourites' : 'Added to favourites ⭐');
      }
    } catch (error) { console.error('Error toggling favorite:', error); }
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', user?.id).maybeSingle();
        if (data) setUserData(data);
        else setUserData({ first_name: user?.email?.split('@')[0] || 'User', email: user?.email, avatar_url: null });
      } catch {
        setUserData({ first_name: user?.email?.split('@')[0] || 'User', email: user?.email, avatar_url: null });
      } finally { setLoading(false); }
    };
    if (user) {
      // Wait for active session before firing authenticated requests
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.access_token) {
          fetchUserProfile();
          fetchDashboardStats();
          fetchRecentTrips();
          fetchFavoriteTrips();
        } else {
          // Retry once after short delay for session propagation
          setTimeout(() => {
            fetchUserProfile();
            fetchDashboardStats();
            fetchRecentTrips();
            fetchFavoriteTrips();
          }, 800);
        }
      });
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.profile-dropdown-wrapper')) setProfileDropdownOpen(false);
      if (!e.target.closest('.mobile-nav')) setMobileMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle session expiry
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        if (event === 'SIGNED_OUT') {
          showToast('Session expired. Please sign in again.', 'error');
          setTimeout(() => { onLogout(); navigate('/login'); }, 2000);
        }
      }
    });
    return () => subscription?.unsubscribe();
  }, []);

  const handleLogout = () => { onLogout(); navigate('/login'); };

  const refreshDashboardData = () => {
    fetchRecentTrips();
    fetchFavoriteTrips();
    fetchDashboardStats();
  };

  const budgetColors = { cheap: '#5CB87A', budget: '#5CB87A', moderate: '#C9A84C', luxury: '#E8A94C' };
  const companionIcons = { single: '👤', couple: '💑', family: '👨‍👩‍👧‍👦', friends: '👥' };
  const budgetIcons = { cheap: '💵', budget: '💵', moderate: '💳', luxury: '💎' };

  const filteredRecent = recentTrips.filter(t =>
    t.destination?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredFavorites = favoriteTrips.filter(t =>
    t.destination?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const getInitialColor = (name) => {
    const colors = ['#C9A84C', '#5CB87A', '#E05C5C', '#5B8FE8', '#A87CDC', '#E8874C'];
    const idx = (name?.charCodeAt(0) || 0) % colors.length;
    return colors[idx];
  };

  if (loading) {
    return (
      <div className="db-container">
        <div className="db-loading">
          <div className="db-spinner" />
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const displayName = userData?.first_name || user?.email?.split('@')[0] || 'Traveler';
  const avatarInitial = displayName.charAt(0).toUpperCase();
  const avatarBg = userData?.avatar_color
    ? `linear-gradient(135deg, ${userData.avatar_color}, #111110)`
    : `linear-gradient(135deg, ${getInitialColor(displayName)}, #111110)`;
  const activeTrips = activeTab === 'recent' ? filteredRecent : filteredFavorites;
  const isLoading = activeTab === 'recent' ? recentTripsLoading : favoriteTripsLoading;

  return (
    <div className="db-container">
      {/* Onboarding Tour — shown only on first visit */}
      {showOnboarding && <OnboardingTour onComplete={() => setShowOnboarding(false)} />}


      {/* ── Navbar ── */}
      <nav className="db-navbar">
        <div className="db-nav-left">
          <div className="db-brand">
            <div className="db-brand-icon">✈</div>
            <span className="db-brand-name">AI<span>Trip</span></span>
          </div>
        </div>

        <div className="db-nav-center">
          <button className="db-nav-btn gold" onClick={() => setShowTripPlanner(true)}>
            <span>🗺️</span> Plan a Trip
          </button>
          <button className="db-nav-btn ghost" onClick={() => setShowTripHistory(true)}>
            <span>🕒</span> Trip History
          </button>
          <button className="db-nav-btn ghost" onClick={() => setShowFavourites(true)}>
            <span>⭐</span> Favourites
          </button>
        </div>

        <div className="db-nav-right">
          <div className="profile-dropdown-wrapper">
            <button className="db-profile-btn" onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}>
              <div className="db-avatar" style={{ background: avatarBg }}>
                {avatarInitial}
              </div>
              <div className="db-profile-info">
                <span className="db-profile-name">{displayName}</span>
                <span className="db-profile-role">Traveler</span>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.5, transform: profileDropdownOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </button>

            {profileDropdownOpen && (
              <div className="db-dropdown">
                {/* Header: avatar + username */}
                <div className="db-dropdown-header">
                  <div className="db-avatar sm" style={{ background: avatarBg }}>
                    {avatarInitial}
                  </div>
                  <p className="dd-name">{displayName}</p>
                </div>
                <div className="db-dropdown-divider" />
                <button className="db-dropdown-item" onClick={() => { setProfileDropdownOpen(false); setShowProfile(true); }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                  Profile
                </button>
                <button className="db-dropdown-item" onClick={() => { setProfileDropdownOpen(false); setShowSettings(true); }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" /></svg>
                  Settings
                </button>
                <div className="db-dropdown-divider" />
                {isAdmin && (
                  <>
                    <button className="db-dropdown-item" onClick={() => { setProfileDropdownOpen(false); setShowAdmin(true); }}>
                      🛡️ Admin Dashboard
                    </button>
                    <button className="db-dropdown-item" onClick={() => { setProfileDropdownOpen(false); setShowDocs(true); }}>
                      📚 API Docs
                    </button>
                  </>
                )}
                <button className="db-dropdown-item" onClick={() => { setProfileDropdownOpen(false); setShowCompare(true); }}>
                  ⚖️ Compare Trips
                </button>
                <button className="db-dropdown-item" onClick={() => { setProfileDropdownOpen(false); localStorage.removeItem('onboarding_done'); setShowOnboarding(true); }}>
                  🎓 Restart Tour
                </button>
                <div className="db-dropdown-divider" />
                <button className="db-dropdown-item danger" onClick={handleLogout}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" /></svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── Toast ── */}
      {toast && (
        <div className={`db-toast ${toast.type}`}>
          {toast.type === 'success' ? '✓' : '⚠'} {toast.msg}
        </div>
      )}

      {/* ── Main ── */}
      <main className="db-main">

        {/* Hero Section */}
        <section className="db-hero">
          <div className="db-hero-content">
            <div className="db-hero-badge">
              <span className="db-badge-dot" />
              <span>AI-Powered Planning</span>
            </div>
            <h1 className="db-hero-title">
              {getGreeting()},<br />
              <span className="db-hero-name">{displayName}.</span>
            </h1>
            <p className="db-hero-sub">Ready to plan your next adventure? Let AI craft the perfect itinerary for you.</p>
            <div className="db-hero-actions">
              <button className="db-btn-primary" onClick={() => setShowTripPlanner(true)}>
                <span>✈️</span> Plan New Trip
              </button>
              <button className="db-btn-ghost" onClick={() => setShowTripHistory(true)}>
                <span>📅</span> View All Trips
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="db-stats-row">
            {statsLoading ? (
              [1,2,3,4].map(i => (
                <div key={i} className="db-stat-card">
                  <div className="db-skel-line w40" style={{height:'32px',borderRadius:'8px',marginBottom:'8px'}} />
                  <div className="db-skel-line w70" style={{height:'12px',borderRadius:'4px',marginBottom:'4px'}} />
                  <div className="db-skel-line w50" style={{height:'10px',borderRadius:'4px'}} />
                </div>
              ))
            ) : (
              [
                { label: 'Total Trips',  value: dashboardStats.activeTrips || 0, icon: '🗺️', desc: 'Trips planned' },
                { label: 'Destinations', value: dashboardStats.destinations || 0, icon: '📍', desc: 'Places explored' },
                { label: 'Countries',    value: dashboardStats.countries    || 0, icon: '🌍', desc: 'Countries visited' },
                { label: 'Favourites',   value: favoriteTrips.length        || 0, icon: '⭐', desc: 'Saved trips' },
              ].map((stat, i) => (
                <div className="db-stat-card" key={i}>
                  <div className="db-stat-icon">{stat.icon}</div>
                  <div className="db-stat-info">
                    <span className="db-stat-value">{stat.value}</span>
                    <span className="db-stat-label">{stat.label}</span>
                    <span className="db-stat-desc">{stat.desc}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ── Trips Section ── */}
        <section className="db-trips-section" id="trips-section">

          {/* Section header */}
          <div className="db-section-head">
            <div className="db-tabs">
              <button className={`db-tab ${activeTab === 'recent' ? 'active' : ''}`} onClick={() => setActiveTab('recent')}>
                ✈️ Recent Trips
                <span className="db-tab-count">{recentTrips.length}</span>
              </button>
              <button className={`db-tab ${activeTab === 'favorite' ? 'active' : ''}`} onClick={() => setActiveTab('favorite')}>
                ⭐ Favourites
                <span className="db-tab-count">{favoriteTrips.length}</span>
              </button>
            </div>

            <div className="db-search-box">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="db-search-icon">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
              <input
                type="text"
                placeholder="Search destinations..."
                className="db-search-input"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Trip Cards */}
          <div className="db-trips-grid">
            {isLoading ? (
              <>
                {[1,2,3].map(i => (
                  <div key={i} className="db-skeleton-card">
                    <div className="db-skel-top" />
                    <div className="db-skel-body">
                      <div className="db-skel-line w70" />
                      <div className="db-skel-line w40" />
                      <div className="db-skel-tags">
                        <div className="db-skel-tag" />
                        <div className="db-skel-tag" />
                        <div className="db-skel-tag" />
                      </div>
                      <div className="db-skel-line w50" />
                      <div className="db-skel-btn" />
                    </div>
                  </div>
                ))}
              </>
            ) : activeTrips.length > 0 ? (
              [...activeTrips].sort((a,b) => (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0)).map(trip => (
                <div key={trip.id} className="db-trip-card">
                  {/* Card top accent */}
                  <div className="db-trip-card-top" style={{ background: `linear-gradient(135deg, ${getInitialColor(trip.destination)}, #111110)` }}>
                    <div className="db-trip-initial">{trip.destination?.charAt(0)?.toUpperCase()}</div>
                    {trip.is_favorite && <div className="db-trip-fav-badge">⭐</div>}
                  </div>

                  <div className="db-trip-body">
                    <div className="db-trip-head">
                      <h3 className="db-trip-dest">{trip.destination}</h3>
                      {trip.country && <span className="db-trip-country">🌍 {trip.country}</span>}
                    </div>

                    <div className="db-trip-meta">
                      <span className="db-meta-tag">
                        📅 {trip.duration} days
                      </span>
                      <span className="db-meta-tag" style={{ color: budgetColors[trip.budget] || '#C9A84C' }}>
                        {budgetIcons[trip.budget] || '💰'} {trip.budget}
                      </span>
                      <span className="db-meta-tag">
                        {companionIcons[trip.companions] || '👤'} {trip.companions}
                      </span>
                    </div>

                    {trip.created_at && (
                      <p className="db-trip-date">Planned on {formatDate(trip.created_at)}</p>
                    )}

                    <div className="db-trip-actions">
                      <button className="db-trip-btn primary" onClick={() => handleViewTrip(trip)}>
                        View Trip
                      </button>
                      <button
                        className={`db-trip-btn icon ${trip.is_favorite ? 'fav-on' : ''}`}
                        title={trip.is_favorite ? 'Remove from Favourites' : 'Add to Favourites'}
                        onClick={() => toggleFavoriteTrip(trip.id, trip.is_favorite)}
                      >
                        {trip.is_favorite ? '⭐' : '☆'}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="db-empty-state">
                <div className="db-empty-illustration">
                  {activeTab === 'recent' ? (
                    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                      <circle cx="60" cy="60" r="56" fill="rgba(201,168,76,0.08)" stroke="rgba(201,168,76,0.2)" strokeWidth="1.5"/>
                      <text x="60" y="72" textAnchor="middle" fontSize="44">🗺️</text>
                    </svg>
                  ) : (
                    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                      <circle cx="60" cy="60" r="56" fill="rgba(201,168,76,0.08)" stroke="rgba(201,168,76,0.2)" strokeWidth="1.5"/>
                      <text x="60" y="72" textAnchor="middle" fontSize="44">⭐</text>
                    </svg>
                  )}
                </div>
                <h3>{activeTab === 'recent' ? 'No trips planned yet' : 'No favourite trips yet'}</h3>
                <p>{activeTab === 'recent' ? 'Start planning your first adventure with AI — personalized just for you.' : 'Star any trip to save it here for quick access.'}</p>
                {activeTab === 'recent' && (
                  <button className="db-btn-primary" style={{marginTop:'0.5rem'}} onClick={() => setShowTripPlanner(true)}>
                    ✈️ Plan Your First Trip
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ── Quick Actions ── */}
        <section className="db-quick-section">
          <h2 className="db-section-title">Quick Actions</h2>
          <div className="db-quick-grid">
            {[
              { icon: '🗺️', title: 'Plan New Trip', desc: 'Generate a full AI itinerary', action: () => setShowTripPlanner(true), gold: true },
              { icon: '🕒', title: 'Trip History', desc: 'Browse all your past plans', action: () => setShowTripHistory(true) },
              { icon: '⭐', title: 'Favourites', desc: 'View your saved favourites', action: () => setActiveTab('favorite') },
              { icon: '🚀', title: 'Restart Tour', desc: 'View the interactive app tour again', action: () => { localStorage.removeItem('onboarding_done'); window.location.reload(); } },
              { icon: '📊', title: 'Destinations', desc: `${dashboardStats.destinations} unique places explored`, action: null },
            ].map((item, i) => (
              <button key={i} className={`db-quick-card ${item.gold ? 'gold' : ''}`} onClick={item.action || undefined} disabled={!item.action}>
                <div className="db-quick-icon">{item.icon}</div>
                <div className="db-quick-info">
                  <span className="db-quick-title">{item.title}</span>
                  <span className="db-quick-desc">{item.desc}</span>
                </div>
                {item.action && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="db-quick-arrow">
                    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="db-footer">
        <div className="db-footer-glow" />

        <div className="db-footer-top">
          <div className="db-footer-brand">
            <div className="db-brand">
              <div className="db-brand-icon sm">✈</div>
              <span className="db-brand-name">AI<span>Trip</span></span>
            </div>
            <p className="db-footer-tagline">Intelligent travel planning powered by machine learning and real Indian tourism data.</p>
            <div className="db-footer-tech-pills">
              {['React', 'Node.js', 'Flask', 'XGBoost', 'Gemini AI', 'Supabase'].map((tech, i) => (
                <span key={i} className="db-tech-pill">{tech}</span>
              ))}
            </div>
          </div>

          <div className="db-footer-col">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#" onClick={e => { e.preventDefault(); setShowTripPlanner(true); }}>Plan a Trip</a></li>
              <li><a href="#" onClick={e => { e.preventDefault(); setShowTripHistory(true); }}>Trip History</a></li>
              <li><a href="#" onClick={e => { e.preventDefault(); setShowFavourites(true); }}>Favourites</a></li>
              <li><a href="#" onClick={e => { e.preventDefault(); setShowProfile(true); }}>My Profile</a></li>
              <li><a href="#" onClick={e => { e.preventDefault(); setShowSettings(true); }}>Settings</a></li>
            </ul>
          </div>

          <div className="db-footer-col">
            <h4>Features</h4>
            <ul>
              <li><a href="#">AI Itineraries</a></li>
              <li><a href="#">ML Trip Scoring</a></li>
              <li><a href="#">PDF Export</a></li>
              <li><a href="#">Smart Favorites</a></li>
            </ul>
          </div>

          <div className="db-footer-col">
            <h4>Project</h4>
            <ul>
              <li><a href="https://vignan.ac.in" target="_blank" rel="noopener noreferrer">Vignan University</a></li>
              <li><a href="#">B.Tech CSE (DS)</a></li>
              <li><a href="/terms">Terms & Privacy</a></li>
            </ul>
            <p className="db-footer-credit">🎓 Final Year Project</p>
          </div>
        </div>

        <div className="db-footer-divider">
          <div className="db-footer-divider-line" />
        </div>

        <div className="db-footer-bottom">
          <p>© {new Date().getFullYear()} AI Trip Planner · Vignan University</p>
          <span className="db-footer-made">Made with <span className="db-heart">❤</span> in India</span>
          <div className="db-social-links">
            {[
              { name: 'Facebook', path: 'M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12z' },
              { name: 'Twitter', path: 'M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84' },
              { name: 'LinkedIn', path: 'M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z' },
              { name: 'Instagram', path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.667-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z' }
            ].map((s, i) => (
              <a key={i} href="#" aria-label={s.name} className="db-social-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d={s.path} />
                </svg>
              </a>
            ))}
          </div>
        </div>
      </footer>

      {/* ── Modals ── */}
      <TripPlannerModal
        isOpen={showTripPlanner}
        onClose={() => setShowTripPlanner(false)}
        defaultBudget={defaultBudget}
        defaultCompanions={defaultCompanions}
        onSubmit={(resultsData, mlPrediction, mlRecommendations, metadata) => handleTripPlanSubmit(resultsData, mlPrediction, mlRecommendations, metadata)}
      />
      {showTripResults && tripResultsData && (
        <TripResultsWindow
          tripData={tripResultsData}
          mlPrediction={tripMetadata.mlPrediction}
          mlRecommendations={tripMetadata.mlRecommendations}
          destination={tripMetadata.destination}
          duration={tripMetadata.duration}
          budget={tripMetadata.budget}
          companions={tripMetadata.companions}
          tripId={selectedTrip?.id}
          isFavorite={selectedTrip?.is_favorite || false}
          onToggleFavorite={selectedTrip?.id ? () => toggleFavoriteTrip(selectedTrip.id, selectedTrip?.is_favorite) : null}
          onClose={handleCloseTripResults}
          onTripDeleted={refreshDashboardData}
        />
      )}
      {showTripHistory && (
        <TripHistory userId={user.id} onClose={() => setShowTripHistory(false)} onViewTrip={handleViewTrip} onTripDeleted={refreshDashboardData} />
      )}
      {showFavourites && (
        <Favourites userId={user.id} onClose={() => setShowFavourites(false)} onViewTrip={handleViewTrip} />
      )}
      {showProfile && (
        <Profile
          user={user}
          onClose={() => setShowProfile(false)}
          onProfileUpdate={(data) => {
            setUserData(prev => ({
              ...prev,
              first_name:   data.firstName,
              last_name:    data.lastName,
              avatar_color: data.avatarColor,
            }));
          }}
        />
      )}
      {showSettings && (
        <Settings
          user={user}
          onClose={() => setShowSettings(false)}
          onLogout={handleLogout}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(d => !d)}
        />
      )}

      {/* Admin Dashboard */}
      {showAdmin && <AdminDashboard onClose={() => setShowAdmin(false)} />}
      
      {/* API Docs */}
      {showDocs && <ApiDocs onClose={() => setShowDocs(false)} />}
      
      {/* Trip Comparison */}
      {showCompare && <TripComparisonModal onClose={() => setShowCompare(false)} currentTrip={selectedTrip} />}
    </div>
  );
};

export default Dashboard;