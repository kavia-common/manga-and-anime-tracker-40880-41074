import React from 'react';
import { useAppContext } from '../context/AppContext';

// PUBLIC_INTERFACE
export function Settings() {
  /** Settings/Profile page with sign out and feature flags. */
  const { user, supabase } = useAppContext();
  const featureFlags = (process.env.REACT_APP_FEATURE_FLAGS || '').split(',').map(s => s.trim()).filter(Boolean);

  const onSignOut = async () => {
    try {
      await supabase?.auth.signOut();
    } catch {
      // swallow
    }
    // Rely on TopBar sign out flow for navigation; here we just call sign out.
  };

  if (!user) return <div className="kc-empty">Please sign in to view settings.</div>;

  return (
    <div>
      <div className="kc-section">
        <h2 style={{ margin: 0 }}>Settings</h2>
      </div>
      <div className="kc-card">
        <div className="kc-card-body">
          <div><strong>Email:</strong> {user.email}</div>
          <div style={{ marginTop: 10 }}>
            <button className="kc-btn" onClick={onSignOut}>Sign out</button>
          </div>
        </div>
      </div>

      <div className="kc-section" style={{ marginTop: 16 }}>
        <h3 style={{ margin: 0 }}>Feature Flags</h3>
      </div>
      <div className="kc-card">
        <div className="kc-card-body">
          {featureFlags.length ? (
            <ul>
              {featureFlags.map(f => <li key={f}><code>{f}</code></li>)}
            </ul>
          ) : (
            <div className="kc-subtle">No feature flags enabled.</div>
          )}
        </div>
      </div>
    </div>
  );
}
