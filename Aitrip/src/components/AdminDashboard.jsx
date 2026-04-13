import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './AdminDashboard.css';

const AdminDashboard = ({ onClose }) => {
  const [stats, setStats] = useState(null);
  const [recentTrips, setRecentTrips] = useState([]);
  const [topDests, setTopDests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Total users (via auth — approximate via profiles)
      const { count: userCount } = await supabase
        .from('user_profiles').select('*', { count: 'exact', head: true });

      // Total trips
      const { count: tripCount } = await supabase
        .from('trip_history').select('*', { count: 'exact', head: true });

      // Avg ML score
      const { data: scoreData } = await supabase
        .from('trip_history').select('ml_score').not('ml_score','is',null);
      const avgScore = scoreData?.length
        ? (scoreData.reduce((s, r) => s + parseFloat(r.ml_score || 0), 0) / scoreData.length).toFixed(2)
        : null;

      // Trips this week
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count: weeklyTrips } = await supabase
        .from('trip_history').select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo);

      // Recent 5 trips
      const { data: recent } = await supabase
        .from('trip_history')
        .select('id, destination, duration, budget, companions, created_at, ml_score')
        .order('created_at', { ascending: false })
        .limit(5);

      // Top destinations
      const { data: allTrips } = await supabase
        .from('trip_history').select('destination');
      const destMap = {};
      allTrips?.forEach(t => {
        if (t.destination) {
          const k = t.destination.trim();
          destMap[k] = (destMap[k] || 0) + 1;
        }
      });
      const topDestsArr = Object.entries(destMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, count]) => ({ name, count }));

      setStats({ userCount: userCount || 0, tripCount: tripCount || 0, avgScore, weeklyTrips: weeklyTrips || 0 });
      setRecentTrips(recent || []);
      setTopDests(topDestsArr);
    } catch (e) {
      console.error('Admin stats error:', e);
    } finally {
      setLoading(false);
    }
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'2-digit' });

  return (
    <div className="ad-overlay" onClick={onClose}>
      <div className="ad-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="ad-header">
          <div className="ad-title">
            <span>🛡️</span>
            <div>
              <h2>Admin Dashboard</h2>
              <p>Platform overview · AI Trip Planner · Vignan University</p>
            </div>
          </div>
          <button className="ad-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {loading ? (
          <div className="ad-loading">
            <div className="ad-spinner" />
            <p>Loading platform stats…</p>
          </div>
        ) : (
          <div className="ad-body">
            {/* KPI Cards */}
            <div className="ad-kpis">
              <div className="ad-kpi gold">
                <div className="ad-kpi-icon">👥</div>
                <div className="ad-kpi-val">{stats.userCount}</div>
                <div className="ad-kpi-label">Total Users</div>
              </div>
              <div className="ad-kpi">
                <div className="ad-kpi-icon">🗺️</div>
                <div className="ad-kpi-val">{stats.tripCount}</div>
                <div className="ad-kpi-label">Trips Generated</div>
              </div>
              <div className="ad-kpi">
                <div className="ad-kpi-icon">📅</div>
                <div className="ad-kpi-val">{stats.weeklyTrips}</div>
                <div className="ad-kpi-label">This Week</div>
              </div>
              <div className="ad-kpi">
                <div className="ad-kpi-icon">🤖</div>
                <div className="ad-kpi-val">{stats.avgScore || '—'}</div>
                <div className="ad-kpi-label">Avg ML Score</div>
              </div>
            </div>

            <div className="ad-two-col">
              {/* Recent Trips */}
              <div className="ad-section">
                <div className="ad-section-title">🕐 Recent Trips</div>
                <div className="ad-table">
                  <div className="ad-tr head">
                    <span>Destination</span>
                    <span>Budget</span>
                    <span>Score</span>
                    <span>Date</span>
                  </div>
                  {recentTrips.map(t => (
                    <div className="ad-tr" key={t.id}>
                      <span>{t.destination}</span>
                      <span className="ad-badge">{t.budget}</span>
                      <span style={{ color: t.ml_score >= 7 ? '#5CB87A' : '#C9A84C' }}>
                        {t.ml_score ? `${parseFloat(t.ml_score).toFixed(1)}/10` : '—'}
                      </span>
                      <span style={{ opacity: 0.55 }}>{fmtDate(t.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Destinations */}
              <div className="ad-section">
                <div className="ad-section-title">📍 Top Destinations</div>
                <div className="ad-dest-list">
                  {topDests.map((d, i) => (
                    <div className="ad-dest-row" key={d.name}>
                      <span className="ad-dest-rank">{i + 1}</span>
                      <span className="ad-dest-name">{d.name}</span>
                      <div className="ad-dest-bar-wrap">
                        <div className="ad-dest-bar" style={{ width: `${(d.count / topDests[0].count) * 100}%` }} />
                      </div>
                      <span className="ad-dest-count">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tech Stack */}
            <div className="ad-stack">
              <div className="ad-stack-title">⚙️ Tech Stack</div>
              <div className="ad-stack-chips">
                {['React + Vite','Node.js + Express','Supabase (PostgreSQL)','Google Gemini AI','XGBoost ML','Python Flask (ML API)','Vite PWA'].map(t => (
                  <span key={t} className="ad-chip">{t}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
