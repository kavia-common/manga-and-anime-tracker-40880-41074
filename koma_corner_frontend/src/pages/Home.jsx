import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
// Internal Links only; no direct window.location usage here.

// PUBLIC_INTERFACE
export function Home() {
  /** Landing page with catalog grid and search using AniList (fallback to mock). */
  const { CatalogAPI, search } = useAppContext();
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(null);

  const q = search.trim();

  useEffect(() => {
    let mounted = true;
    (async () => {
      setBusy(true);
      setError(null);
      try {
        const data = q
          ? await CatalogAPI.searchMedia({ query: q, type: 'ANIME', page: 1, perPage: 20 })
          : await CatalogAPI.getTrendingMedia({ type: 'ANIME', page: 1, perPage: 20 });
        if (mounted) {
          setItems(data);
        }
      } catch (e) {
        console.warn('Home load error:', e);
        if (mounted) setError('Failed to load catalog. Showing available results.');
      } finally {
        if (mounted) setBusy(false);
      }
    })();
    return () => { mounted = false; };
  }, [CatalogAPI, q]);

  const filtered = useMemo(() => {
    // Remote search already filtered, but keep client-side filter as safety
    const term = q.toLowerCase();
    if (!term) return items;
    return items.filter((i) => i.title.toLowerCase().includes(term));
  }, [items, q]);

  if (busy) return <div className="kc-empty">Loading…</div>;
  if (error && !filtered.length) return <div className="kc-empty">{error}</div>;
  if (!filtered.length) return <div className="kc-empty">No results</div>;

  return (
    <div>
      <div className="kc-section">
        <h2 style={{ margin: 0 }}>Discover</h2>
        {error && <span className="kc-pill kc-danger" aria-live="polite">{error}</span>}
      </div>
      <div className="kc-grid">
        {filtered.map(item => (
          <Link to={`/title/${item.id}`} key={item.id} className="kc-card">
            <img src={item.cover} alt={item.title} loading="lazy" />
            <div className="kc-card-body">
              <div className="kc-title">{item.title}</div>
              <div className="kc-subtle">{item.type}{item.year ? ` • ${item.year}` : ''}</div>
              {item.genres?.length ? <div className="kc-subtle">{item.genres.join(', ')}</div> : null}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
