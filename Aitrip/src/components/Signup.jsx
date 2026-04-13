import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { createUserProfile } from '../dbOperations';
import './Signup.css';

const Signup = ({ onSignup }) => {
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [legalModal, setLegalModal] = useState(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') !== 'light');

  React.useEffect(() => {
    document.body.classList.toggle('light-mode', !darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const navigate = useNavigate();

  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    const map = [
      { label: '', color: '', width: '0%' },
      { label: 'Weak', color: '#E05C5C', width: '25%' },
      { label: 'Fair', color: '#E8A94C', width: '50%' },
      { label: 'Good', color: '#C9A84C', width: '75%' },
      { label: 'Strong', color: '#5CB87A', width: '100%' },
    ];
    return map[score];
  };

  const strength = getPasswordStrength(formData.password);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const googleSignup = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          queryParams: { access_type: 'offline', prompt: 'consent' }
        }
      });
      if (error) throw error;
    } catch (error) {
      setGoogleLoading(false);
      setErrors({ general: error.message || 'Google signup failed. Please try again.' });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!agreedToTerms) newErrors.terms = 'You must agree to the terms';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    setErrors({});
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: { first_name: formData.firstName, last_name: formData.lastName }
        }
      });
      if (error) throw error;

      if (data.user) {
        try {
          await createUserProfile(data.user.id, {
            email: formData.email,
            first_name: formData.firstName,
            last_name: formData.lastName,
          });
        } catch {}

        onSignup({ email: data.user.email, id: data.user.id, firstName: formData.firstName, lastName: formData.lastName });
        navigate('/dashboard');
      }
    } catch (error) {
      setErrors({ general: error.message || 'Signup failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const EyeOpen = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
    </svg>
  );
  const EyeOff = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27z"/>
    </svg>
  );

  return (
    <>
    <div className="auth-layout">
      {/* Theme toggle */}
      <button
        className="auth-theme-toggle"
        onClick={() => setDarkMode(d => !d)}
        aria-label="Toggle theme"
        title={darkMode ? 'Switch to Light mode' : 'Switch to Dark mode'}
      >
        {darkMode ? '☀️' : '🌙'}
      </button>
      {/* Mobile brand banner */}
      <div className="mobile-brand-banner">
        <div className="mb-icon">✈</div>
        <span>AI<em>Trip</em></span>
      </div>
      {/* ── Branding panel ── */}
      <div className="branding-section">
        <div className="branding-badge">
          <span className="branding-badge-dot" />
          <span className="branding-badge-text">Join for free</span>
        </div>

        <h1 className="branding-title">
          Your journey<br />
          begins <span>here.</span>
        </h1>

        <div className="branding-divider" />

        <p className="branding-subtitle">
          Create your account and let AI plan your perfect trip — personalised, effortless, unforgettable.
        </p>

        <div className="branding-perks">
          {[
            { icon: '🗺️', text: 'AI-generated day-by-day itineraries' },
            { icon: '💰', text: 'Budget-aware recommendations' },
            { icon: '📍', text: '50+ Indian destinations covered' },
            { icon: '📂', text: 'Save & revisit your trip history' },
          ].map((perk, i) => (
            <div className="perk-item" key={i}>
              <div className="perk-icon">{perk.icon}</div>
              <span className="perk-text">{perk.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Form panel ── */}
      <div className="form-section">
        <div className="auth-card">
          <div className="auth-header">
            <h2>
              <span className="heading-icon">✈️</span>
              Create account
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {errors.general && (
              <div className="error-message general-error">{errors.general}</div>
            )}

            {/* Name row */}
            <div className="form-row-half">
              <div className="form-group" style={{marginBottom:0}}>
                <label htmlFor="firstName">First name</label>
                <div className="input-with-icon">
                  <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                  <input type="text" id="firstName" name="firstName" value={formData.firstName}
                    onChange={handleChange} placeholder="First name"
                    className={errors.firstName ? 'error' : ''} disabled={isLoading} />
                </div>
                {errors.firstName && <span className="error-message">{errors.firstName}</span>}
              </div>

              <div className="form-group" style={{marginBottom:0}}>
                <label htmlFor="lastName">Last name</label>
                <div className="input-with-icon">
                  <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                  <input type="text" id="lastName" name="lastName" value={formData.lastName}
                    onChange={handleChange} placeholder="Last name"
                    className={errors.lastName ? 'error' : ''} disabled={isLoading} />
                </div>
                {errors.lastName && <span className="error-message">{errors.lastName}</span>}
              </div>
            </div>

            {/* Email */}
            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <div className="input-with-icon">
                <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
                <input type="email" id="email" name="email" value={formData.email}
                  onChange={handleChange} placeholder="you@example.com"
                  className={errors.email ? 'error' : ''} disabled={isLoading} />
              </div>
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            {/* Password */}
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-with-icon">
                <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                </svg>
                <input type={showPassword ? 'text' : 'password'} id="password" name="password"
                  value={formData.password} onChange={handleChange} placeholder="Min. 8 characters"
                  className={errors.password ? 'error' : ''} disabled={isLoading} />
                <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOpen /> : <EyeOff />}
                </button>
              </div>
              {errors.password && <span className="error-message">{errors.password}</span>}
              {formData.password && (
                <div className="password-strength-indicator">
                  <div className="password-strength-label">
                    <span>Password strength</span>
                    <span style={{color: strength.color}}>{strength.label}</span>
                  </div>
                  <div className="password-strength-bar">
                    <div className="password-strength-fill" style={{width: strength.width, backgroundColor: strength.color}} />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm password</label>
              <div className="input-with-icon">
                <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                </svg>
                <input type={showConfirm ? 'text' : 'password'} id="confirmPassword" name="confirmPassword"
                  value={formData.confirmPassword} onChange={handleChange} placeholder="Repeat password"
                  className={errors.confirmPassword ? 'error' : ''} disabled={isLoading} />
                <button type="button" className="toggle-password" onClick={() => setShowConfirm(!showConfirm)}>
                  {showConfirm ? <EyeOpen /> : <EyeOff />}
                </button>
              </div>
              {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
            </div>

            {/* Terms */}
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} />
                <span className="checkmark" />
                I agree to the{' '}
                <button type="button" className="form-link" style={{fontSize:'0.8rem',margin:'0 3px',background:'none',border:'none',padding:0,cursor:'pointer'}} onClick={() => setLegalModal('terms')}>Terms of Service</button>
                {' '}and{' '}
                <button type="button" className="form-link" style={{fontSize:'0.8rem',marginLeft:'3px',background:'none',border:'none',padding:0,cursor:'pointer'}} onClick={() => setLegalModal('privacy')}>Privacy Policy</button>
              </label>
              {errors.terms && <span className="error-message" style={{marginLeft:'26px'}}>{errors.terms}</span>}
            </div>

            {/* Submit */}
            <button type="submit" className="auth-button" disabled={isLoading}>
              {isLoading ? (
                <><span className="loading-spinner" />Creating account...</>
              ) : 'Create Account'}
            </button>

            <div className="divider">
              <div className="divider-line" />
              <span className="divider-text">or</span>
              <div className="divider-line" />
            </div>

            {/* Google */}
            <button type="button" className="google-login-button" onClick={googleSignup} disabled={googleLoading}>
              {googleLoading ? (
                <><span className="loading-spinner" style={{borderTopColor:'var(--off-white)'}} />Signing up...</>
              ) : (
                <>
                  <svg className="google-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            <div className="auth-footer">
              <p>Already have an account? <Link to="/login" className="form-link">Sign in</Link></p>
            </div>
          </form>
        </div>
      </div>
    </div>

      {/* Legal modal */}
      {legalModal && (
        <div className="su-legal-overlay" onClick={() => setLegalModal(null)}>
          <div className="su-legal-modal" onClick={e => e.stopPropagation()}>
            <div className="su-legal-header">
              <div className="su-legal-title">
                <span>{legalModal === 'terms' ? '📄' : '🔒'}</span>
                <h2>{legalModal === 'terms' ? 'Terms of Service' : 'Privacy Policy'}</h2>
              </div>
              <button className="su-legal-close" onClick={() => setLegalModal(null)} aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <p className="su-legal-meta">Last updated: March 2026 · AI Trip Planner · Vignan University</p>
            <div className="su-legal-body">
              {legalModal === 'terms' ? (
                <>
                  <div className="su-legal-section"><h3>1. Acceptance of Terms</h3><p>By accessing and using AI Trip Planner, you agree to be bound by these Terms. This is a Final Year Project developed at Vignan University for educational purposes.</p></div>
                  <div className="su-legal-section"><h3>2. Use of the Service</h3><p>You may use the Service to generate AI-powered travel itineraries for personal, non-commercial use. You agree not to misuse AI features, share credentials, or spam trip generation.</p></div>
                  <div className="su-legal-section"><h3>3. AI-Generated Content</h3><p>Trip itineraries are generated by AI and are for informational purposes only. Always verify travel information with official sources before booking.</p></div>
                  <div className="su-legal-section"><h3>4. Account Responsibility</h3><p>You are responsible for maintaining the confidentiality of your account and password. Notify us immediately of any unauthorized use.</p></div>
                  <div className="su-legal-section"><h3>5. Intellectual Property</h3><p>The AI Trip Planner platform, its design, code, and features are the intellectual property of the project team at Vignan University.</p></div>
                  <div className="su-legal-section"><h3>6. Limitation of Liability</h3><p>The Service is provided "as is" without warranties. We are not liable for any damages arising from reliance on AI-generated travel information.</p></div>
                  <div className="su-legal-section"><h3>7. Changes to Terms</h3><p>We reserve the right to modify these terms at any time. Continued use constitutes acceptance of the updated terms.</p></div>
                  <div className="su-legal-section"><h3>8. Contact</h3><p>For questions, contact us through Vignan University's Department of Computer Science &amp; Engineering.</p></div>
                </>
              ) : (
                <>
                  <div className="su-legal-section"><h3>1. Information We Collect</h3><p>We collect your name, email, trip preferences (destination, duration, budget), and usage data such as trip history and favourites.</p></div>
                  <div className="su-legal-section"><h3>2. How We Use Your Information</h3><p>We use it to generate personalized itineraries, save your trip history, improve our ML model, and maintain the service.</p></div>
                  <div className="su-legal-section"><h3>3. Data Storage</h3><p>Your data is stored securely using Supabase (PostgreSQL) with Row Level Security, meaning only you can access your trip data.</p></div>
                  <div className="su-legal-section"><h3>4. Third-Party Services</h3><p>We use Supabase (auth &amp; database), Google Gemini AI (trip generation), and Google OAuth (optional login). Your trip data is sent to Gemini to generate itineraries.</p></div>
                  <div className="su-legal-section"><h3>5. Data Retention</h3><p>Your data is retained while your account is active. You can delete trips or your entire account anytime from Settings.</p></div>
                  <div className="su-legal-section"><h3>6. Your Rights</h3><p>You have the right to access, update, export (PDF), or delete all data we hold about you at any time.</p></div>
                  <div className="su-legal-section"><h3>7. Security</h3><p>We use JWT authentication, Row Level Security, HTTPS encryption, and input validation. No internet transmission is 100% secure.</p></div>
                  <div className="su-legal-section"><h3>8. Contact</h3><p>For privacy concerns, contact us through Vignan University's Department of Computer Science &amp; Engineering.</p></div>
                </>
              )}
            </div>
            <div className="su-legal-footer">
              <button className="su-legal-switch" onClick={() => setLegalModal(legalModal === 'terms' ? 'privacy' : 'terms')}>
                {legalModal === 'terms' ? 'View Privacy Policy →' : '← View Terms of Service'}
              </button>
              <button className="su-legal-agree" onClick={() => { setAgreedToTerms(true); setLegalModal(null); }}>
                ✓ I Agree
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Signup;