import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Rating } from '../components/Rating';
import { useToast } from '../components/Toast';
import { ListsService, ProgressService } from '../services/supabaseData';
import { safeNavigate } from '../utils/redirects';
import { TitleGrid } from '../components/TitleGrid';
// Note: this page uses only history navigation (-1) and internal Links; no external redirects.

// PUBLIC_INTERFACE
export function Detail() {
  /** Title detail page with metadata and rating control. */
  const { id } = useParams();
  const navigate = useNavigate();
  const { CatalogAPI, ratings, setRating, user, lists, addToList, removeFromList } = useAppContext();
  const [item, setItem] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(null);
  const [recs, setRecs] = useState([]);
  const [fav, setFav] = useState(false);
  const [listState, setListState] = useState({ plan: false, current: false, completed: false, favorite: false });
  const [progressAvailable, setProgressAvailable] = useState(false);
  const [progressValue, setProgressValue] = useState('');
  const toast = useToast();

  useEffect(() => {
    let mounted = true;
    (async () => {
      setBusy(true);
      setError(null);
      try {
        const data = await CatalogAPI.getMediaDetails(id);
        const recItems = await CatalogAPI.getRecommendations(id, { perPage: 10 });
        if (mounted) {
          setItem(data);
          setRecs(recItems || []);
        }
      } catch (e) {
        console.warn('Detail load error:', e);
        if (mounted) setError('Failed to load details.');
      } finally {
        if (mounted) setBusy(false);
      }
    })();
    return () => { mounted = false; };
  }, [id, CatalogAPI]);

  useEffect(() => {
    if (!item) return;
    const media_id = String(item.id);
    const inList = (name) => (lists?.[name] || []).some(x => x.media_id === media_id);
    setFav(inList('favorite'));
    setListState({
      plan: inList('plan'),
      current: inList('current'),
      completed: inList('completed'),
      favorite: inList('favorite'),
    });
    (async () => {
      const avail = await ProgressService.isAvailable();
      setProgressAvailable(avail);
      if (avail && user) {
        const rec = await ProgressService.get({ media_id, media_type: (item.type || '').toLowerCase().includes('manga') ? 'manga' : 'anime' });
        if (rec && rec.last_unit != null) setProgressValue(String(rec.last_unit));
      }
    })();
  }, [item, lists, user]);

  if (busy) return <div className="kc-empty">Loading…</div>;
  if (!item) return <div className="kc-empty">{error || 'Not found'}</div>;

  const myRating = ratings[item.id] || 0;

  return (
    <div>
      <div className="kc-section">
        <button className="kc-btn" onClick={() => navigate(-1)}>Back</button>
        {error && <span className="kc-pill kc-danger" aria-live="polite">{error}</span>}
      </div>
      <div className="kc-card" style={{ display: 'grid', gridTemplateColumns: '220px 1fr' }}>
        <img src={item.cover} alt={item.title} loading="lazy" />
        <div className="kc-card-body">
          <h2 style={{ margin: 0 }}>{item.title}</h2>
          <div className="kc-subtle" style={{ marginTop: 4 }}>
            {item.type}{item.year ? ` • ${item.year}` : ''}{item.genres?.length ? ` • ${item.genres.join(', ')}` : ''}
          </div>
          {item.synopsis ? <p style={{ marginTop: 10 }}>{item.synopsis}</p> : null}

          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className={`kc-btn ${fav ? 'success' : ''}`}
              onClick={async () => {
                if (!user) return toast.addToast('Sign in to favorite', { type: 'error' });
                if (fav) {
                  await removeFromList('favorite', item);
                  setFav(false);
                  toast.addToast('Removed from favorites', { type: 'info' });
                } else {
                  await addToList('favorite', item);
                  setFav(true);
                  toast.addToast('Added to favorites', { type: 'success' });
                }
              }}
            >
              {fav ? '★ Favorited' : '☆ Favorite'}
            </button>

            {['plan','current','completed'].map(name => (
              <button
                key={name}
                className={`kc-btn ${listState[name] ? 'primary' : ''}`}
                onClick={async () => {
                  if (!user) return toast.addToast('Sign in to manage lists', { type: 'error' });
                  if (listState[name]) {
                    await removeFromList(name, item);
                    setListState(s => ({ ...s, [name]: false }));
                  } else {
                    await addToList(name, item);
                    setListState(s => ({ ...s, [name]: true }));
                  }
                }}
              >
                {name === 'plan' ? 'Plan' : name === 'current' ? 'Current' : 'Completed'}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="kc-subtle" style={{ marginBottom: 6 }}>Your rating</div>
            <Rating value={myRating} onChange={(v) => setRating(item.id, v, { media_type: (item.type || '').toLowerCase().includes('manga') ? 'manga' : 'anime' })} />
          </div>

          {progressAvailable && (
            <div style={{ marginTop: 12 }}>
              <div className="kc-subtle" style={{ marginBottom: 6 }}>Progress {item.type === 'Manga' || String(item.type).toLowerCase().includes('manga') ? '(last chapter)' : '(last episode)'}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="kc-input"
                  type="number"
                  min="0"
                  placeholder="e.g., 12"
                  value={progressValue}
                  onChange={(e) => setProgressValue(e.target.value)}
                  style={{ width: 120 }}
                />
                <button
                  className="kc-btn"
                  onClick={async () => {
                    if (!user) return toast.addToast('Sign in to track progress', { type: 'error' });
                    const media_type = (item.type || '').toLowerCase().includes('manga') ? 'manga' : 'anime';
                    const v = Number(progressValue);
                    if (!Number.isFinite(v) || v < 0) return toast.addToast('Enter a valid number', { type: 'error' });
                    const res = await ProgressService.upsert({ media_id: String(item.id), media_type, last_unit: v });
                    if (!res.ok) toast.addToast('Failed to save progress', { type: 'error' });
                    else toast.addToast('Progress saved', { type: 'success' });
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="kc-section" style={{ marginTop: 18 }}>
        <h3 style={{ margin: 0 }}>Recommendations</h3>
      </div>
      {Array.isArray(recs) && recs.length > 0 ? (
        <TitleGrid
          items={recs}
          gap={24}
          renderItem={(r) => (
            <Link
              to={`/title/${r.id}`}
              key={`rec-${r.id}`}
              className="kc-card"
              role="link"
              aria-label={`View details for ${r.title}`}
            >
              <img src={r.cover} alt={r.title} loading="lazy" />
              <div className="kc-card-body">
                <div className="kc-title">{r.title}</div>
                <div className="kc-subtle">{r.type}{r.year ? ` • ${r.year}` : ''}</div>
              </div>
            </Link>
          )}
        />
      ) : (
        <div className="kc-empty">No recommendations yet.</div>
      )}
    </div>
  );
}
