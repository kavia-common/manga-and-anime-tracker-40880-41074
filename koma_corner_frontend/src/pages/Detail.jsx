import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Rating } from '../components/Rating';

// PUBLIC_INTERFACE
export function Detail() {
  /** Title detail page with metadata and rating control. */
  const { id } = useParams();
  const navigate = useNavigate();
  const { CatalogAPI, ratings, setRating } = useAppContext();
  const [item, setItem] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setBusy(true);
      setError(null);
      try {
        const data = await CatalogAPI.getMediaDetails(id);
        if (mounted) setItem(data);
      } catch (e) {
        console.warn('Detail load error:', e);
        if (mounted) setError('Failed to load details.');
      } finally {
        if (mounted) setBusy(false);
      }
    })();
    return () => { mounted = false; };
  }, [id, CatalogAPI]);

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
        <img src={item.cover} alt={item.title} />
        <div className="kc-card-body">
          <h2 style={{ margin: 0 }}>{item.title}</h2>
          <div className="kc-subtle" style={{ marginTop: 4 }}>
            {item.type}{item.year ? ` • ${item.year}` : ''}{item.genres?.length ? ` • ${item.genres.join(', ')}` : ''}
          </div>
          {item.synopsis ? <p style={{ marginTop: 10 }}>{item.synopsis}</p> : null}
          <div style={{ marginTop: 8 }}>
            <div className="kc-subtle" style={{ marginBottom: 6 }}>Your rating</div>
            <Rating value={myRating} onChange={(v) => setRating(item.id, v, { media_type: (item.type || '').toLowerCase().includes('manga') ? 'manga' : 'anime' })} />
          </div>
        </div>
      </div>
    </div>
  );
}
