import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

// PUBLIC_INTERFACE
export function Auth() {
  /**
   * Authentication page. Uses Supabase email/password as baseline.
   * If env vars are missing, shows information and disables controls.
   */
  const { supabase, envWarning } = useAppContext();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const guard = () => {
    if (!supabase) {
      setError(envWarning || 'Supabase is not configured.');
      return false;
    }
    return true;
  };

  const signIn = async (e) => {
    e.preventDefault();
    setError(null);
    if (!guard()) return;
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password: pass });
    setBusy(false);
    if (err) setError(err.message);
    else navigate('/library');
  };

  const signUp = async (e) => {
    e.preventDefault();
    setError(null);
    if (!guard()) return;
    setBusy(true);
    const { error: err } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        emailRedirectTo: process.env.REACT_APP_FRONTEND_URL || window.location.origin
      }
    });
    setBusy(false);
    if (err) setError(err.message);
    else navigate('/library');
  };

  return (
    <div style={{ maxWidth: 420, margin: '40px auto' }}>
      <h2>Sign in</h2>
      {envWarning && <div className="kc-env-warn" style={{ marginBottom: 12 }}>{envWarning}</div>}
      {error && <div className="kc-pill kc-danger" style={{ marginBottom: 12 }}>{error}</div>}
      <form onSubmit={signIn}>
        <div style={{ display: 'grid', gap: 10 }}>
          <input
            type="email"
            placeholder="Email"
            aria-label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="kc-search"
            style={{ padding: 10, borderRadius: 10, border: '1px solid var(--kc-border)' }}
          />
          <input
            type="password"
            placeholder="Password"
            aria-label="Password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            className="kc-search"
            style={{ padding: 10, borderRadius: 10, border: '1px solid var(--kc-border)' }}
          />
          <button type="submit" className="kc-btn primary" disabled={busy || !supabase}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <button type="button" onClick={signUp} className="kc-btn" disabled={busy || !supabase}>
            Create account
          </button>
        </div>
      </form>
    </div>
  );
}
