import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { TitleGrid } from '../components/TitleGrid';

// PUBLIC_INTERFACE
export function Home() {
  /**
   * Landing page with catalog grid and explicit "Load more" pagination.
   * - Media type toggle: Anime / Manga / Both
   * - Initial load fetches a single page (30 items).
   * - Load more appends next pages (page++) until no more results, with dedupe by id.
   * - Client-side filter: genres (with "All" meaning no genre filtering).
   * - Status filter has been removed (UI and logic).
   * - No popularity sort UI (API handles trending/popularity server-side).
   * - Global TopBar search drives this page via AppContext.search with debounce in TopBar.
   */
  const { CatalogAPI, search } = useAppContext();

  // Catalog state
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Filters container state
  const [mediaType, setMediaType] = useState('ANIME'); // 'ANIME' | 'MANGA' | 'BOTH'
  const [genres, setGenres] = useState([]); // array of strings, empty or includes "All" => no filtering

  const PER_PAGE = 30;
  const lastQueryRef = useRef('');

  // Simple catalog genre options (subset common genres). Include "All".
  const GENRE_OPTIONS = [
    'All',
    'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror',
    'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Thriller'
  ];

  // Helper: fetch a page using current filter selections, honoring search query
  const fetchPage = async ({ page: p, query }) => {
    const useSearch = String(query || '').trim().length > 0;

    // When Both selected: simple strategy — alternate ANIME and MANGA pages.
    const resolveTypeForBoth = (pg) => (pg % 2 === 1 ? 'ANIME' : 'MANGA');

    const typesToFetch = (() => {
      if (mediaType === 'BOTH') return [resolveTypeForBoth(p)];
      return [mediaType];
    })();

    let combined = [];
    for (const t of typesToFetch) {
      const data = useSearch
        ? await CatalogAPI.searchMedia({ query, type: t, page: p, perPage: PER_PAGE })
        : await CatalogAPI.getTrendingMedia({ type: t, page: p, perPage: PER_PAGE });
      const arr = Array.isArray(data) ? data : [];
      combined = combined.concat(arr);
    }

    // Client-side filter: genres
    const hasGenreFilter = Array.isArray(genres) && genres.length > 0 && !genres.includes('All');
    if (hasGenreFilter) {
      const want = new Set(genres);
      combined = combined.filter((i) => (i.genres || []).some((g) => want.has(g)));
    }

    // Deduplicate by id
    const byId = new Map();
    for (const it of combined) {
      const k = String(it.id);
      if (!byId.has(k)) byId.set(k, it);
    }
    return Array.from(byId.values());
  };

  // Initial load and when filters OR search change: reset to page 1 and fetch
  useEffect(() => {
    let mounted = true;
    const q = String(search || '').trim();
    lastQueryRef.current = q;

    (async () => {
      setBusy(true);
      setError(null);
      setPage(1);
      setHasMore(true);
      try {
        const list = await fetchPage({ page: 1, query: q });
        if (!mounted) return;
        const unique = list.slice(0, PER_PAGE);
        setItems(unique);
        setHasMore(unique.length >= PER_PAGE);
      } catch (e) {
        // eslint-disable-next-line no-console
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
  }, [mediaType, genres.join(','), search]);

  // Load more handler: fetch next page, append with dedupe and end detection
  const onLoadMore = async () => {
    if (loadingMore || busy || !hasMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const nextPage = page + 1;
      const list = await fetchPage({ page: nextPage, query: lastQueryRef.current });

      // Dedupe by id when appending
      const byId = new Map(items.map((it) => [String(it.id), it]));
      for (const it of list) {
        const key = String(it.id);
        if (!byId.has(key)) {
          byId.set(key, it);
        }
      }
      const merged = Array.from(byId.values());
      const added = merged.length - items.length;

      setItems(merged);
      setPage(nextPage);

      // End-of-list detection
      if (list.length < PER_PAGE || added === 0) setHasMore(false);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Load more failed:', e);
      setError('Unable to load more at the moment.');
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  // Filters UI
  const FiltersBox = (
    <div className="kc-container">
      <div className="kc-filters" aria-label="Filters">
        <div className="kc-toggle" role="group" aria-label="Media type">
          {['ANIME', 'MANGA', 'BOTH'].map((t) => (
            <button
              key={t}
              type="button"
              className={mediaType === t ? 'active' : ''}
              onClick={() => setMediaType(t)}
              aria-pressed={mediaType === t}
              title={t === 'ANIME' ? 'Anime' : t === 'MANGA' ? 'Manga' : 'Both'}
            >
              {t === 'ANIME' ? 'Anime' : t === 'MANGA' ? 'Manga' : 'Both'}
            </button>
          ))}
        </div>
        <select
          multiple
          className="kc-multiselect"
          aria-label="Genres"
          value={genres}
          onChange={(e) => {
            const opts = Array.from(e.target.selectedOptions).map(o => o.value);
            // If "All" is chosen among others, normalize to just ["All"] to avoid confusion
            const next = opts.includes('All') ? ['All'] : opts;
            setGenres(next);
          }}
          style={{ minWidth: 200, height: 96 }}
        >
          {GENRE_OPTIONS.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        {/* Status filter removed */}
      </div>
    </div>
  );

  const listForRender = useMemo(() => {
    return Array.isArray(items) ? items : [];
  }, [items]);

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

      <TitleGrid
        items={listForRender}
        gap={24}
        renderItem={(item) => (
          <Link to={`/title/${item.id}`} key={item.id} className="kc-card">
            <img src={item.cover} alt={item.title} loading="lazy" />
            <div className="kc-card-body">
              <div className="kc-title">{item.title}</div>
              <div className="kc-subtle">{item.type}{item.year ? ` • ${item.year}` : ''}</div>
              {item.genres?.length ? <div className="kc-subtle">{item.genres.join(', ')}</div> : null}
            </div>
          </Link>
        )}
      />

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
