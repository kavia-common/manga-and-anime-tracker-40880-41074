import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { safeNavigate } from '../utils/redirects';

// PUBLIC_INTERFACE
export function TopBar() {
  /** Top navigation bar: brand, search, profile/auth button. */
  const { search, setSearch, user, supabase, envWarning } = useAppContext();
  const navigate = useNavigate();
  const [localSearch, setLocalSearch] = React.useState(search);
  const timerRef = React.useRef(null);
  const [signingOut, setSigningOut] = React.useState(false);

  React.useEffect(() => { setLocalSearch(search); }, [search]);

  // Promise.race guard to prevent hanging sign-out in rare cases
  const withTimeout = async (p, ms = 3000) => {
    let to;
    try {
      const res = await Promise.race([
        p,
        new Promise((_r, rej) => { to = setTimeout(() => rej(new Error('timeout')), ms); })
      ]);
      return res;
    } finally {
      if (to) clearTimeout(to);
    }
  };

  const onSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      if (supabase) {
        await withTimeout(supabase.auth.signOut());
      }
    } catch {
      // swallow to avoid user-facing errors
    } finally {
      // Navigate to a safe route regardless to avoid being stuck on protected screens.
      safeNavigate(navigate, '/', { replace: true });
      setSigningOut(false);
    }
  };

  const onSearchChange = (v) => {
    setLocalSearch(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setSearch(v), 300);
  };

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <header className="kc-topbar">
      <div className="kc-topbar-inner">
        <div>
          <Link to="/" className="kc-brand">Koma Corner</Link>
        </div>
        <div className="kc-search">
          <input
            aria-label="Search titles"
            placeholder="Search titles..."
            value={localSearch}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="kc-profile">
          <Link to="/library" className="kc-pill">My Library</Link>
          {user ? (
            <button className="kc-btn" onClick={onSignOut} disabled={signingOut}>
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          ) : (
            <Link to="/auth" className="kc-btn primary">Sign in</Link>
          )}
        </div>
      </div>
      {envWarning && (
        <div className="kc-topbar-inner" style={{ marginTop: 8 }}>
          <div className="kc-env-warn">{envWarning}</div>
        </div>
      )}
    </header>
  );
}
