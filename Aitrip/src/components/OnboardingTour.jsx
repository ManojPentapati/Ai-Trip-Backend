import React, { useState, useEffect } from 'react';
import './OnboardingTour.css';

const STEPS = [
  {
    title: 'Welcome to AI Trip Planner! ✈️',
    desc: "India's smartest travel companion powered by Gemini AI + Machine Learning. Let's take a quick tour!",
    icon: '🌍',
    target: null, // center screen
  },
  {
    title: 'Plan Your Trip 🗺️',
    desc: 'Click "Plan New Trip" to generate a fully personalized AI itinerary. Set your destination, budget, duration and let the AI do the magic!',
    icon: '✨',
    target: '.db-hero-btn, .db-plan-btn, button[id*="plan"]',
  },
  {
    title: 'Custom Budget Range 💰',
    desc: 'Not just Low/Moderate/High — tap "Set custom range" to enter your exact daily budget in ₹ for a perfectly tailored plan.',
    icon: '📊',
    target: null,
  },
  {
    title: 'Specific Places 📍',
    desc: 'Want to visit only Tirupathi, Vizag and Guntur? Tap "Add specific places" and type them in — the AI will plan around exactly those cities.',
    icon: '🏙️',
    target: null,
  },
  {
    title: 'Weather & Cost Tabs ⛅💸',
    desc: "After generating, switch to the Weather tab for live forecasts or the Cost tab for a full expense breakdown. No extra app needed!",
    icon: '📋',
    target: null,
  },
  {
    title: 'Rate & Save Trips ⭐',
    desc: 'Found a great itinerary? Save it to Trip History, add to Favourites, and rate it 1–5 stars. Download as PDF to share offline!',
    icon: '💾',
    target: null,
  },
  {
    title: "You're all set! 🎉",
    desc: "That's everything! Start by clicking 'Plan New Trip' and explore India (or the world) with your AI travel buddy.",
    icon: '🚀',
    target: null,
  },
];

const OnboardingTour = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const handleNext = () => {
    if (step < STEPS.length - 1) { setStep(s => s + 1); }
    else { handleFinish(); }
  };

  const handleFinish = () => {
    setIsVisible(false);
    localStorage.setItem('onboarding_done', '1');
    setTimeout(onComplete, 300);
  };

  const handleSkip = () => {
    localStorage.setItem('onboarding_done', '1');
    setIsVisible(false);
    setTimeout(onComplete, 300);
  };

  if (!isVisible) return null;
  const s = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="ob-overlay">
      <div className="ob-modal">
        {/* Progress bar */}
        <div className="ob-progress-bar">
          <div className="ob-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Icon */}
        <div className="ob-icon">{s.icon}</div>

        {/* Step counter */}
        <div className="ob-step-count">{step + 1} of {STEPS.length}</div>

        {/* Content */}
        <h2 className="ob-title">{s.title}</h2>
        <p className="ob-desc">{s.desc}</p>

        {/* Dot indicators */}
        <div className="ob-dots">
          {STEPS.map((_, i) => (
            <button
              key={i}
              className={`ob-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
              onClick={() => setStep(i)}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="ob-actions">
          <button className="ob-skip" onClick={handleSkip}>Skip Tour</button>
          <button className="ob-next" onClick={handleNext}>
            {step === STEPS.length - 1 ? '🚀 Start Planning!' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const shouldShowOnboarding = () => !localStorage.getItem('onboarding_done');

export default OnboardingTour;
