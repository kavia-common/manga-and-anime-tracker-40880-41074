import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

// PUBLIC_INTERFACE
export function Home() {
  /**
   * Landing page with catalog grid and explicit "Load more" pagination.
   * - Initial load fetches a single page (30 items).
   * - Load more appends next pages (page++) until no more results.
   * - Includes a styled filter container: title search, genre multiselect, status select, popularity sort.
   */
  const { CatalogAPI, search, setSearch } = useAppContext();

  // Catalog state
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Filters container state
  const [localTitle, setLocalTitle] = useState(search || '');
  const [genres, setGenres] = useState([]); // array of strings
  const [status, setStatus] = useState(''); // '', 'RELEASING', 'FINISHED', 'NOT_YET_RELEASED', 'CANCELLED'
  const [sort, setSort] = useState('POPULARITY_DESC'); // POPULARITY_DESC only exposed (placeholder for future)

  const timerRef = useRef(null);

  const PER_PAGE = 30;

  // Simple catalog genre options (subset common genres)
  const GENRE_OPTIONS = [
    'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror',
    'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Thriller'
  ];

  // Keep local input in sync when search changes elsewhere (e.g., topbar)
  useEffect(() => {
    setLocalTitle(search || '');
  }, [search]);

  // Helper: fetch a page using current query/filter selections
  const fetchPage = async ({ page: p }) => {
    const q = (localTitle || search || '').trim();

    // For now, CatalogAPI only exposes text search and trending with popularity sort.
    // We apply genre/status filters client-side as a lightweight layer.
    const data = q
      ? await CatalogAPI.searchMedia({ query: q, type: 'ANIME', page: p, perPage: PER_PAGE })
      : await CatalogAPI.getTrendingMedia({ type: 'ANIME', page: p, perPage: PER_PAGE });

    let list = Array.isArray(data) ? data : [];

    // Client-side filters
    if (genres.length) {
      const want = new Set(genres);
      list = list.filter((i) => (i.genres || []).some((g) => want.has(g)));
    }
    if (status) {
      // We don't have status in mapped items; keep placeholder (no-op) for now.
      // If later available, filter by i.status === status.
    }
    // sort by popularity is default from API; keep as-is.

    return list;
  };

  // Initial load or whenever the inputs change: reset to page 1 and fetch
  useEffect(() => {
    let mounted = true;
    (async () => {
      setBusy(true);
      setError(null);
      setPage(1);
      setHasMore(true);
      try {
        const list = await fetchPage({ page: 1 });
        if (!mounted) return;

        // Deduplicate by id just in case
        const map = new Map();
        for (const it of list.slice(0, PER_PAGE)) {
          if (!map.has(String(it.id))) map.set(String(it.id), it);
        }
        const unique = Array.from(map.values());
        setItems(unique);
        // If fewer than PER_PAGE, we reached end
        setHasMore(unique.length >= PER_PAGE);
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
    // Trigger when search (global), localTitle debounced, genres, status, sort change.
    // We directly depend on localTitle and genres/status/sort; search syncs into localTitle via topbar or user typing below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localTitle, genres.join(','), status, sort]);

  // Debounce localTitle -> global search for consistency with TopBar behavior and Dashboard expectations
  const onLocalTitleChange = (v) => {
    setLocalTitle(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setSearch(v);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Load more handler: fetch next page, append with dedupe
  const onLoadMore = async () => {
    if (loadingMore || busy || !hasMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const nextPage = page + 1;
      const list = await fetchPage({ page: nextPage });
      // Dedupe by id when appending
      const byId = new Map(items.map((it) => [String(it.id), it]));
      for (const it of list) {
        const key = String(it.id);
        if (!byId.has(key)) {
          byId.set(key, it);
        }
      }
      const merged = Array.from(byId.values());
      setItems(merged);
      setPage(nextPage);
      // End-of-list detection: if returned less than PER_PAGE or no new additions
      const added = merged.length - items.length;
      if (list.length < PER_PAGE || added === 0) setHasMore(false);
    } catch (e) {
      console.warn('Load more failed:', e);
      setError('Unable to load more at the moment.');
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  // Render filters container (styled box)
  const FiltersBox = (
    <div className="kc-container">
      <div className="kc-filters" aria-label="Search and filters">
        <input
          className="kc-input"
          placeholder="Search titles…"
          aria-label="Title search"
          value={localTitle}
          onChange={(e) => onLocalTitleChange(e.target.value)}
          style={{ minWidth: 220 }}
        />
        <select
          multiple
          className="kc-multiselect"
          aria-label="Genres"
          value={genres}
          onChange={(e) => {
            const opts = Array.from(e.target.selectedOptions).map(o => o.value);
            setGenres(opts);
          }}
          style={{ minWidth: 180, height: 80 }}
        >
          {GENRE_OPTIONS.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <select
          className="kc-select"
          aria-label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Any status</option>
          <option value="RELEASING">Ongoing</option>
          <option value="FINISHED">Completed</option>
          <option value="NOT_YET_RELEASED">Upcoming</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select
          className="kc-select"
          aria-label="Sort"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="POPULARITY_DESC">Sort: Popularity</option>
        </select>
      </div>
    </div>
  );

  const listForRender = useMemo(() => {
    // Lightweight safeguard: ensure title filter also applied client-side
    const term = (localTitle || '').trim().toLowerCase();
    let list = Array.isArray(items) ? items : [];
    if (term) list = list.filter(i => (i.title || '').toLowerCase().includes(term));
    return list;
  }, [items, localTitle]);

  if (busy) return <div className="kc-empty">Loading…</div>;
  if (error && !listForRender.length) return <div className="kc-empty">{error}</div>;
  if (!listForRender.length) return (
    <div>
      <div className="kc-section">
        <h2 style={{ margin: 0 }}>Discover</h2>
        {error && <span className="kc-pill kc-danger" aria-live="polite">{error}</span>}
      </div>
      {FiltersBox}
      <div className="kc-empty">No results</div>
    </div>
  );

  return (
    <div>
      <div className="kc-section">
        <h2 style={{ margin: 0 }}>Discover</h2>
        {error && <span className="kc-pill kc-danger" aria-live="polite">{error}</span>}
      </div>

      {FiltersBox}

      <div className="kc-grid">
        {listForRender.map(item => (
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

      <div className="kc-section" style={{ justifyContent: 'center', marginTop: 16 }}>
        {hasMore ? (
          <button className="kc-btn" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        ) : (
          <span className="kc-subtle">End of results</span>
        )}
      </div>
    </div>
  );
}
