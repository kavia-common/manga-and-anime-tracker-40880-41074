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
  const debounced = React.useRef(null);
  React.useEffect(() => {
    // Lazy init debounce
    if (!debounced.current) {
      debounced.current = (value) => {
        setSearch(value);
      };
    }
  }, [setSearch]);
  React.useEffect(() => { setLocalSearch(search); }, [search]);

  const onSignOut = async () => {
    try {
      if (supabase) await supabase.auth.signOut();
    } catch (e) {
      // swallow to avoid user-facing errors
      // optionally log
      // console.warn('Sign out error', e);
    }
    safeNavigate(navigate, '/', { replace: true });
  };

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
            onChange={(e) => {
              const v = e.target.value;
              setLocalSearch(v);
              // basic debounce
              if (debounced.currentTimer) clearTimeout(debounced.currentTimer);
              debounced.currentTimer = setTimeout(() => debounced.current?.(v), 300);
            }}
          />
        </div>
        <div className="kc-profile">
          <Link to="/library" className="kc-pill">My Library</Link>
          {user ? (
            <button className="kc-btn" onClick={onSignOut}>Sign out</button>
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
