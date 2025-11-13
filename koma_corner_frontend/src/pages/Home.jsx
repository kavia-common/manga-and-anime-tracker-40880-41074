import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

function GenrePicker({ selected, onChange, items }) {
  const all = useMemo(() => {
    const set = new Set();
    (items || []).forEach(i => (i.genres || []).forEach(g => set.add(g)));
    return Array.from(set).sort();
  }, [items]);
  return (
    <select
      className="kc-select"
      aria-label="Genres"
      multiple
      value={selected}
      onChange={(e) => {
        const opts = Array.from(e.target.selectedOptions).map(o => o.value);
        onChange(opts);
      }}
      style={{ minWidth: 160 }}
    >
      {all.map(g => <option key={g} value={g}>{g}</option>)}
    </select>
  );
}
// Internal Links only; no direct window.location usage here.

// PUBLIC_INTERFACE
export function Home() {
  /** Landing page with catalog grid and search using AniList (fallback to mock). */
  const { CatalogAPI, search } = useAppContext();
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(null);

  const [mediaType, setMediaType] = useState('BOTH'); // ANIME/MANGA/BOTH
  const [status, setStatus] = useState('ANY'); // FINISHED, RELEASING, etc.
  const [genres, setGenres] = useState([]); // multi
  const [sort, setSort] = useState('POPULARITY_DESC'); // POPULARITY_DESC, SCORE_DESC, START_DATE_DESC, TITLE_ROMAJI

  const q = search.trim();

  useEffect(() => {
    let mounted = true;
    (async () => {
      setBusy(true);
      setError(null);
      try {
        const typeArg = mediaType === 'BOTH' ? 'ANIME' : (mediaType === 'MANGA' ? 'MANGA' : 'ANIME');
        const data = q
          ? await CatalogAPI.searchMedia({ query: q, type: typeArg, page: 1, perPage: 30 })
          : await CatalogAPI.getTrendingMedia({ type: typeArg, page: 1, perPage: 30 });
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
  }, [CatalogAPI, q, mediaType]);

  const filtered = useMemo(() => {
    let list = [...items];

    // Filter by mediaType when BOTH (keep as is), else ensure match
    if (mediaType !== 'BOTH') {
      list = list.filter(i => (mediaType === 'ANIME' ? i.type === 'Anime' : i.type === 'Manga'));
    }

    // Filter by status if selected
    if (status !== 'ANY') {
      list = list.filter(i => String(i.status || '').toUpperCase() === status);
    }

    // Filter by selected genres (all selected must be present)
    if (genres.length) {
      list = list.filter(i => {
        const gs = i.genres || [];
        return genres.every(g => gs.includes(g));
      });
    }

    // Text filter again as safety
    const term = q.toLowerCase();
    if (term) {
      list = list.filter((i) => i.title.toLowerCase().includes(term));
    }

    // Sorts
    if (sort === 'SCORE_DESC') {
      list.sort((a,b) => (b.averageScore || 0) - (a.averageScore || 0));
    } else if (sort === 'START_DATE_DESC') {
      list.sort((a,b) => (b.year || 0) - (a.year || 0));
    } else if (sort === 'TITLE_ROMAJI') {
      list.sort((a,b) => a.title.localeCompare(b.title));
    } else {
      // POPULARITY_DESC fallback: keep fetch order (trending/search)
    }

    return list;
  }, [items, q, mediaType, status, genres, sort]);

  if (busy) return <div className="kc-empty">Loading…</div>;
  if (error && !filtered.length) return <div className="kc-empty">{error}</div>;
  if (!filtered.length) return <div className="kc-empty">No results</div>;

  return (
    <div>
      <div className="kc-section">
        <h2 style={{ margin: 0 }}>Discover</h2>
        {error && <span className="kc-pill kc-danger" aria-live="polite">{error}</span>}
      </div>
      <div className="kc-filters" role="region" aria-label="Filters">
        <div className="kc-toggle" role="tablist" aria-label="Type">
          {['ANIME','MANGA','BOTH'].map(t => (
            <button
              type="button"
              key={t}
              className={mediaType === t ? 'active' : ''}
              aria-selected={mediaType === t}
              onClick={() => setMediaType(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <select className="kc-select" aria-label="Status" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="ANY">Any status</option>
          <option value="FINISHED">Finished</option>
          <option value="RELEASING">Releasing</option>
          <option value="HIATUS">Hiatus</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="NOT_YET_RELEASED">Not yet released</option>
        </select>
        <select className="kc-select" aria-label="Sort" value={sort} onChange={e => setSort(e.target.value)}>
          <option value="POPULARITY_DESC">Popularity</option>
          <option value="SCORE_DESC">Score</option>
          <option value="START_DATE_DESC">Start date</option>
          <option value="TITLE_ROMAJI">Title (A-Z)</option>
        </select>
        <GenrePicker selected={genres} onChange={setGenres} items={items} />
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
