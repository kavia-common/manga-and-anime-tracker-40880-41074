import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Rating } from '../components/Rating';
import { Link } from 'react-router-dom';
// Internal Links only; stays within SPA.

// PUBLIC_INTERFACE
export function Library() {
  /** My Library page: shows rated items and allows adjusting ratings. */
  const { CatalogAPI, ratings, setRating, user, lists } = useAppContext();
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('rated'); // rated | favorites | current

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) return;
      let ids = [];
      if (tab === 'rated') {
        ids = Object.keys(ratings || {});
      } else if (tab === 'favorites') {
        ids = (lists?.favorite || []).map(x => x.media_id);
      } else if (tab === 'current') {
        ids = (lists?.current || []).map(x => x.media_id);
      }
      setBusy(true);
      try {
        const minimal = ids.length ? await CatalogAPI.getMinimalByIds(ids) : [];
        if (mounted) setItems(minimal);
      } catch (e) {
        console.warn('Library minimal fetch failed', e);
        if (mounted) setItems([]);
      } finally {
        if (mounted) setBusy(false);
      }
    })();
    return () => { mounted = false; };
  }, [CatalogAPI, ratings, user, lists, tab]);

  const rated = useMemo(() => {
    return items.filter(i => ratings[i.id]);
  }, [items, ratings]);

  if (!user) return <div className="kc-empty">Please sign in to view your library.</div>;
  const count = items.length;

  return (
    <div>
      <div className="kc-section">
        <h2 style={{ margin: 0 }}>My Library</h2>
        <span className="kc-subtle">{count} items</span>
      </div>

      <div className="kc-tabs" role="tablist">
        {['rated','favorites','current'].map(t => (
          <button
            key={t}
            className={`kc-tab ${tab === t ? 'active' : ''}`}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
          >
            {t === 'rated' ? 'Rated' : t === 'favorites' ? 'Favorites' : 'Current'}
          </button>
        ))}
      </div>

      {busy ? <div className="kc-empty">Loading…</div> : (
        count ? (
          <div className="kc-grid">
            {items.map(item => (
              <div key={item.id} className="kc-card">
                <Link to={`/title/${item.id}`}>
                  <img src={item.cover} alt={item.title} loading="lazy" />
                </Link>
                <div className="kc-card-body">
                  <div className="kc-title">{item.title}</div>
                  {tab === 'rated' && (
                    <Rating value={ratings[item.id] || 0} onChange={(v) => setRating(item.id, v, { media_type: (item.type || '').toLowerCase().includes('manga') ? 'manga' : 'anime' })} />
                  )}
                  {tab !== 'rated' && (
                    <div className="kc-badge">{tab === 'favorites' ? '★ Favorite' : 'Current'}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="kc-empty">
            {tab === 'rated' ? "You haven't rated any titles yet." :
             tab === 'favorites' ? 'No favorites yet.' : 'No current items yet.'}
          </div>
        )
      )}
    </div>
  );
}
