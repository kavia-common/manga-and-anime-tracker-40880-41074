import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { logEvent } from '../utils/analytics';

// PUBLIC_INTERFACE
export function Dashboard() {
  /**
   * Personalized dashboard:
   * - Continue Watching/Reading (from current list if present)
   * - Favorites
   * - Recommended from favorites' genres, fallback to trending
   * For anonymous users: show trending and sign-in prompt.
   */
  const { user, CatalogAPI, ratings, lists } = useAppContext();
  const [trending, setTrending] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [current, setCurrent] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setBusy(true);
      // Always load trending for anon recommendation baseline
      const trend = await CatalogAPI.getTrendingMedia({ type: 'ANIME', page: 1, perPage: 12 });
      if (!mounted) return;
      setTrending(trend);

      if (!user) {
        setBusy(false);
        return;
      }

      // favorites/current minimal loaders using list IDs from context lists when available
      const favIds = (lists?.favorite || []).map(x => x.media_id);
      const curIds = (lists?.current || []).map(x => x.media_id);
      if (favIds.length) {
        const items = await CatalogAPI.getMinimalByIds(favIds);
        if (!mounted) return;
        setFavorites(items);
      } else {
        setFavorites([]);
      }
      if (curIds.length) {
        const items = await CatalogAPI.getMinimalByIds(curIds);
        if (!mounted) return;
        setCurrent(items);
      } else {
        setCurrent([]);
      }

      // build recommendation pool by taking top genres from favorites, else trending
      let recPool = [];
      try {
        const allFavDetails = await Promise.all((favIds.slice(0, 6)).map(id => CatalogAPI.getMediaDetails(id)));
        const topGenres = {};
        allFavDetails.filter(Boolean).forEach(it => {
          (it.genres || []).forEach(g => { topGenres[g] = (topGenres[g] || 0) + 1; });
        });
        const selectedGenres = Object.entries(topGenres).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([g])=>g);
        if (selectedGenres.length) {
          // use trending and filter by selected genres
          recPool = trend.filter(it => it.genres?.some(g => selectedGenres.includes(g)));
        }
      } catch {
        // ignore
      }
      if (!recPool.length) recPool = trend.slice(0, 12);
      if (mounted) setRecommended(recPool);

      setBusy(false);
      logEvent('dashboard_loaded', { user: !!user });
    })();
    return () => { mounted = false; };
  }, [user, CatalogAPI, lists]);

  return (
    <div>
      <div className="kc-section">
        <h2 style={{ margin: 0 }}>{user ? 'Your Dashboard' : 'Welcome to Koma Corner'}</h2>
        {!user && <div className="kc-subtle">Trending picks and a prompt to sign in</div>}
      </div>

      {!user && (
        <div className="kc-card" style={{ padding: 12, marginBottom: 12 }}>
          <div className="kc-subtle">Sign in to sync your favorites, track progress, and get tailored recommendations.</div>
          <Link to="/auth" className="kc-btn primary" style={{ marginTop: 8, display: 'inline-block' }}>Sign in</Link>
        </div>
      )}

      {busy && <div className="kc-empty">Loading…</div>}

      {user && (
        <>
          <section>
            <div className="kc-section">
              <h3 style={{ margin: 0 }}>Continue Watching/Reading</h3>
              <span className="kc-subtle">{current.length} items</span>
            </div>
            {current.length ? (
              <div className="kc-grid">
                {current.map(item => (
                  <Link to={`/title/${item.id}`} key={item.id} className="kc-card">
                    <img src={item.cover} alt={item.title} loading="lazy" />
                    <div className="kc-card-body">
                      <div className="kc-title">{item.title}</div>
                      <div className="kc-badge">Current</div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="kc-empty">No current items yet.</div>
            )}
          </section>

          <section>
            <div className="kc-section">
              <h3 style={{ margin: 0 }}>Favorites</h3>
              <span className="kc-subtle">{favorites.length} items</span>
            </div>
            {favorites.length ? (
              <div className="kc-grid">
                {favorites.map(item => (
                  <Link to={`/title/${item.id}`} key={item.id} className="kc-card">
                    <img src={item.cover} alt={item.title} loading="lazy" />
                    <div className="kc-card-body">
                      <div className="kc-title">{item.title}</div>
                      <div className="kc-badge success">★ Favorite</div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="kc-empty">Mark titles as favorites to see them here.</div>
            )}
          </section>
        </>
      )}

      <section>
        <div className="kc-section">
          <h3 style={{ margin: 0 }}>Recommended</h3>
        </div>
        <div className="kc-grid">
          {recommended.map(item => (
            <Link to={`/title/${item.id}`} key={item.id} className="kc-card">
              <img src={item.cover} alt={item.title} loading="lazy" />
              <div className="kc-card-body">
                <div className="kc-title">{item.title}</div>
                <div className="kc-subtle">{item.type}{item.year ? ` • ${item.year}` : ''}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="kc-section">
          <h3 style={{ margin: 0 }}>Trending</h3>
        </div>
        <div className="kc-grid">
          {trending.map(item => (
            <Link to={`/title/${item.id}`} key={item.id} className="kc-card">
              <img src={item.cover} alt={item.title} loading="lazy" />
              <div className="kc-card-body">
                <div className="kc-title">{item.title}</div>
                <div className="kc-subtle">{item.type}{item.year ? ` • ${item.year}` : ''}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
