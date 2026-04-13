import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './Profile.css';

const Profile = ({ user, onClose, onProfileUpdate }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]         = useState('');
  const [avatarColor, setAvatarColor] = useState('#C9A84C');
  const [profileData, setProfileData] = useState(null);
  const [stats, setStats]         = useState({ trips: 0, destinations: 0, countries: 0 });
  const [saving, setSaving]       = useState(false);
  const [saveMsg, setSaveMsg]     = useState(null);

  const avatarColors = ['#C9A84C','#5CB87A','#5B8FE8','#E05C5C','#A87CDC','#E8874C','#E87CBF'];

  useEffect(() => { fetchProfile(); fetchStats(); }, []);

  const fetchProfile = async () => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (data) {
        setFirstName(data.first_name || '');
        setLastName(data.last_name   || '');
        setEmail(user.email          || '');
        setAvatarColor(data.avatar_color || '#C9A84C');
        setProfileData(data);
      } else {
        setEmail(user.email || '');
        setFirstName(user.email?.split('@')[0] || '');
      }
    } catch (err) { console.error(err); }
  };

  const fetchStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const res = await fetch('http://localhost:3001/api/dashboard-stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) setStats(result.data);
    } catch {}
  };

  const showFeedback = (msg, type = 'success') => {
    setSaveMsg({ msg, type });
    setTimeout(() => setSaveMsg(null), 3000);
  };

  const handleSaveProfile = async () => {
    if (!firstName.trim()) return showFeedback('First name is required.', 'error');
    setSaving(true);
    try {
      const { data: existing } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
      let saveError = null;
      if (existing) {
        const { error } = await supabase.from('profiles')
          .update({ first_name: firstName.trim(), last_name: lastName.trim(), avatar_color: avatarColor, updated_at: new Date().toISOString() })
          .eq('id', user.id).select();
        saveError = error;
      } else {
        const { error } = await supabase.from('profiles')
          .insert({ id: user.id, email: user.email, first_name: firstName.trim(), last_name: lastName.trim(), avatar_color: avatarColor });
        saveError = error;
      }
      if (saveError) throw saveError;
      setFirstName(firstName.trim());
      setLastName(lastName.trim());
      showFeedback('Profile updated successfully!');
      if (onProfileUpdate) onProfileUpdate({ firstName: firstName.trim(), lastName: lastName.trim(), avatarColor });
    } catch (err) {
      showFeedback(err.message || 'Failed to update profile.', 'error');
    } finally { setSaving(false); }
  };

  const handleChangeEmail = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) return showFeedback('Enter a valid email.', 'error');
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      showFeedback('Confirmation email sent. Check your inbox!');
    } catch (err) {
      showFeedback(err.message || 'Failed to update email.', 'error');
    } finally { setSaving(false); }
  };

  const displayName = firstName || user?.email?.split('@')[0] || 'User';
  const initials = `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || displayName.charAt(0).toUpperCase();
  const createdAt = profileData?.created_at
    ? new Date(profileData.created_at).toLocaleDateString('en-IN', { year:'numeric', month:'long', day:'numeric' })
    : '—';

  return (
    <div className="prf-overlay" onClick={onClose}>
      <div className="prf-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="prf-header">
          <div className="prf-header-left">
            <div className="prf-header-icon">👤</div>
            <div>
              <h2>Profile</h2>
              <p>Manage your personal information</p>
            </div>
          </div>
          <button className="prf-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="prf-body">
          {saveMsg && (
            <div className={`prf-toast ${saveMsg.type}`}>
              {saveMsg.type === 'success' ? '✓' : '⚠'} {saveMsg.msg}
            </div>
          )}

          {/* Avatar section */}
          <div className="prf-avatar-section">
            <div className="prf-avatar" style={{ background: `linear-gradient(135deg, ${avatarColor}, #111110)` }}>
              {initials}
            </div>
            <div className="prf-avatar-details">
              <h3>{displayName} {lastName}</h3>
              <p>{user.email}</p>
              <span className="prf-since">Member since {createdAt}</span>
              <div className="prf-color-picker">
                <span>Avatar colour</span>
                <div className="prf-colors">
                  {avatarColors.map(c => (
                    <button key={c} className={`prf-color ${avatarColor === c ? 'active' : ''}`}
                      style={{ background: c }} onClick={() => setAvatarColor(c)} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="prf-divider" />

          {/* Name fields */}
          <div className="prf-section">
            <h4>Personal Information</h4>
            <div className="prf-row">
              <div className="prf-field">
                <label>First Name</label>
                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" />
              </div>
              <div className="prf-field">
                <label>Last Name</label>
                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" />
              </div>
            </div>
            <button className="prf-save-btn" onClick={handleSaveProfile} disabled={saving}>
              {saving ? <><span className="prf-spinner"/>Saving...</> : '💾 Save Profile'}
            </button>
          </div>

          <div className="prf-divider" />

          {/* Email */}
          <div className="prf-section">
            <h4>Email Address</h4>
            <div className="prf-field">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
            </div>
            <p className="prf-hint">A confirmation link will be sent to your new email.</p>
            <button className="prf-save-btn" onClick={handleChangeEmail} disabled={saving}>
              {saving ? <><span className="prf-spinner"/>Saving...</> : '📧 Update Email'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;