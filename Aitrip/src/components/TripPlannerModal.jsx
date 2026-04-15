import React, { useState } from 'react';
import './TripPlannerModal.css';
import axios from 'axios';
import { searchDestinations } from '../utils/destinations';

const TripPlannerModal = ({ isOpen, onClose, onSubmit, defaultBudget = 'moderate', defaultCompanions = 'couple' }) => {
  const [formData, setFormData] = useState({
    destination: '',
    duration: '',
    budget: defaultBudget,
    companions: defaultCompanions,
    country: ''
  });
  const [interests, setInterests] = useState([]);
  const [customBudget, setCustomBudget] = useState({ min: '', max: '' });
  const [specificPlaces, setSpecificPlaces] = useState([]);
  const [placeInput, setPlaceInput] = useState('');
  const [showPlaces, setShowPlaces] = useState(false);
  const [destSuggestions, setDestSuggestions] = useState([]);

  const MAX_PLACES = 6;
  const addPlace = (val) => {
    const trimmed = val.trim().replace(/,+$/, '');
    if (!trimmed) { setPlaceInput(''); return; }
    if (specificPlaces.length >= MAX_PLACES) { setPlaceInput(''); return; }
    if (!specificPlaces.map(p => p.toLowerCase()).includes(trimmed.toLowerCase())) {
      setSpecificPlaces(prev => [...prev, trimmed]);
    }
    setPlaceInput('');
  };
  const removePlace = (p) => setSpecificPlaces(prev => prev.filter(x => x !== p));
  const handlePlaceKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addPlace(placeInput); }
    if (e.key === ',') { e.preventDefault(); addPlace(placeInput); }
    if (e.key === 'Backspace' && !placeInput && specificPlaces.length > 0) {
      setSpecificPlaces(prev => prev.slice(0, -1));
    }
  };

  const interestOptions = [
    { value: 'adventure', label: 'Adventure', icon: '🏔️' },
    { value: 'food', label: 'Food & Cuisine', icon: '🍜' },
    { value: 'nature', label: 'Nature', icon: '🌿' },
    { value: 'history', label: 'History & Culture', icon: '🏛️' },
    { value: 'religious', label: 'Religious/Spiritual', icon: '🛕' },
    { value: 'beaches', label: 'Beaches', icon: '🏖️' },
    { value: 'nightlife', label: 'Nightlife', icon: '🌃' },
    { value: 'shopping', label: 'Shopping', icon: '🛍️' },
    { value: 'photography', label: 'Photography', icon: '📸' },
    { value: 'wellness', label: 'Wellness & Spa', icon: '🧘' },
  ];

  const toggleInterest = (val) => {
    setInterests(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };
  const [confirmClose, setConfirmClose] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingStep, setLoadingStep] = useState(0);

  const loadingSteps = [
    '🤖 Analysing your preferences...',
    '🗺️ Building your itinerary...',
    '🏨 Finding accommodations...',
    '🍽️ Sourcing dining spots...',
    '💡 Adding local tips...',
    '✨ Finalising your trip plan...',
  ];

  React.useEffect(() => {
    let interval;
    if (isLoading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep(s => (s + 1) % loadingSteps.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL || 'https://ai-trip-backend-1-eiwk.onrender.com'}/api/generate-trip`, {
        ...formData,
        budget: getEffectiveBudget(),
        interests,
        specificPlaces
      });
      if (response.data.success) {
        onSubmit(response.data.tripPlan, response.data.mlPrediction, response.data.recommendations, response.data.metadata);
        // Reset form
        setFormData({ destination: '', duration: '', budget: '', companions: '', country: '' });
        setInterests([]);
        setSpecificPlaces([]);
        setPlaceInput('');
        setShowPlaces(false);
      } else {
        setError(response.data.error || 'Failed to generate trip plan');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred while generating the trip plan');
    } finally {
      setIsLoading(false);
    }
  };

  const budgetRangeError = formData.budget === 'custom' && customBudget.min && customBudget.max
    && parseInt(customBudget.min) >= parseInt(customBudget.max)
    ? 'Min must be less than Max' : null;

  const isFormValid = formData.destination && formData.duration && formData.companions && formData.country &&
    (formData.budget && formData.budget !== 'custom' || (formData.budget === 'custom' && customBudget.min && customBudget.max && !budgetRangeError));

  const getEffectiveBudget = () => {
    if (formData.budget === 'custom' && customBudget.min && customBudget.max)
      return `custom (\u20b9${customBudget.min}\u2013\u20b9${customBudget.max}/day)`;
    return formData.budget;
  };

  const filledCount = [formData.destination, formData.duration, formData.budget, formData.companions, formData.country].filter(Boolean).length;
  const progress = (filledCount / 5) * 100;

  const isDirty = formData.destination || formData.duration || formData.country;

  const handleClose = () => {
    if (isDirty && !isLoading) {
      setConfirmClose(true);
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="tpm-overlay" onClick={handleClose}>
      <div className="tpm-modal" onClick={e => e.stopPropagation()}>

        {/* ── Left panel ── */}
        <div className="tpm-left">
          <div className="tpm-left-content">
            <div className="tpm-left-badge">
              <span className="tpm-badge-dot" />
              AI-Powered
            </div>
            <h2 className="tpm-left-title">
              Plan your<br />perfect<br /><span>adventure.</span>
            </h2>
            <p className="tpm-left-sub">
              Fill in your preferences and our AI will craft a full personalised itinerary — day by day.
            </p>

            <div className="tpm-left-features">
              {[
                { icon: '🗺️', text: 'Day-by-day itinerary' },
                { icon: '🏨', text: 'Hotel recommendations' },
                { icon: '🍽️', text: 'Dining suggestions' },
                { icon: '📊', text: 'Satisfaction prediction' },
              ].map((f, i) => (
                <div className="tpm-feature" key={i}>
                  <span className="tpm-feature-icon">{f.icon}</span>
                  <span>{f.text}</span>
                </div>
              ))}
            </div>

            {/* Progress */}
            <div className="tpm-progress-wrap">
              <div className="tpm-progress-label">
                <span>Form completion</span>
                <span className="tpm-progress-pct">{Math.round(progress)}%</span>
              </div>
              <div className="tpm-progress-bar">
                <div className="tpm-progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>

          {/* Big background letter */}
          <div className="tpm-bg-letter">✈</div>
        </div>

        {/* ── Right panel (form) ── */}
        <div className="tpm-right">
          <div className="tpm-right-header">
            <h3>Trip Preferences</h3>
            <p>Tell us where you want to go</p>
          </div>

          {error && <div className="tpm-error">{error}</div>}

          <form className="tpm-form" onSubmit={handleSubmit}>

            {/* Destination + Country row */}
            <div className="tpm-row">
              <div className="tpm-field" style={{position:'relative'}}>
                <label className="tpm-label">
                  <span className="tpm-label-icon">📍</span> Destination
                </label>
                <div className="tpm-input-wrap">
                  <input
                    type="text"
                    name="destination"
                    value={formData.destination}
                    onChange={e => {
                      handleInputChange(e);
                      setDestSuggestions(searchDestinations(e.target.value));
                    }}
                    onBlur={() => setTimeout(() => setDestSuggestions([]), 200)}
                    placeholder="e.g. Goa, Vizag, Paris..."
                    className={`tpm-input ${formData.destination ? 'filled' : ''}`}
                    disabled={isLoading}
                    autoComplete="off"
                    required
                  />
                  {formData.destination && <span className="tpm-check">✓</span>}
                </div>
                {destSuggestions.length > 0 && (
                  <ul className="tpm-suggestions">
                    {destSuggestions.map(d => (
                      <li key={d} onMouseDown={() => {
                        setFormData(p => ({ ...p, destination: d }));
                        setDestSuggestions([]);
                      }}>
                        📍 {d}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="tpm-field">
                <label className="tpm-label">
                  <span className="tpm-label-icon">🌍</span> Country
                </label>
                <div className="tpm-input-wrap">
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    placeholder="e.g. India, France"
                    className={`tpm-input ${formData.country ? 'filled' : ''}`}
                    disabled={isLoading}
                    required
                  />
                  {formData.country && <span className="tpm-check">✓</span>}
                </div>
              </div>
            </div>

            {/* Specific Places toggle */}
            <button
              type="button"
              className={`tpm-custom-toggle ${showPlaces || specificPlaces.length > 0 ? 'active' : ''}`}
              onClick={() => setShowPlaces(v => !v)}
              disabled={isLoading}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              {specificPlaces.length > 0 ? `Visiting ${specificPlaces.length} specific place${specificPlaces.length > 1 ? 's' : ''}` : 'Add specific places to visit'}
            </button>

            {/* Specific Places input — revealed on toggle */}
            {(showPlaces || specificPlaces.length > 0) && (
              <div className="tpm-field" style={{marginTop: '-0.4rem'}}>
                <div className={`tpm-places-wrap ${specificPlaces.length > 0 ? 'has-tags' : ''}`}>
                  {specificPlaces.map(p => (
                    <span key={p} className="tpm-place-tag">
                      📌 {p}
                      <button type="button" className="tpm-place-remove" onClick={() => removePlace(p)} disabled={isLoading}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    className="tpm-places-input"
                    placeholder={specificPlaces.length === 0 ? 'e.g. Tirupathi, Vizag, Guntur...' : 'Add more...'}
                    value={placeInput}
                    onChange={e => setPlaceInput(e.target.value)}
                    onKeyDown={handlePlaceKeyDown}
                    onBlur={() => placeInput.trim() && addPlace(placeInput)}
                    disabled={isLoading}
                    autoFocus={showPlaces}
                  />
                </div>
                {specificPlaces.length > 0 && (
                  <p className="tpm-places-hint">✓ AI will cover: {specificPlaces.join(' → ')}
                    <span style={{marginLeft:'0.5rem', opacity:0.55}}>{specificPlaces.length}/{MAX_PLACES}</span>
                  </p>
                )}
                {specificPlaces.length === 0 && (
                  <p className="tpm-places-hint" style={{opacity:0.5}}>Press Enter or comma after each place name</p>
                )}
                {specificPlaces.length >= MAX_PLACES && (
                  <p className="tpm-places-hint" style={{color:'#E8874C'}}>⚠ Max {MAX_PLACES} places — remove one to add another</p>
                )}
              </div>
            )}

            {/* Duration */}
            <div className="tpm-field">
              <label className="tpm-label">
                <span className="tpm-label-icon">📅</span> Duration (days)
              </label>
              <div className="tpm-duration-wrap">
                <button type="button" className="tpm-dur-btn"
                  onClick={() => setFormData(p => ({ ...p, duration: Math.max(1, (parseInt(p.duration) || 0) - 1).toString() }))}
                  disabled={isLoading || !formData.duration || parseInt(formData.duration) <= 1}>
                  −
                </button>
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  placeholder="0"
                  className={`tpm-input duration ${formData.duration ? 'filled' : ''}`}
                  min="1"
                  disabled={isLoading}
                  required
                />
                <button type="button" className="tpm-dur-btn"
                  onClick={() => setFormData(p => ({ ...p, duration: ((parseInt(p.duration) || 0) + 1).toString() }))}
                  disabled={isLoading}>
                  +
                </button>
                <span className="tpm-dur-label">
                  {formData.duration ? `${formData.duration} day${formData.duration !== '1' ? 's' : ''}` : 'Select days'}
                </span>
              </div>
            </div>

                        {/* Budget */}
            <div className="tpm-field">
              <label className="tpm-label">
                <span className="tpm-label-icon">💰</span> Budget
              </label>
              <div className="tpm-budget-grid">
                {[
                  { value: 'cheap',    label: 'Low',      icon: '💵', desc: 'Under ₹2,000/day' },
                  { value: 'moderate', label: 'Moderate', icon: '💳', desc: '₹2,000–₹6,000/day' },
                  { value: 'luxury',   label: 'Luxury',   icon: '💎', desc: '₹6,000+/day' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`tpm-budget-btn ${formData.budget === opt.value ? 'selected' : ''}`}
                    onClick={() => setFormData(p => ({ ...p, budget: opt.value }))}
                    disabled={isLoading}
                  >
                    <span className="tpm-budget-icon">{opt.icon}</span>
                    <span className="tpm-budget-label">{opt.label}</span>
                    <span className="tpm-budget-desc">{opt.desc}</span>
                    {formData.budget === opt.value && <span className="tpm-selected-dot" />}
                  </button>
                ))}
              </div>

              {/* Custom range toggle */}
              <button
                type="button"
                className={`tpm-custom-toggle ${formData.budget === 'custom' ? 'active' : ''}`}
                onClick={() => setFormData(p => ({ ...p, budget: p.budget === 'custom' ? '' : 'custom' }))}
                disabled={isLoading}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                {formData.budget === 'custom' ? '✓ Using custom range' : 'Set a custom range'}
              </button>

              {/* Custom budget inputs */}
              {formData.budget === 'custom' && (
                <div className="tpm-custom-budget">
                  <div className="tpm-custom-budget-row">
                    <div className="tpm-custom-input-wrap">
                      <span className="tpm-rupee">₹</span>
                      <input
                        type="number"
                        placeholder="Min per day"
                        value={customBudget.min}
                        onChange={e => setCustomBudget(p => ({ ...p, min: e.target.value }))}
                        className="tpm-custom-input"
                        min="0"
                        disabled={isLoading}
                      />
                    </div>
                    <span className="tpm-custom-dash">—</span>
                    <div className="tpm-custom-input-wrap">
                      <span className="tpm-rupee">₹</span>
                      <input
                        type="number"
                        placeholder="Max per day"
                        value={customBudget.max}
                        onChange={e => setCustomBudget(p => ({ ...p, max: e.target.value }))}
                        className="tpm-custom-input"
                        min="0"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  {customBudget.min && customBudget.max && !budgetRangeError && (
                    <p className="tpm-custom-preview">
                      ✓ ₹{parseInt(customBudget.min).toLocaleString('en-IN')} – ₹{parseInt(customBudget.max).toLocaleString('en-IN')} per day
                    </p>
                  )}
                  {budgetRangeError && (
                    <p className="tpm-custom-preview" style={{color:'#E05C5C'}}>⚠ {budgetRangeError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Companions */}
            <div className="tpm-field">
              <label className="tpm-label">
                <span className="tpm-label-icon">👥</span> Travel Companions
              </label>
              <div className="tpm-companions-grid">
                {[
                  { value: 'single', label: 'Solo', icon: '👤' },
                  { value: 'couple', label: 'Couple', icon: '💑' },
                  { value: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦' },
                  { value: 'friends', label: 'Friends', icon: '👥' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`tpm-companion-btn ${formData.companions === opt.value ? 'selected' : ''}`}
                    onClick={() => setFormData(p => ({ ...p, companions: opt.value }))}
                    disabled={isLoading}
                  >
                    <span className="tpm-companion-icon">{opt.icon}</span>
                    <span>{opt.label}</span>
                    {formData.companions === opt.value && <span className="tpm-selected-dot" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Interests */}
            <div className="tpm-field">
              <label className="tpm-label">
                <span className="tpm-label-icon">🎯</span> Travel Interests <span style={{fontWeight:300, textTransform:'none', letterSpacing:0, opacity:0.6}}>(optional)</span>
              </label>
              <div className="tpm-interests-grid">
                {interestOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`tpm-interest-btn ${interests.includes(opt.value) ? 'selected' : ''}`}
                    onClick={() => toggleInterest(opt.value)}
                    disabled={isLoading}
                  >
                    <span className="tpm-interest-icon">{opt.icon}</span>
                    <span>{opt.label}</span>
                    {interests.includes(opt.value) && <span className="tpm-selected-dot" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="tpm-error">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className={`tpm-submit-btn ${isFormValid && !isLoading ? 'active' : ''}`}
              disabled={!isFormValid || isLoading}
            >
              {isLoading ? (
                <>
                  <span className="tpm-spinner" />
                  {loadingSteps[loadingStep]}
                </>
              ) : (
                <>
                  <span>🗺️</span>
                  Generate My Trip
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 'auto' }}>
                    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Close button */}
        <button className="tpm-close" onClick={handleClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Confirm close dialog */}
      {confirmClose && (
        <div className="tpm-confirm-overlay" onClick={() => setConfirmClose(false)}>
          <div className="tpm-confirm-box" onClick={e => e.stopPropagation()}>
            <span style={{fontSize:'1.8rem'}}>⚠️</span>
            <h3>Discard changes?</h3>
            <p>You have unsaved trip preferences. Are you sure you want to close?</p>
            <div className="tpm-confirm-btns">
              <button className="tpm-confirm-cancel" onClick={() => setConfirmClose(false)}>Keep Editing</button>
              <button className="tpm-confirm-discard" onClick={() => { setConfirmClose(false); onClose(); }}>Yes, Discard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripPlannerModal;