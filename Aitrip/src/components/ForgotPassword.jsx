import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './Login.css';

const ForgotPassword = () => {
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return setError('Please enter your email address.');
    setLoading(true); setError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(err.message || 'Failed to send reset email.');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-layout">
      <div className="mobile-brand-banner">
        <div className="mb-icon">✈</div>
        <span>AI<em>Trip</em></span>
      </div>

      <div className="branding-section">
        <h1 className="branding-title">Reset your<br /><span>password.</span></h1>
        <div className="branding-divider" />
        <p className="branding-subtitle">Enter your email and we'll send you a link to reset your password.</p>
      </div>

      <div className="form-section">
        <div className="auth-card">
          <div className="auth-header">
            <h2>Forgot Password</h2>
            <p>We'll send a reset link to your email</p>
          </div>

          {sent ? (
            <div style={{textAlign:'center', padding:'1.5rem 0', display:'flex', flexDirection:'column', gap:'1rem', alignItems:'center'}}>
              <span style={{fontSize:'2.5rem'}}>📧</span>
              <h3 style={{fontFamily:'Playfair Display,serif', color:'#F5F2EC', margin:0}}>Check your inbox!</h3>
              <p style={{color:'#8A8880', fontSize:'0.85rem', fontFamily:'DM Sans,sans-serif', lineHeight:1.6}}>
                We've sent a password reset link to <strong style={{color:'#E8C97A'}}>{email}</strong>
              </p>
              <Link to="/login" className="auth-button" style={{textDecoration:'none', display:'inline-block', textAlign:'center', marginTop:'0.5rem'}}>
                ← Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form">
              {error && <div className="error-message general-error">{error}</div>}
              <div className="form-group">
                <label>Email Address</label>
                <div className="input-with-icon">
                  <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                  </svg>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com" disabled={loading} />
                </div>
              </div>
              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? <><span className="loading-spinner" />Sending...</> : 'Send Reset Link'}
              </button>
              <div className="auth-footer">
                <Link to="/login" className="form-link">← Back to Sign In</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;