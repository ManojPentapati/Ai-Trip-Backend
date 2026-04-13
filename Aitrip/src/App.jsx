import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { supabase } from './supabaseClient';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import TermsAndPrivacy from './components/TermsAndPrivacy';
import ErrorBoundary from './components/ErrorBoundary';
import SharedTrip from './components/SharedTrip';
import './App.css';

function App() {
  const [user, setUser]                   = useState(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && isMounted) {
          setUser({ email: session.user.email, id: session.user.id });
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        if (isMounted) setIsInitializing(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === 'PASSWORD_RECOVERY') {
        // User clicked reset link — show reset password page, don't redirect to dashboard
        setIsPasswordRecovery(true);
        setUser(null);
      } else if (event === 'SIGNED_IN') {
        if (!isPasswordRecovery) {
          setUser({ email: session?.user.email, id: session?.user.id });
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsPasswordRecovery(false);
      }
      setIsInitializing(false);
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe && subscription.unsubscribe();
    };
  }, []);

  const handleLogin  = (userData) => { setUser(userData); setIsPasswordRecovery(false); };
  const handleSignup = (userData) => setUser(userData);
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsPasswordRecovery(false);
  };

  if (isInitializing) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111110', color: '#c9a84c', fontFamily: 'DM Sans, sans-serif' }}>
        Loading experience...
      </div>
    );
  }

  return (
    <GoogleOAuthProvider
      clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
      scriptProps={{ defer: false, async: false, crossOrigin: 'anonymous' }}
    >
      <ErrorBoundary>
        <Router>
          <div className="app">
            <Routes>
              <Route path="/login"           element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/dashboard" />} />
              <Route path="/signup"          element={!user ? <Signup onSignup={handleSignup} /> : <Navigate to="/dashboard" />} />
              <Route path="/dashboard"       element={user  ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} />
              <Route path="/shared/:tripId"   element={<SharedTrip />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password"  element={<ResetPassword />} />
              <Route path="/terms"           element={<Navigate to="/signup" />} />
              <Route path="/privacy"         element={<Navigate to="/signup" />} />
              <Route path="*"               element={<Navigate to={user ? "/dashboard" : "/login"} />} />
            </Routes>
          </div>
        </Router>
      </ErrorBoundary>
    </GoogleOAuthProvider>
  );
}

export default App;