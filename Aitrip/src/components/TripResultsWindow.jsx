import React, { useState, useEffect } from 'react';
import './TripResultsWindow.css';
import WeatherWidget from './WeatherWidget';
import CostEstimator from './CostEstimator';
import { supabase } from '../supabaseClient';

const TripResultsWindow = ({
  tripData, mlPrediction, mlRecommendations, onClose,
  destination, duration, budget, companions,
  tripId, isFavorite, onToggleFavorite, onTripDeleted
}) => {
  const [activeDay, setActiveDay]     = useState(0);
  const [activeTab, setActiveTab]     = useState('itinerary');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [copied, setCopied]           = useState(false);
  const [shuffledDays, setShuffledDays] = useState({});
  const [regeneratingDay, setRegeneratingDay] = useState(false);
  const [rating, setRating]           = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [ratingSaved, setRatingSaved] = useState(false);

  const saveRating = async (stars) => {
    setRating(stars);
    setRatingSaved(false);
    if (!tripId) return;
    try {
      await supabase.from('trips').update({ rating: stars }).eq('id', tripId);
      setRatingSaved(true);
      setTimeout(() => setRatingSaved(false), 2500);
    } catch(e) { console.error('Rating save failed:', e); }
  };

  const budgetIcons    = { cheap:'💵', budget:'💵', moderate:'💳', luxury:'💎' };
  const companionIcons = { single:'👤', couple:'💑', family:'👨‍👩‍👧‍👦', friends:'👥' };
  const scoreColor = s => !s ? '#8A8880' : s >= 8 ? '#5CB87A' : s >= 6 ? '#C9A84C' : '#E05C5C';
  const scoreLabel = s => !s ? 'N/A' : s >= 8.5 ? 'Excellent' : s >= 7 ? 'Great' : s >= 5 ? 'Good' : 'Fair';

  // ── Convert tripData to plain string ────────────────────────────────────
  const getTripString = () => {
    if (!tripData) return '';
    if (typeof tripData === 'string') {
      try {
        const p = JSON.parse(tripData);
        if (typeof p === 'string') return p;
        if (p.tripPlan) return p.tripPlan;
        if (p.content)  return p.content;
        if (p.text)     return p.text;
        return tripData;
      } catch { return tripData; }
    }
    if (typeof tripData === 'object') {
      if (tripData.tripPlan) return tripData.tripPlan;
      if (tripData.content)  return tripData.content;
      if (tripData.text)     return tripData.text;
      return JSON.stringify(tripData);
    }
    return String(tripData);
  };

  const tripStr = getTripString();

  // ── Parser ───────────────────────────────────────────────────────────────
  const parseTripContent = (content) => {
    const normalized = content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/ {2}\n/g, '\n')
      .replace(/\t/g, ' ');

    const lines = normalized.split('\n');
    const days  = [];
    let cur = null, sec = null, items = [];

    const clean       = s => s.replace(/\*\*/g,'').replace(/#+/g,'').replace(/^\s*[-*•]\s*/,'').trim();
    const stripBullet = s => s.replace(/^\s*[-*•]\s*/,'').trim();
    const isDayLine   = t => /day\s+\d+/i.test(t);

    const isStandaloneSection = t => {
      // Never treat day lines as sections
      if (isDayLine(t)) return false;
      const r = t.replace(/\*\*/g,'').replace(/#+/g,'').trim();
      return (
        t.startsWith('#') ||
        /^\*\*[^*]+:\*\*\s*$/.test(t) ||
        /^\*\*[^*]+\*\*\s*$/.test(t)  ||
        (/^[A-Z][a-zA-Z\s\/\-]+:\s*$/.test(r) && r.length < 50)
      );
    };

    const isBulletSection = t => {
      const s = t.replace(/^\s*[-*•]\s*/,'').trim();
      return /^[A-Z][a-zA-Z\s\/\-]+:\s*$/.test(s) && s.length < 50;
    };

    const flushSec = () => {
      if (sec !== null && cur) {
        if (items.length > 0) cur.sections.push({ title: sec, items: [...items] });
        else cur.sections.push({ title: sec, items: [] });
      }
      sec = null; items = [];
    };
    const flushDay = () => { flushSec(); if (cur) days.push(cur); };

    lines.forEach(line => {
      const t = line.trim();
      if (!t || t === '--' || t.startsWith('---')) return;

      // IMPORTANT: Check isDayLine BEFORE isStandaloneSection
      // because GPT uses "## Day 1: Title" which starts with #
      // and would be incorrectly caught by isStandaloneSection first
      if (isDayLine(t)) {
        flushDay();
        cur = {
          dayNumber: t.match(/\d+/)[0],
          title: t.replace(/\*\*/g,'').replace(/#+/g,'').trim(),
          sections: []
        };
        sec = null; items = [];
        return;
      }

      if (!cur) return;

      if (isStandaloneSection(t)) {
        flushSec();
        sec = t.replace(/\*\*/g,'').replace(/#+/g,'').replace(/:$/,'').trim();
        return;
      }

      if (isBulletSection(t)) {
        flushSec();
        sec = t.replace(/^\s*[-*•]\s*/,'').replace(/:$/,'').trim();
        return;
      }

      if (/^\s*[-*•]/.test(t)) {
        const item = stripBullet(t);
        if (item.length > 1) {
          if (sec === null) sec = 'Details';
          items.push(item);
        }
        return;
      }

      if (t.length > 2) {
        if (sec === null) sec = 'Overview';
        items.push(clean(t));
      }
    });

    flushDay();
    return days;
  };

  const days    = parseTripContent(tripStr);
  const hasDays = days.length > 0;
  const day     = days[activeDay];

  // ── Parse Alternative Places from itinerary text ───────────────────────
  const parseAlternatives = (text) => {
    if (!text) return [];
    const headerPatterns = [
      /##\s*Alternative Places?[\s\S]*?(?=\n##|$)/i,
      /##\s*Alternatives?[\s\S]*?(?=\n##|$)/i,
      /##\s*Other Places?[\s\S]*?(?=\n##|$)/i,
      /##\s*Suggested Alternatives?[\s\S]*?(?=\n##|$)/i,
    ];
    let section = null;
    for (const pat of headerPatterns) {
      const m = text.match(pat);
      if (m) { section = m[0]; break; }
    }
    if (!section) return [];
    const lines = section.split('\n').filter(l => l.trim());
    const alts = [];
    const catIcons = {
      food: '🍜', adventure: '⛰️', nature: '🌿', culture: '🏛️',
      shopping: '🛍️', nightlife: '🌃', wellness: '🧘', photography: '📸',
      beach: '🏖️', historical: '🏛️', religious: '⛩️', entertainment: '🎭',
      museum: '🏛️', park: '🌲', market: '🛒', temple: '⛩️', fort: '🏰',
    };
    lines.forEach(line => {
      let m = line.match(/^[-*•]\s*\*\*(.+?)\*\*\s*[—–\-:]\s*(.+?)(?:\s*Category:\s*(.+))?$/i);
      if (!m) m = line.match(/^[-*•]\s*([A-Z][^—–\-:]+?)\s*[—–]\s*(.+)$/);
      if (!m) m = line.match(/^\*\*(.+?)\*\*:\s*(.+)/);
      if (!m) m = line.match(/^\d+\.\s*\*?\*?(.+?)\*?\*?\s*[—–:]\s*(.+)/);
      if (m && m[1] && !m[1].toLowerCase().includes('alternative')) {
        const catRaw = (m[3] || m[2] || '').toLowerCase();
        const icon = Object.entries(catIcons).find(([k]) => catRaw.includes(k))?.[1] || '\U0001f4cd';
        alts.push({ name: m[1].trim(), desc: (m[2] || '').replace(/\.$/, '').trim(), category: m[3]?.trim() || 'Place', icon });
      }
    });
    return alts;
  };


  const alternatives = parseAlternatives(tripStr);

  // ── Tips ────────────────────────────────────────────────────────────────
  const tips = mlRecommendations?.tips || [];
  const defaultTips = [
    `Book accommodations in advance for ${destination || 'your destination'}.`,
    'Carry a valid photo ID — required at most Indian tourist sites.',
    'Download offline Google Maps before travelling to remote areas.',
    'Carry a mix of cash and cards — smaller towns may not accept cards.',
    'Emergency numbers: 100 (Police), 108 (Ambulance), 1363 (Tourist Helpline).',
    'Try local cuisine and street food for the most authentic experience.',
  ];

  // ── Section icon ─────────────────────────────────────────────────────────
  const secIcon = t => {
    const s = t?.toLowerCase() || '';
    if (s.includes('morning'))   return '🌅';
    if (s.includes('afternoon')) return '☀️';
    if (s.includes('evening') || s.includes('night')) return '🌙';
    if (s.includes('hotel') || s.includes('accommod') || s.includes('stay')) return '🏨';
    if (s.includes('food') || s.includes('dine') || s.includes('dining') ||
        s.includes('lunch') || s.includes('dinner') || s.includes('breakfast') ||
        s.includes('restaurant')) return '🍽️';
    if (s.includes('transport') || s.includes('travel') ||
        s.includes('flight')    || s.includes('train'))  return '🚗';
    if (s.includes('tip') || s.includes('note'))         return '💡';
    if (s.includes('activit') || s.includes('attract') ||
        s.includes('visit')   || s.includes('explore') ||
        s.includes('tour'))                               return '🎯';
    if (s.includes('overview') || s.includes('intro'))   return '📋';
    return '📌';
  };

  const bold = text => (
    <span dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
  );

    // ── PDF ────────────────────────────────────────────────────────────────────────────
  const [pdfLoading, setPdfLoading] = useState(false);
  const handlePDF = async () => {
    setPdfLoading(true);
    try {
      const { exportTripPDF } = await import('../utils/exportPDF.js');
      exportTripPDF(tripStr, { destination, duration, budget, companions, country: '' });
    } catch(e) { console.error('PDF error:', e); }
    finally { setPdfLoading(false); }
  };

  // ── Copy ─────────────────────────────────────────────────────────────────
  const handleCopy = () => {
    navigator.clipboard.writeText(tripStr).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Share ─────────────────────────────────────────────────────────────────
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied]   = useState(false);
  const handleShare = async () => {
    setShareLoading(true);
    try {
      if (tripId) {
        // If saved trip, share by ID
        const url = `${window.location.origin}/dashboard?viewTrip=${tripId}`;
        await navigator.clipboard.writeText(url);
      } else {
        // Encode trip text in URL (first 800 chars for brevity)
        const preview = encodeURIComponent(tripStr.slice(0, 800));
        const url = `${window.location.origin}/dashboard?shared=1&dest=${encodeURIComponent(destination || '')}&preview=${preview}`;
        await navigator.clipboard.writeText(url);
      }
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 3000);
    } catch(e) { console.error('Share failed', e); }
    finally { setShareLoading(false); }
  };

  // ── Regenerate Day ───────────────────────────────────────────────────────
  const handleRegenerateDay = () => {
    setRegeneratingDay(true);
    setTimeout(() => {
      const available = alternatives.filter(a => a.name) || [];
      if (available.length >= 2) {
         const shuffled = [...available].sort(() => 0.5 - Math.random()).slice(0, 2);
         setShuffledDays(prev => ({
           ...prev,
           [activeDay]: shuffled.map(s => ({
             title: s.category || 'Alternative Recommendation',
             items: [`**${s.name}**: ${s.desc}`]
           }))
         }));
      } else {
         // Fallback if no alternatives
         setShuffledDays(prev => ({
           ...prev,
           [activeDay]: [{
             title: 'Explore Local Secrets',
             items: ['Based on updated ML inputs, try walking through the local old town markets or finding a hidden local café.']
           }]
         }));
      }
      setRegeneratingDay(false);
    }, 1500);
  };


  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!tripId) { onClose(); return; }
    setDeleting(true);
    try {
      const { supabase } = await import('../supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`http://localhost:3001/api/trip-history/${tripId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const r = await res.json();
      if (r.success) { if (onTripDeleted) onTripDeleted(); onClose(); }
    } catch { alert('Error deleting trip'); }
    finally { setDeleting(false); setDeleteConfirm(false); }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="trw-overlay" onClick={onClose}>
      <div className="trw-window" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="trw-header">
          <div className="trw-hl">
            <div className="trw-avatar">{destination?.charAt(0)?.toUpperCase()}</div>
            <div>
              <h1 className="trw-title">
                {destination}
                {isFavorite && <span className="trw-star">⭐</span>}
              </h1>
              <div className="trw-tags">
                <span className="trw-tag">📅 {duration} day{duration !== '1' ? 's' : ''}</span>
                <span className="trw-tag">{budgetIcons[budget] || '💰'} {budget}</span>
                <span className="trw-tag">{companionIcons[companions] || '👤'} {companions}</span>
              </div>
            </div>
          </div>

          <div className="trw-hr">
            
            {/* Star Rating */}
            <div className="trw-rating">
              <div className="trw-stars">
                {[1,2,3,4,5].map(s => (
                  <span
                    key={s}
                    className={`trw-star ${(hoverRating || rating) >= s ? 'active' : ''}`}
                    onClick={() => saveRating(s)}
                    onMouseEnter={() => setHoverRating(s)}
                    onMouseLeave={() => setHoverRating(0)}
                    title={`Rate ${s} star${s > 1 ? 's' : ''}`}
                  >⭐</span>
                ))}
              </div>
              {ratingSaved
                ? <span className="trw-rating-saved">✓ Rating saved!</span>
                : <span className="trw-rating-label">{rating > 0 ? `You rated ${rating}/5` : 'Rate this trip'}</span>
              }
            </div>
            <div className="trw-hbtns">
              {onToggleFavorite && (
                <button className={`trw-ib ${isFavorite ? 'gold' : ''}`} onClick={onToggleFavorite} title="Favourite">
                  {isFavorite ? '⭐' : '☆'}
                </button>
              )}
              <button className="trw-ib" onClick={handleCopy} title="Copy text">{copied ? '✓' : '📋'}</button>
              <button className="trw-ib" onClick={handleShare} disabled={shareLoading} title="Share link">
                {shareCopied ? '✅' : shareLoading ? '⏳' : '🔗'}
              </button>
              <button className="trw-ib" onClick={handlePDF} disabled={pdfLoading} title="Download PDF">
                {pdfLoading ? '⏳' : '📄'}
              </button>
              {tripId && <button className="trw-ib danger" onClick={() => setDeleteConfirm(true)}>🗑️</button>}
              <button
                className="trw-ib close"
                onClick={onClose}
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* ── Tab Nav ── */}
        <div className="trw-tabnav">
          {[
            { id: 'itinerary',       label: 'Itinerary',       icon: '🗺️' },
            { id: 'recommendations', label: 'AI Insights',      icon: '🤖' },
            { id: 'weather',         label: 'Weather',          icon: '⛅' },
            { id: 'cost',            label: 'Cost',             icon: '💰' },
            { id: 'tips',            label: 'Tips',             icon: '💡' },
            { id: 'alternatives',    label: 'Alternatives',     icon: '🔄', badge: alternatives.length || null },
          ].map(t => (
            <button
              key={t.id}
              className={`trw-tabbtn ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.icon} {t.label}
              {t.badge > 0 && <span className="trw-tab-badge">{t.badge}</span>}
            </button>
          ))}
        </div>

        {/* ── Body ── */}
        <div className="trw-body">

          {/* ITINERARY */}
          {activeTab === 'itinerary' && hasDays && (
            <div className="trw-layout">
              <aside className="trw-timeline">
                <div className="trw-tl-head">
                  <span>Trip Timeline</span>
                  <span className="trw-tl-count">{days.length} days</span>
                </div>
                <div className="trw-tl-list">
                  <div className="trw-tl-line" />
                  {days.map((d, i) => (
                    <button
                      key={i}
                      className={`trw-tl-item ${activeDay === i ? 'active' : ''}`}
                      onClick={() => setActiveDay(i)}
                    >
                      <div className="trw-tl-circle"><span>{d.dayNumber}</span></div>
                      <div className="trw-tl-info">
                        <span className="trw-tl-label">Day {d.dayNumber}</span>
                        <span className="trw-tl-sub">
                          {d.title.replace(/Day\s+\d+:?\s*/i, '').slice(0, 28) ||
                            `${d.sections.length} section${d.sections.length !== 1 ? 's' : ''}`}
                        </span>
                      </div>
                      {activeDay === i && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="trw-tl-arrow">
                          <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </aside>

              <div className="trw-detail" key={activeDay}>
                {day && (
                  <>
                    <div className="trw-dhead">
                      <div className="trw-dhead-left">
                        <div className="trw-dnum">{day.dayNumber}</div>
                        <div>
                          <h2 className="trw-dtitle">{day.title}</h2>
                          <p className="trw-dsub">{day.sections.length} section{day.sections.length !== 1 ? 's' : ''} planned</p>
                        </div>
                      </div>
                      <div className="trw-dnav" style={{ flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        <button className="trw-nvbtn ghost" onClick={handleRegenerateDay} disabled={regeneratingDay}>
                          {regeneratingDay ? '⏳...' : '🔄 Regenerate Day'}
                        </button>
                        <div style={{display:'flex', gap:'0.4rem', alignItems:'center'}}>
                          <button className="trw-nvbtn" onClick={() => setActiveDay(d => Math.max(0, d - 1))} disabled={activeDay === 0 || regeneratingDay}>← Prev</button>
                          <span className="trw-nvcnt">{activeDay + 1}/{days.length}</span>
                          <button className="trw-nvbtn gold" onClick={() => setActiveDay(d => Math.min(days.length - 1, d + 1))} disabled={activeDay === days.length - 1 || regeneratingDay}>Next →</button>
                        </div>
                      </div>
                    </div>

                    {/* --- MAIN ITINERARY TIMELINE VIEW --- */}
                    {/* This container explicitly maps over the segments of the selected day (e.g., Morning, Afternoon, Evening) */}
                    <div className={`trw-cards ${regeneratingDay ? 'trw-fade-pulse' : ''}`} style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      
                      {/* Check if AI gave us shuffled alternative days, otherwise use the default static day sections */}
                      {(shuffledDays[activeDay] ? [day.sections[0], ...shuffledDays[activeDay]].filter(Boolean) : day.sections).map((sec, si) => {
                        
                        // --- AI LOCATION PARSER FOR MAPS ---
                        // We iterate through all activities in this current block (e.g., Morning) to find a specific location.
                        // We use Regex (/\*\*(.+?)\*\*/) to locate words wrapped in double-asterisks (Markdown bold) as our location target.
                        let blockPlace = null;
                        for (let item of sec.items) {
                          const match = item.match(/\*\*(.+?)\*\*/);
                          if (match) {
                            // Strip out common AI introductory phrases so Google Maps receives a clean location name
                            blockPlace = match[1].replace(/Breakfast at|Lunch at|Dinner at|Head to|Visit/ig, '').trim();
                            break; // Stop execution after finding the first primary location for this block
                          }
                        }
                        
                        // Formulate the final URL query string for the embedded Google Map.
                        // If a specific place was found we append the base destination (e.g., 'Eiffel Tower, Paris'). 
                        // If no place is found, we fall back to null so the map gracefully hides.
                        const currentLoc = blockPlace ? `${blockPlace}, ${destination || ''}` : null;

                        return (
                          // Individual Block Container (Triggers unified Gold hover effect via 'trw-block-row')
                          <div key={si} className="trw-block-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'stretch' }}>
                            
                            {/* --- LEFT BOX: ITINERARY DATA --- */}
                            {/* This block handles all the text data, timeline events, and native anchor links */}
                            <div className="trw-card" style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', margin: 0 }}>
                              <div className="trw-card-h">
                                {/* Dynamically grab the correct icon based on the section title (Morning/Afternoon) */}
                                <span className="trw-card-ico">{secIcon(sec.title)}</span>
                                <h4>{sec.title}</h4>
                              </div>
                              <ul className="trw-card-ul" style={{ marginTop: '0.5rem' }}>
                                {/* Render the individual bullet points of the itinerary */}
                                {sec.items.map((item, ii) => {
                                  // Again, extract the specific place name to generate a clickable external link 
                                  const match = item.match(/\*\*(.+?)\*\*/);
                                  let placeName = match ? match[1].replace(/Breakfast at|Lunch at|Dinner at|Head to|Visit/ig, '').trim() : null;
                                  
                                  return (
                                    <li key={ii} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <span className="trw-dot" style={{ marginTop: '0.4rem' }} />
                                        {/* Render the actual AI-generated text instruction */}
                                        <span>{bold(item)}</span>
                                      </div>
                                      
                                      {/* If a location was extracted, render a native "📍 View" button that opens Google Maps in a new tab */}
                                      {placeName && (
                                        <a 
                                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName + ', ' + (destination || ''))}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="trw-map-link-btn"
                                          style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                                            padding: '0.2rem 0.5rem', fontSize: '0.7rem', color: '#C9A84C',
                                            background: 'rgba(201, 168, 76, 0.1)', borderRadius: '4px',
                                            textDecoration: 'none', fontWeight: '600', marginLeft: '1rem',
                                            transition: 'all 0.2s'
                                          }}
                                        >
                                          📍 View ↗
                                        </a>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>

                            {/* --- RIGHT BOX: GOOGLE MAPS BLOCK --- */}
                            {/* Conditionally render the entire right-side map box ONLY if a valid place was extracted */}
                            {currentLoc && (
                              <div className="trw-card" style={{ flex: '0 0 260px', display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '1rem', margin: 0 }}>
                                <div style={{
                                  width: '100%', flex: 1, minHeight: '180px',
                                  borderRadius: '8px', overflow: 'hidden',
                                  border: '1px solid rgba(255, 255, 255, 0.08)',
                                  background: 'rgba(0,0,0,0.2)'
                                }}>
                                  {/* Embed the interactive Google Maps iframe using the query parameter (q=) */}
                                  <iframe
                                    title={`${sec.title} Map`}
                                    width="100%" height="100%" style={{ border: 0, minHeight: '180px' }} 
                                    loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                                    src={`https://maps.google.com/maps?q=${encodeURIComponent(currentLoc)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                                  />
                                </div>
                                {/* Clean Label to display exactly which location this map is locked on to */}
                                <div style={{
                                  textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', 
                                  color: 'var(--gold)', background: 'rgba(201, 168, 76, 0.08)',
                                  padding: '0.4rem', borderRadius: '6px', border: '1px solid rgba(201, 168, 76, 0.15)'
                                }}>
                                  📍 {blockPlace}
                                </div>
                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Fallback plain view */}
          {activeTab === 'itinerary' && !hasDays && (
            <div className="trw-plain">
              {tripStr.split('\n').map((line, i) => {
                const t = line.trim();
                if (!t || t === '--') return null;
                if (t.startsWith('#') || /^\*\*Day/.test(t))
                  return <h3 key={i} className="trw-ph">{t.replace(/[#*]/g, '').trim()}</h3>;
                if (t.startsWith('-') || t.startsWith('•'))
                  return <li key={i} className="trw-pli">{bold(t.replace(/^[-•]\s*/, ''))}</li>;
                return <p key={i} className="trw-pp">{bold(t)}</p>;
              }).filter(Boolean)}
            </div>
          )}

          {/* RECOMMENDATIONS */}
          {activeTab === 'recommendations' && (
            <div className="trw-recs">
              {mlRecommendations ? (
                <>
                  {[
                    { key: 'accommodations', icon: '🏨', title: 'Recommended Hotels',    items: mlRecommendations.accommodations },
                    { key: 'attractions',    icon: '🎯', title: 'Top Attractions',        items: mlRecommendations.attractions },
                    { key: 'restaurants',    icon: '🍽️', title: 'Dining & Restaurants',   items: mlRecommendations.dining || mlRecommendations.restaurants },
                    { key: 'cuisines',       icon: '🥘', title: 'Local Cuisines',         items: mlRecommendations.cuisines },
                  ].filter(c => c.items?.length > 0).map(cat => (
                    <div key={cat.key} className="trw-rec">
                      <div className="trw-rec-h">
                        <span className="trw-rec-ico">{cat.icon}</span>
                        <h3>{cat.title}</h3>
                      </div>
                      <ul>
                        {cat.items.map((item, i) => (
                          <li key={i}><span className="trw-dot" />{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}

                  {mlRecommendations.transportation && (
                    <div className="trw-rec">
                      <div className="trw-rec-h"><span className="trw-rec-ico">🚗</span><h3>Getting There</h3></div>
                      <ul>
                        {typeof mlRecommendations.transportation === 'string' ? (
                          <li><span className="trw-dot" />{mlRecommendations.transportation}</li>
                        ) : (
                          Object.entries(mlRecommendations.transportation).map(([k, v]) => v && (
                            <li key={k}><span className="trw-dot" /><strong>{k}:</strong> {v}</li>
                          ))
                        )}
                      </ul>
                    </div>
                  )}

                  {mlRecommendations.season_note && (
                    <div className="trw-rec">
                      <div className="trw-rec-h"><span className="trw-rec-ico">🌤️</span><h3>Season Info</h3></div>
                      <ul>
                        <li><span className="trw-dot" />{mlRecommendations.season_note}</li>
                        {mlRecommendations.best_months && (
                          <li><span className="trw-dot" />Best months: {mlRecommendations.best_months}</li>
                        )}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="trw-empty">
                  <span style={{ fontSize: '2rem' }}>🤖</span>
                  <p>Fetching ML recommendations...</p>
                  <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '0.5rem' }}>
                    If this persists, make sure the ML API is running on port 5000.
                  </p>
                </div>
              )}

              
            </div>
          )}

          {/* WEATHER */}
          {activeTab === 'weather' && (
            <div className="trw-tab-body">
              <WeatherWidget destination={destination} country="" />
            </div>
          )}

          {/* COST ESTIMATOR */}
          {activeTab === 'cost' && (
            <div className="trw-tab-body">
              <CostEstimator
                destination={destination}
                duration={duration}
                budget={budget}
                companions={companions}
              />
            </div>
          )}

          {/* TIPS */}
          {activeTab === 'tips' && (
            <div className="trw-tips">
              {(tips.length > 0 ? tips : defaultTips).map((tip, i) => (
                <div key={i} className="trw-tip">
                  <span className="trw-tipn">{i + 1}</span>
                  <p>{tip}</p>
                </div>
              ))}
            </div>
          )}

          {/* ALTERNATIVES */}
          {activeTab === 'alternatives' && (
            <div className="trw-alts">
              {alternatives.length > 0 ? (
                <>
                  <div className="trw-alts-header">
                    <h3>🔄 Swap-In Options</h3>
                    <p>Don't like something in your itinerary? Pick any of these alternatives and swap them in!</p>
                  </div>
                  <div className="trw-alts-grid">
                    {alternatives.map((alt, i) => (
                      <div key={i} className="trw-alt-card">
                        <div className="trw-alt-icon">{alt.icon}</div>
                        <div className="trw-alt-body">
                          <div className="trw-alt-name">{alt.name}</div>
                          <div className="trw-alt-desc">{alt.desc}</div>
                          <span className="trw-alt-cat">{alt.category}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="trw-empty">
                  <span style={{ fontSize: '2rem' }}>🔄</span>
                  <p>Generate a new trip to see alternative places tailored to your interests.</p>
                  <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '0.5rem' }}>
                    Select your Travel Interests in the planner to get better alternatives.
                  </p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ── Footer ── */}
        <div className="trw-footer">
          <button className="trw-fb ghost" onClick={onClose}>← Dashboard</button>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button className="trw-fb ghost" onClick={handlePDF} disabled={pdfLoading}>
                {pdfLoading ? '⏳ Generating...' : '📄 Download PDF'}
              </button>
            <button className="trw-fb ghost" onClick={handleShare} disabled={shareLoading}>
                {shareCopied ? '✅ Link Copied!' : shareLoading ? '⏳...' : '🔗 Share'}
              </button>
              <button className="trw-fb ghost" onClick={handleCopy}>{copied ? '✓ Copied' : '📋 Copy'}</button>
            <button className="trw-fb gold" onClick={onClose}>✈️ Plan Another</button>
          </div>
        </div>

        {/* ── Delete Confirm ── */}
        {deleteConfirm && (
          <div className="trw-del-ov" onClick={() => setDeleteConfirm(false)}>
            <div className="trw-del-box" onClick={e => e.stopPropagation()}>
              <span style={{ fontSize: '1.8rem' }}>🗑️</span>
              <h3>Delete this trip?</h3>
              <p>This will permanently remove it from your history.</p>
              <div style={{ display: 'flex', gap: '0.65rem', width: '100%', marginTop: '0.5rem' }}>
                <button className="trw-del-no" onClick={() => setDeleteConfirm(false)}>Cancel</button>
                <button className="trw-del-yes" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default TripResultsWindow;