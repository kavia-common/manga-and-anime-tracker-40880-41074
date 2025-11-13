import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { getSafeRedirectFromParams, safeNavigate, buildSupabaseRedirectTo, isSafeRedirect, normalizeToPath } from '../utils/redirects';

// PUBLIC_INTERFACE
export function Auth() {
  /**
   * Authentication page.
   * - Email/password only
   * - Safe redirect support: accepts ?redirect=/path and validates same-origin path
   * If env vars are missing, shows information and disables controls.
   */
  const { supabase, envWarning } = useAppContext();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Determine post-auth target from query (?redirect=/path), with hard fallback to '/library'
  const defaultAfterAuth = '/library';
  const afterAuth = useMemo(() => {
    try {
      const safe = getSafeRedirectFromParams(location?.search || '', 'redirect', defaultAfterAuth);
      // Ensure it's one of the allowed paths; otherwise fallback
      return isSafeRedirect(safe) ? normalizeToPath(safe, defaultAfterAuth) : defaultAfterAuth;
    } catch {
      return defaultAfterAuth;
    }
  }, [location?.search]);

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
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (err) {
        setError(err.message);
      } else {
        safeNavigate(navigate, afterAuth, { replace: true, fallback: defaultAfterAuth });
      }
    } catch (ex) {
      setError(ex?.message || 'Unexpected error during sign-in.');
    } finally {
      setBusy(false);
    }
  };

  const signUp = async (e) => {
    e.preventDefault();
    setError(null);
    if (!guard()) return;
    setBusy(true);
    try {
      const emailRedirectTo = buildSupabaseRedirectTo(afterAuth || defaultAfterAuth);
      const { error: err } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          emailRedirectTo
        }
      });
      if (err) {
        setError(err.message);
      } else {
        // After initiating sign-up, navigate to target (user may need to confirm email)
        safeNavigate(navigate, afterAuth, { replace: true, fallback: defaultAfterAuth });
      }
    } catch (ex) {
      setError(ex?.message || 'Unexpected error during sign-up.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: '40px auto' }}>
      <h2>Sign in</h2>
      {envWarning && <div className="kc-env-warn" style={{ marginBottom: 12 }}>{envWarning}</div>}
      {error && <div className="kc-pill kc-danger" role="alert" aria-live="polite" style={{ marginBottom: 12 }}>{error}</div>}

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
