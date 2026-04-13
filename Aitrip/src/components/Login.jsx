import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { getUserProfile } from '../dbOperations';
import './Login.css';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') !== 'light');
  const [isAdminMode, setIsAdminMode] = useState(false);

  React.useEffect(() => {
    document.body.classList.toggle('light-mode', !darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const navigate = useNavigate();

  const googleLogin = async () => {
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
      setErrors({ general: error.message || 'Google login failed. Please try again.' });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email address is invalid';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    setErrors({});
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      let userProfile = null;
      try { userProfile = await getUserProfile(data.user.id); } catch {}

      onLogin({
        email: data.user.email,
        id: data.user.id,
        firstName: userProfile?.first_name,
        lastName: userProfile?.last_name
      });
      navigate('/dashboard');
    } catch (error) {
      setErrors({ general: error.message || 'Login failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
      {/* Mobile brand banner — shows when branding panel is hidden */}
      <div className="mobile-brand-banner">
        <div className="mb-icon">✈</div>
        <span>AI<em>Trip</em></span>
      </div>
      {/* ── Branding panel ── */}
      <div className="branding-section">
        <div className="branding-badge">
          <span className="branding-badge-dot" />
          <span className="branding-badge-text">AI-Powered Travel</span>
        </div>

        <h1 className="branding-title">
          Plan your<br />
          next <span>adventure</span><br />
          smarter.
        </h1>

        <div className="branding-divider" />

        <p className="branding-subtitle">
          Personalised itineraries crafted by AI — tailored to your budget, style, and travel companions.
        </p>

        <div className="branding-stats">
          <div className="stat-item">
            <span className="stat-number">50+</span>
            <span className="stat-label">Destinations</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">AI</span>
            <span className="stat-label">Powered</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">∞</span>
            <span className="stat-label">Possibilities</span>
          </div>
        </div>
      </div>

      {/* ── Form panel ── */}
      <div className={`form-section ${isAdminMode ? 'admin-mode' : ''}`}>
        <div className="auth-card">
          <div className="auth-header">
            <h2>{isAdminMode ? 'Admin Portal' : 'Welcome back'}</h2>
            {isAdminMode && <p style={{fontSize:'0.8rem', color:'rgba(245,242,236,0.6)', marginTop:'0.5rem'}}>Enter administrator credentials to access dashboard</p>}
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {errors.general && (
              <div className="error-message general-error">{errors.general}</div>
            )}

            {/* Email */}
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-with-icon">
                <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
                <input
                  type="email" id="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={errors.email ? 'error' : ''}
                  placeholder="you@example.com"
                  disabled={isLoading}
                />
              </div>
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            {/* Password */}
            <div className="form-group">
              <div className="form-row">
                <label htmlFor="password">Password</label>
                <Link to="/forgot-password" className="form-link">Forgot password?</Link>
              </div>
              <div className="input-with-icon">
                <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                </svg>
                <input
                  type={showPassword ? 'text' : 'password'} id="password" value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={errors.password ? 'error' : ''}
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
                <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            {/* Remember me */}
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input type="checkbox" />
                <span className="checkmark" />
                Remember me for 30 days
              </label>
            </div>

            {/* Sign in button */}
            <button type="submit" className="auth-button" disabled={isLoading}>
              {isLoading ? (
                <><span className="loading-spinner" />Signing in...</>
              ) : 'Sign In'}
            </button>

            {!isAdminMode ? (
              <>
                <div className="divider">
                  <div className="divider-line" />
                  <span className="divider-text">or</span>
                  <div className="divider-line" />
                </div>

                {/* Google */}
                <button type="button" className="google-login-button" onClick={googleLogin} disabled={googleLoading}>
                  {googleLoading ? (
                    <><span className="loading-spinner" style={{borderTopColor:'var(--off-white)'}} />Signing in...</>
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
              </>
            ) : (
                <div style={{height: '2rem'}}></div>
            )}

            <div className="auth-footer" style={{flexDirection: 'column', marginTop: isAdminMode ? '2rem': '0' }}>
              <div style={{display:'flex', flexDirection: 'column', gap:'0.8rem', justifyContent: 'center', alignItems: 'center'}}>
                <p style={{margin:0, padding:0, color: 'var(--muted)', fontSize: '0.9rem'}}>Don't have an account yet?</p>
                <Link to="/signup" className="auth-footer-cta" style={{width: '100%', textAlign: 'center'}}>
                  Create a free account →
                </Link>
              </div>
              <div style={{display:'flex', width: '100%', justifyContent:'center', marginTop: '2rem'}}>
                 <button 
                   type="button" 
                   onClick={() => setIsAdminMode(!isAdminMode)} 
                   style={{background:'none', border:'none', color:'#C9A84C', cursor:'pointer', fontSize:'0.75rem', fontWeight:'600', textDecoration:'underline', display:'flex', alignItems:'center', gap:'0.4rem'}}
                 >
                   {isAdminMode ? '← Back to User Login' : '🛡️ Admin Portal Login'}
                 </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;