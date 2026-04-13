import React, { useMemo } from 'react';
import './CostEstimator.css';

const BUDGET_RATES = {
  low:      { hotel: 800,  food: 400,  transport: 300,  activities: 200,  misc: 150 },
  budget:   { hotel: 800,  food: 400,  transport: 300,  activities: 200,  misc: 150 },
  cheap:    { hotel: 800,  food: 400,  transport: 300,  activities: 200,  misc: 150 },
  moderate: { hotel: 2500, food: 900,  transport: 700,  activities: 600,  misc: 350 },
  high:     { hotel: 6000, food: 2000, transport: 1500, activities: 1500, misc: 800 },
  luxury:   { hotel: 12000,food: 4000, transport: 3000, activities: 3000, misc: 1500 },
};

const COMPANION_MULT = {
  single: 1, solo: 1, couple: 1.8, family: 3.2, friends: 2.5, group: 3,
};

const CostEstimator = ({ duration, budget, companions, destination }) => {
  const days = parseInt(duration) || 1;

  const rates = useMemo(() => {
    // Handle custom budget like "custom (₹3000–₹7500/day)"
    if (budget?.startsWith('custom')) {
      const match = budget.match(/₹([\d,]+).*?₹([\d,]+)/);
      if (match) {
        const min = parseInt(match[1].replace(/,/g, ''));
        const max = parseInt(match[2].replace(/,/g, ''));
        const mid = Math.round((min + max) / 2);
        return {
          hotel: Math.round(mid * 0.40),
          food:  Math.round(mid * 0.25),
          transport: Math.round(mid * 0.18),
          activities: Math.round(mid * 0.12),
          misc: Math.round(mid * 0.05),
        };
      }
    }
    return BUDGET_RATES[budget?.toLowerCase()] || BUDGET_RATES.moderate;
  }, [budget]);

  const mult = COMPANION_MULT[companions?.toLowerCase()] || 1;

  const categories = [
    { key: 'hotel',      label: 'Accommodation', icon: '🏨', color: '#C9A84C' },
    { key: 'food',       label: 'Food & Dining',  icon: '🍽️', color: '#5CB87A' },
    { key: 'transport',  label: 'Transport',      icon: '🚗', color: '#5BA4E8' },
    { key: 'activities', label: 'Activities',     icon: '🎯', color: '#E87A5B' },
    { key: 'misc',       label: 'Miscellaneous',  icon: '🛍️', color: '#9B7AE8' },
  ];

  const perDay = categories.reduce((s, c) => s + rates[c.key], 0);
  const totalPerPerson = perDay * days;
  const totalGroup = Math.round(totalPerPerson * mult);
  const grandTotal = totalGroup;

  const maxVal = Math.max(...categories.map(c => rates[c.key]));

  const fmt = (n) => '₹' + Math.round(n).toLocaleString('en-IN');

  return (
    <div className="ce-container">
      {/* Summary cards */}
      <div className="ce-summary">
        <div className="ce-card gold">
          <div className="ce-card-label">Total Estimated Cost</div>
          <div className="ce-card-value">{fmt(grandTotal)}</div>
          <div className="ce-card-sub">for {companions || 'all'} · {days} days</div>
        </div>
        <div className="ce-card">
          <div className="ce-card-label">Per Day</div>
          <div className="ce-card-value">{fmt(Math.round(perDay * mult))}</div>
          <div className="ce-card-sub">all expenses combined</div>
        </div>
        <div className="ce-card">
          <div className="ce-card-label">Per Person / Day</div>
          <div className="ce-card-value">{fmt(perDay)}</div>
          <div className="ce-card-sub">{budget} budget</div>
        </div>
      </div>

      {/* Breakdown bar chart */}
      <div className="ce-breakdown-title">Cost Breakdown per Day (per person)</div>
      <div className="ce-bars">
        {categories.map(cat => {
          const val = rates[cat.key];
          const pct = (val / maxVal) * 100;
          const total = val * days * mult;
          return (
            <div className="ce-bar-row" key={cat.key}>
              <div className="ce-bar-label">
                <span className="ce-bar-icon">{cat.icon}</span>
                <span>{cat.label}</span>
              </div>
              <div className="ce-bar-track">
                <div className="ce-bar-fill" style={{ width: `${pct}%`, background: cat.color }} />
              </div>
              <div className="ce-bar-nums">
                <span className="ce-bar-day">{fmt(val)}/day</span>
                <span className="ce-bar-total">{fmt(total)} total</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tips */}
      <div className="ce-tips">
        <div className="ce-tips-title">💡 Money-Saving Tips</div>
        <ul>
          <li>Book accommodation at least 2 weeks in advance for 20–30% savings</li>
          <li>Use IRCTC train passes for multi-city trips in India</li>
          <li>Eat at local dhabas and thali restaurants for authentic food at low cost</li>
          <li>Visit government-run museums — free or very low entry fees</li>
          <li>Use UPI apps (PhonePe, GPay) for discounts on local payments</li>
        </ul>
      </div>

      <p className="ce-disclaimer">
        ⚠ Estimates based on {budget} budget for {destination}. Actual costs may vary by season and availability.
      </p>
    </div>
  );
};

export default CostEstimator;
