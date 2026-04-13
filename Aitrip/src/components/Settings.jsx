import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './Settings.css';

const Settings = ({ user, onClose, onLogout, darkMode, onToggleDarkMode }) => {
  const [activeSection, setActiveSection] = useState('appearance');
  const [saving, setSaving]               = useState(false);
  const [saveMsg, setSaveMsg]             = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput]     = useState('');
  const [deleting, setDeleting]           = useState(false);

  // Password
  const [newPw, setNewPw]       = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw]     = useState({ new: false, confirm: false });

  // Preferences
  const [defaultBudget, setDefaultBudget]         = useState('moderate');
  const [defaultCompanions, setDefaultCompanions] = useState('couple');

  useEffect(() => { fetchPreferences(); }, []);

  const fetchPreferences = async () => {
    try {
      const { data } = await supabase.from('profiles').select('default_budget,default_companions').eq('id', user.id).maybeSingle();
      if (data) {
        setDefaultBudget(data.default_budget || localStorage.getItem('default_budget') || 'moderate');
        setDefaultCompanions(data.default_companions || localStorage.getItem('default_companions') || 'couple');
      }
    } catch {}
  };

  const showFeedback = (msg, type = 'success') => {
    setSaveMsg({ msg, type });
    setTimeout(() => setSaveMsg(null), 3000);
  };

  const pwStrength = (pw) => {
    if (!pw) return { w:'0%', c:'', l:'' };
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return [
      { w:'0%',   c:'',         l:'' },
      { w:'25%',  c:'#E05C5C',  l:'Weak' },
      { w:'50%',  c:'#E8A94C',  l:'Fair' },
      { w:'75%',  c:'#C9A84C',  l:'Good' },
      { w:'100%', c:'#5CB87A',  l:'Strong' },
    ][s];
  };

  const handleChangePassword = async () => {
    if (!newPw)           return showFeedback('Enter a new password.', 'error');
    if (newPw.length < 8) return showFeedback('Password must be at least 8 characters.', 'error');
    if (newPw !== confirmPw) return showFeedback('Passwords do not match.', 'error');
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      setNewPw(''); setConfirmPw('');
      showFeedback('Password changed successfully!');
    } catch (err) {
      showFeedback(err.message || 'Failed to change password.', 'error');
    } finally { setSaving(false); }
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles')
        .update({ default_budget: defaultBudget, default_companions: defaultCompanions, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) throw error;
      localStorage.setItem('default_budget', defaultBudget);
      localStorage.setItem('default_companions', defaultCompanions);
      showFeedback('Preferences saved!');
    } catch (err) {
      showFeedback(err.message || 'Failed to save preferences.', 'error');
    } finally { setSaving(false); }
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== 'DELETE') return;
    setDeleting(true);
    try {
      await supabase.from('trips').delete().eq('user_id', user.id);
      await supabase.from('profiles').delete().eq('id', user.id);
      await supabase.auth.signOut();
      onLogout();
    } catch (err) {
      showFeedback('Failed to delete account.', 'error');
      setDeleting(false);
    }
  };

  const strength = pwStrength(newPw);

  const sections = [
    { id:'appearance', icon:'🌗', label:'Appearance' },
    { id:'security',   icon:'🔒', label:'Security' },
    { id:'preferences',icon:'⚙️', label:'Preferences' },
    { id:'danger',     icon:'⚠️', label:'Danger Zone' },
  ];

  return (
    <div className="stg-overlay" onClick={onClose}>
      <div className="stg-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="stg-header">
          <div className="stg-header-left">
            <div className="stg-header-icon">⚙️</div>
            <div>
              <h2>Settings</h2>
              <p>Manage your app preferences</p>
            </div>
          </div>
          <button className="stg-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body: nav + content */}
        <div className="stg-body">

          {/* Left nav */}
          <nav className="stg-nav">
            {sections.map(s => (
              <button
                key={s.id}
                className={`stg-nav-btn ${activeSection === s.id ? 'active' : ''} ${s.id === 'danger' ? 'danger' : ''}`}
                onClick={() => setActiveSection(s.id)}
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
            <div className="stg-nav-spacer" />
            <button className="stg-nav-btn logout" onClick={onLogout}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
              </svg>
              <span>Sign Out</span>
            </button>
          </nav>

          {/* Content */}
          <div className="stg-content">
            {saveMsg && (
              <div className={`stg-toast ${saveMsg.type}`}>
                {saveMsg.type === 'success' ? '✓' : '⚠'} {saveMsg.msg}
              </div>
            )}

            {/* ── APPEARANCE ── */}
            {activeSection === 'appearance' && (
              <div className="stg-section">
                <div className="stg-section-head">
                  <h3>Appearance</h3>
                  <p>Choose how the app looks</p>
                </div>

                <div className="stg-theme-card">
                  <div className="stg-theme-info">
                    <div className="stg-theme-icon">{darkMode ? '🌙' : '☀️'}</div>
                    <div>
                      <h4>{darkMode ? 'Dark Mode' : 'Light Mode'}</h4>
                      <p>{darkMode ? 'Easy on the eyes at night' : 'Clean and bright interface'}</p>
                    </div>
                  </div>
                  <button className={`stg-toggle ${darkMode ? 'on' : ''}`} onClick={onToggleDarkMode}>
                    <span className="stg-toggle-thumb" />
                  </button>
                </div>

                <div className="stg-theme-preview">
                  <div className={`stg-preview-box ${darkMode ? 'dark' : 'light'}`}>
                    <div className="stg-preview-nav" />
                    <div className="stg-preview-content">
                      <div className="stg-preview-card" />
                      <div className="stg-preview-card sm" />
                      <div className="stg-preview-card sm" />
                    </div>
                  </div>
                  <p>Current: <strong>{darkMode ? 'Dark' : 'Light'} Mode</strong></p>
                </div>
              </div>
            )}

            {/* ── SECURITY ── */}
            {activeSection === 'security' && (
              <div className="stg-section">
                <div className="stg-section-head">
                  <h3>Security</h3>
                  <p>Update your account password</p>
                </div>
                <div className="stg-fields">
                  <div className="stg-field">
                    <label>New Password</label>
                    <div className="stg-pw-wrap">
                      <input type={showPw.new ? 'text' : 'password'} value={newPw}
                        onChange={e => setNewPw(e.target.value)} placeholder="Min. 8 characters" />
                      <button className="stg-eye" onClick={() => setShowPw(p => ({...p, new: !p.new}))}>
                        {showPw.new ? '👁️' : '🙈'}
                      </button>
                    </div>
                    {newPw && (
                      <div className="stg-strength">
                        <div className="stg-strength-bar">
                          <div style={{ width: strength.w, background: strength.c }} />
                        </div>
                        <span style={{ color: strength.c }}>{strength.l}</span>
                      </div>
                    )}
                  </div>
                  <div className="stg-field">
                    <label>Confirm Password</label>
                    <div className="stg-pw-wrap">
                      <input type={showPw.confirm ? 'text' : 'password'} value={confirmPw}
                        onChange={e => setConfirmPw(e.target.value)} placeholder="Repeat new password" />
                      <button className="stg-eye" onClick={() => setShowPw(p => ({...p, confirm: !p.confirm}))}>
                        {showPw.confirm ? '👁️' : '🙈'}
                      </button>
                    </div>
                    {confirmPw && newPw !== confirmPw && <p className="stg-error">Passwords do not match</p>}
                    {confirmPw && newPw === confirmPw && newPw.length >= 8 && <p className="stg-success">✓ Passwords match</p>}
                  </div>
                  <button className="stg-save-btn" onClick={handleChangePassword}
                    disabled={saving || newPw !== confirmPw || newPw.length < 8}>
                    {saving ? <><span className="stg-spinner"/>Saving...</> : '🔒 Change Password'}
                  </button>
                </div>
              </div>
            )}

            {/* ── PREFERENCES ── */}
            {activeSection === 'preferences' && (
              <div className="stg-section">
                <div className="stg-section-head">
                  <h3>Trip Preferences</h3>
                  <p>Set defaults for your trip planning form</p>
                </div>
                <div className="stg-fields">
                  <div className="stg-field">
                    <label>Default Budget</label>
                    <div className="stg-opts three">
                      {[
                        { value:'cheap',    icon:'💵', label:'Low' },
                        { value:'moderate', icon:'💳', label:'Moderate' },
                        { value:'luxury',   icon:'💎', label:'Luxury' },
                      ].map(opt => (
                        <button key={opt.value}
                          className={`stg-opt ${defaultBudget === opt.value ? 'active' : ''}`}
                          onClick={() => setDefaultBudget(opt.value)}>
                          <span>{opt.icon}</span>
                          <span>{opt.label}</span>
                          {defaultBudget === opt.value && <span className="stg-check">✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="stg-field">
                    <label>Default Companions</label>
                    <div className="stg-opts four">
                      {[
                        { value:'single',  icon:'👤', label:'Solo' },
                        { value:'couple',  icon:'💑', label:'Couple' },
                        { value:'family',  icon:'👨‍👩‍👧‍👦', label:'Family' },
                        { value:'friends', icon:'👥', label:'Friends' },
                      ].map(opt => (
                        <button key={opt.value}
                          className={`stg-opt ${defaultCompanions === opt.value ? 'active' : ''}`}
                          onClick={() => setDefaultCompanions(opt.value)}>
                          <span>{opt.icon}</span>
                          <span>{opt.label}</span>
                          {defaultCompanions === opt.value && <span className="stg-check">✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button className="stg-save-btn" onClick={handleSavePreferences} disabled={saving}>
                    {saving ? <><span className="stg-spinner"/>Saving...</> : '✅ Save Preferences'}
                  </button>
                </div>
              </div>
            )}

            {/* ── DANGER ZONE ── */}
            {activeSection === 'danger' && (
              <div className="stg-section">
                <div className="stg-section-head">
                  <h3>Danger Zone</h3>
                  <p>Irreversible actions — proceed with caution</p>
                </div>
                <div className="stg-danger-card">
                  <div>
                    <h4>🗑️ Delete Account</h4>
                    <p>Permanently delete your account and all trip data. Cannot be undone.</p>
                  </div>
                  <button className="stg-danger-btn" onClick={() => setDeleteConfirm(true)}>Delete Account</button>
                </div>

                {deleteConfirm && (
                  <div className="stg-del-confirm">
                    <span style={{fontSize:'1.8rem'}}>⚠️</span>
                    <h4>Are you absolutely sure?</h4>
                    <p>All your trip plans and data will be permanently deleted.</p>
                    <div className="stg-field" style={{marginTop:'1rem', width:'100%'}}>
                      <label>Type <strong>DELETE</strong> to confirm</label>
                      <input type="text" value={deleteInput} onChange={e => setDeleteInput(e.target.value)} placeholder="Type DELETE" />
                    </div>
                    <div className="stg-del-btns">
                      <button className="stg-cancel-btn" onClick={() => { setDeleteConfirm(false); setDeleteInput(''); }}>Cancel</button>
                      <button className="stg-confirm-del" onClick={handleDeleteAccount}
                        disabled={deleteInput !== 'DELETE' || deleting}>
                        {deleting ? 'Deleting...' : 'Yes, Delete Everything'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;