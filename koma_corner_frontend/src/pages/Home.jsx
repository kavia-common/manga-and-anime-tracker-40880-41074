import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
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
  /** Landing page with catalog grid, infinite scroll, server-driven filters, periodic refresh. */
  const { CatalogAPI, search } = useAppContext();
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [mediaType, setMediaType] = useState('BOTH'); // ANIME/MANGA/BOTH
  const [status, setStatus] = useState('ANY'); // FINISHED, RELEASING, etc.
  const [genres, setGenres] = useState([]); // multi
  const [sort, setSort] = useState('POPULARITY_DESC'); // currently used client-side

  const q = search.trim();
  const PER_PAGE = Number(process.env.REACT_APP_PAGE_SIZE) || 30;
  const REFRESH_INTERVAL = Number(process.env.REACT_APP_REFRESH_INTERVAL_MS) || 0;

  const sentinelRef = useRef(null);
  const fetchingRef = useRef(false); // guard duplicate fetches
  const lastFetchKeyRef = useRef(''); // key to detect filter/search/type change

  const typeArg = mediaType === 'BOTH' ? 'ANIME' : (mediaType === 'MANGA' ? 'MANGA' : 'ANIME');

  const keyForState = useMemo(() => {
    return JSON.stringify({
      q,
      mediaType,
      status,
      genres: (genres || []).slice().sort(),
    });
  }, [q, mediaType, status, genres]);

  // Initial and filter/search change loader
  useEffect(() => {
    let mounted = true;
    (async () => {
      setBusy(true);
      setError(null);
      setPage(1);
      setHasMore(true);
      lastFetchKeyRef.current = keyForState;
      try {
        const data = q
          ? await CatalogAPI.searchMedia({ query: q, type: typeArg, page: 1, perPage: PER_PAGE, status, genres })
          : await CatalogAPI.getTrendingMedia({ type: typeArg, page: 1, perPage: PER_PAGE, status, genres });
        if (!mounted) return;
        // Deduplicate by id
        const seen = new Set();
        const first = (data || []).filter(it => {
          if (seen.has(String(it.id))) return false;
          seen.add(String(it.id));
          return true;
        });
        setItems(first);
        setHasMore((data || []).length >= PER_PAGE);
      } catch (e) {
        console.warn('Home load error:', e);
        if (mounted) {
          setError('Failed to load catalog. Showing available results.');
          setItems([]);
          setHasMore(false);
        }
      } finally {
        if (mounted) setBusy(false);
      }
    })();
    return () => { mounted = false; };
  }, [CatalogAPI, keyForState, typeArg, PER_PAGE, q, status, genres]);

  // Load next page
  const loadMore = useCallback(async () => {
    if (fetchingRef.current || busy || loadingMore || !hasMore) return;
    fetchingRef.current = true;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const data = q
        ? await CatalogAPI.searchMedia({ query: q, type: typeArg, page: nextPage, perPage: PER_PAGE, status, genres })
        : await CatalogAPI.getTrendingMedia({ type: typeArg, page: nextPage, perPage: PER_PAGE, status, genres });
      // Only apply if filters didn't change mid-flight
      if (lastFetchKeyRef.current !== keyForState) return;
      // Append with dedupe
      const map = new Map(items.map(i => [String(i.id), i]));
      (data || []).forEach(it => {
        const k = String(it.id);
        if (!map.has(k)) map.set(k, it);
      });
      setItems(Array.from(map.values()));
      setPage(nextPage);
      setHasMore((data || []).length >= PER_PAGE);
    } catch (e) {
      // keep hasMore as is; allow retry
      console.warn('Load more failed', e);
    } finally {
      fetchingRef.current = false;
      setLoadingMore(false);
    }
  }, [page, q, typeArg, PER_PAGE, status, genres, items, busy, loadingMore, hasMore, keyForState, CatalogAPI]);

  // Infinite scroll via IntersectionObserver with fallback button
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadMore();
          }
        });
      }, { rootMargin: '200px' });
      io.observe(el);
      return () => io.disconnect();
    }
    // Fallback: no observer; user can click "Load more" button
    return () => {};
  }, [loadMore, hasMore]);

  // Periodic refresh: re-fetch page 1 and reconcile by ID, without resetting scroll
  useEffect(() => {
    if (!REFRESH_INTERVAL || REFRESH_INTERVAL < 1000) return;
    const id = setInterval(async () => {
      try {
        // bypass cache if older than TTL is handled inside graphQL; here we simulate first-page refresh
        const data = q
          ? await CatalogAPI.searchMedia({ query: q, type: typeArg, page: 1, perPage: PER_PAGE, status, genres })
          : await CatalogAPI.getTrendingMedia({ type: typeArg, page: 1, perPage: PER_PAGE, status, genres });
        // Reconcile items by ID to avoid flashes
        const byId = new Map(items.map(i => [String(i.id), i]));
        (data || []).forEach(it => {
          byId.set(String(it.id), { ...byId.get(String(it.id)), ...it });
        });
        const refreshed = Array.from(byId.values());
        setItems(refreshed);
        // If first page shrank, adjust hasMore accordingly
        if ((data || []).length < PER_PAGE && page === 1) {
          setHasMore(false);
        }
      } catch {
        // ignore periodic failures
      }
    }, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [REFRESH_INTERVAL, q, typeArg, PER_PAGE, status, genres, items, page, CatalogAPI]);

  // Client-side sorting and filtering (additional in case server filters not applied fully)
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
              onClick={() => {
                setMediaType(t);
              }}
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
      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} style={{ height: 1 }} />
      {/* Fallback Load more button if IntersectionObserver not available or when user prefers clicks */}
      {hasMore && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
          <button
            className="kc-btn"
            disabled={loadingMore}
            onClick={loadMore}
            aria-busy={loadingMore}
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
      {!hasMore && (
        <div className="kc-empty">End of list</div>
      )}
    </div>
  );
}
