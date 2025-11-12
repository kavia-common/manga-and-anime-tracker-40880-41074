import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

// PUBLIC_INTERFACE
export function Auth() {
  /**
   * Authentication page.
   * - Email/password baseline
   * - Google OAuth via Supabase Auth
   * If env vars are missing, shows information and disables controls.
   */
  const { supabase, envWarning } = useAppContext();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);
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

  // PUBLIC_INTERFACE
  const signInWithGoogle = async () => {
    /** Initiates Google OAuth sign-in using Supabase. */
    setError(null);
    if (!guard()) return;
    setOauthBusy(true);
    try {
      const redirectTo = process.env.REACT_APP_FRONTEND_URL || window.location.origin;
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      });
      // Note: For OAuth, Supabase typically redirects away; this code continues only if popup or error occurs.
      if (err) {
        setError(err.message || 'Failed to start Google sign-in.');
        setOauthBusy(false);
      }
    } catch (e) {
      setError(e?.message || 'Failed to start Google sign-in.');
      setOauthBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: '40px auto' }}>
      <h2>Sign in</h2>
      {envWarning && <div className="kc-env-warn" style={{ marginBottom: 12 }}>{envWarning}</div>}
      {error && <div className="kc-pill kc-danger" role="alert" aria-live="polite" style={{ marginBottom: 12 }}>{error}</div>}

      <div className="kc-card" style={{ marginBottom: 16 }}>
        <div className="kc-card-body">
          <button
            type="button"
            onClick={signInWithGoogle}
            className="kc-btn primary"
            disabled={oauthBusy || busy || !supabase}
            aria-busy={oauthBusy ? 'true' : 'false'}
            style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
          >
            {oauthBusy ? 'Connecting to Google…' : (
              <>
                {/* Simple G icon replacement for minimal style */}
                <span
                  aria-hidden="true"
                  style={{
                    display: 'inline-block',
                    width: 16,
                    height: 16,
                    borderRadius: 3,
                    background: '#FFFFFF',
                    boxShadow: 'inset 0 0 0 2px #4285F4',
                  }}
                />
                Continue with Google
              </>
            )}
          </button>
        </div>
      </div>

      <div className="kc-subtle" style={{ textAlign: 'center', margin: '6px 0 12px' }}>or sign in with email</div>

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
          <button type="submit" className="kc-btn primary" disabled={busy || !supabase || oauthBusy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <button type="button" onClick={signUp} className="kc-btn" disabled={busy || !supabase || oauthBusy}>
            Create account
          </button>
        </div>
      </form>
    </div>
  );
}
