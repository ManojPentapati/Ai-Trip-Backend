import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './Login.css';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Check if we have the access token in the URL hash
    const hash = window.location.hash;
    if (hash.includes('access_token')) {
      // Supabase will automatically recover the session from the hash
      console.log('Password reset link detected, session will be recovered');
    } else {
      // No valid reset link, redirect to login
      console.warn('No valid reset token found');
      setError('Invalid or expired reset link. Please request a new one.');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!password || password.length < 6) {
      return setError('Password must be at least 6 characters long.');
    }
    
    if (password !== confirmPassword) {
      return setError('Passwords do not match.');
    }
    
    setLoading(true);
    setError('');
    
    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) throw error;
      
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
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
        <p className="branding-subtitle">Enter your new password below.</p>
      </div>

      <div className="form-section">
        <div className="auth-card">
          <div className="auth-header">
            <h2>New Password</h2>
            <p>Create a strong password to secure your account</p>
          </div>

          {success ? (
            <div style={{textAlign:'center', padding:'1.5rem 0', display:'flex', flexDirection:'column', gap:'1rem', alignItems:'center'}}>
              <span style={{fontSize:'2.5rem'}}>✅</span>
              <h3 style={{fontFamily:'Playfair Display,serif', color:'#F5F2EC', margin:0}}>Password Reset Successful!</h3>
              <p style={{color:'#8A8880', fontSize:'0.85rem', fontFamily:'DM Sans,sans-serif', lineHeight:1.6}}>
                Your password has been successfully updated. Redirecting to sign in...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form">
              {error && <div className="error-message general-error">{error}</div>}
              
              <div className="form-group">
                <label>New Password</label>
                <div className="input-with-icon">
                  <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                  </svg>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter new password" 
                    disabled={loading}
                    minLength={6}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Confirm Password</label>
                <div className="input-with-icon">
                  <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                  </svg>
                  <input 
                    type="password" 
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password" 
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? <><span className="loading-spinner" />Updating...</> : 'Update Password'}
              </button>
              
              <div className="auth-footer">
                <a href="/login" className="form-link">← Back to Sign In</a>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
