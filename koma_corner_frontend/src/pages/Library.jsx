import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Rating } from '../components/Rating';
import { Link } from 'react-router-dom';
import { TitleGrid } from '../components/TitleGrid';

/**
 * Simple toggle options and mapping to underlying data sources.
 */
const TOGGLES = [
  { key: 'all', label: 'All' },
  { key: 'favorite', label: 'Favorites' },
  { key: 'completed', label: 'Completed' },
  { key: 'current', label: 'Currently Watching' },
  { key: 'plan', label: 'Planned to Watch' },
];

// PUBLIC_INTERFACE
export function Library() {
  /**
   * My Library page:
   * - Waits for sessionChecked and user before loading.
   * - Simple toggle group for All/Favorites/Completed/Current/Plan.
   * - Lazily fetches and caches list-based IDs upon first toggle activation.
   * - Uses CatalogAPI.getMinimalByIds to batch-fetch minimal item data for displayed IDs.
   * - Provides skeletons while loading and dedupes IDs.
   * - Gentle empty states for no user or missing Supabase.
   */
  const { CatalogAPI, ratings, setRating, user, lists, sessionChecked, supabase, envWarning } = useAppContext();

  // Selected toggle
  const [sel, setSel] = useState('all');

  // Cache of fetched items per toggle key to avoid re-fetching
  const [cache, setCache] = useState({
    all: null, favorite: null, completed: null, current: null, plan: null,
  });

  // Loading state per toggle to avoid double fetches
  const [loadingKeys, setLoadingKeys] = useState(new Set());

  // Guard: only fetch once session checked
  const ready = sessionChecked && !!user;

  // Helper: compute IDs by toggle from current ratings/lists
  const getIdsForToggle = (key) => {
    if (!user) return [];
    if (key === 'all') {
      // union of rated + all list ids
      const ratedIds = Object.keys(ratings || {});
      const listIds = ['favorite', 'current', 'plan', 'completed']
        .flatMap((n) => (lists?.[n] || []).map((x) => x.media_id));
      const all = [...ratedIds, ...listIds];
      // de-duplicate by string id
      return Array.from(new Set(all.map(String)));
    }
    if (key === 'favorite' || key === 'current' || key === 'plan' || key === 'completed') {
      return (lists?.[key] || []).map((x) => String(x.media_id));
    }
    return [];
  };

  // Effect: when user signs out, reset caches
  useEffect(() => {
    if (!user) {
      setCache({ all: null, favorite: null, completed: null, current: null, plan: null });
      setLoadingKeys(new Set());
    }
  }, [user]);

  // Fetch worker for a given toggle key
  const fetchForKey = async (key) => {
    if (!ready) return;
    // Avoid parallel/double loads
    if (loadingKeys.has(key)) return;
    setLoadingKeys((prev) => new Set(prev).add(key));
    try {
      const ids = getIdsForToggle(key);
      if (!ids.length) {
        setCache((prev) => ({ ...prev, [key]: [] }));
        return;
      }
      const items = await CatalogAPI.getMinimalByIds(ids);
      // Ensure dedupe by id and sort by title for stable render
      const byId = new Map();
      for (const it of items) {
        const k = String(it.id);
        if (!byId.has(k)) byId.set(k, it);
      }
      const arr = Array.from(byId.values()).sort((a, b) => String(a.title).localeCompare(String(b.title)));
      setCache((prev) => ({ ...prev, [key]: arr }));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Library fetch failed for', key, e);
      setCache((prev) => ({ ...prev, [key]: [] }));
    } finally {
      setLoadingKeys((prev) => {
        const n = new Set(prev);
        n.delete(key);
        return n;
      });
    }
  };

  // On first mount after ready, fetch initial selection lazily
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!ready) return;
    // Only trigger once after session becomes ready
    if (!initializedRef.current) {
      initializedRef.current = true;
      fetchForKey(sel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // When ratings or lists change, invalidate the relevant caches minimally
  useEffect(() => {
    if (!ready) return;
    // Strategy: clear only caches affected by change; they will be reloaded on next view
    setCache((prev) => ({
      ...prev,
      all: sel === 'all' ? prev.all : null, // keep current view if not active
      favorite: sel === 'favorite' ? prev.favorite : null,
      current: sel === 'current' ? prev.current : null,
      plan: sel === 'plan' ? prev.plan : null,
      completed: sel === 'completed' ? prev.completed : null,
    }));
    // If the current selection is affected, refetch it immediately
    // Avoid if a fetch is already ongoing
    if (!loadingKeys.has(sel)) {
      fetchForKey(sel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratings, lists]);

  // Change selection handler: lazy fetch if not cached
  const onSelect = (key) => {
    setSel(key);
    if (cache[key] == null && ready && !loadingKeys.has(key)) {
      fetchForKey(key);
    }
  };

  // Render data for current selection
  const items = useMemo(() => {
    const arr = cache[sel];
    if (!Array.isArray(arr)) return null;
    if (sel === 'all') return arr;
    return arr;
  }, [cache, sel]);

  // Skeleton elements for loading state
  const SkeletonGrid = ({ count = 8 }) => (
    <TitleGrid
      items={Array.from({ length: count })}
      gap={24}
      renderItem={(_, i) => (
        <div key={`s-${i}`} className="kc-card" aria-hidden="true">
          <div style={{ width: '100%', height: 220, background: 'var(--kc-surface)' }} />
          <div className="kc-card-body">
            <div style={{ width: '70%', height: 12, background: 'var(--kc-surface)' }} />
            <div style={{ width: '40%', height: 10, background: 'var(--kc-surface)', marginTop: 6 }} />
          </div>
        </div>
      )}
    />
  );

  // Empty/guard states
  if (!sessionChecked) {
    return <div className="kc-empty">Checking your session…</div>;
  }
  if (!user) {
    // Show friendly empty state for no user or supabase unavailable
    return (
      <div className="kc-empty">
        {supabase ? 'Please sign in to view your library.' : (envWarning || 'Library requires sign-in.')}
      </div>
    );
  }

  const isLoading = loadingKeys.has(sel);
  const count = Array.isArray(items) ? items.length : 0;

  return (
    <div>
      <div className="kc-section">
        <h2 style={{ margin: 0 }}>My Library</h2>
        <span className="kc-subtle">
          {isLoading ? 'Loading…' : `${count} item${count === 1 ? '' : 's'}`}
        </span>
      </div>

      {/* Toggle group */}
      <div className="kc-toggle" role="group" aria-label="Library filters">
        {TOGGLES.map((t) => (
          <button
            key={t.key}
            type="button"
            className={sel === t.key ? 'active' : ''}
            aria-pressed={sel === t.key}
            onClick={() => onSelect(t.key)}
            title={t.label}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading && <SkeletonGrid count={8} />}

      {!isLoading && Array.isArray(items) && items.length > 0 && (
        <TitleGrid
          items={items}
          gap={24}
          renderItem={(item) => (
            <div key={item.id} className="kc-card">
              <Link to={`/title/${item.id}`}>
                <img src={item.cover} alt={item.title} loading="lazy" />
              </Link>
              <div className="kc-card-body">
                <div className="kc-title">{item.title}</div>
                {sel === 'all' ? (
                  <>
                    {ratings[item.id] ? (
                      <div className="kc-subtle">Rated: {ratings[item.id]} ★</div>
                    ) : null}
                  </>
                ) : sel === 'favorite' ? (
                  <div className="kc-badge success">★ Favorite</div>
                ) : sel === 'current' ? (
                  <div className="kc-badge">Current</div>
                ) : sel === 'completed' ? (
                  <div className="kc-badge">Completed</div>
                ) : sel === 'plan' ? (
                  <div className="kc-badge">Planned</div>
                ) : null}

                {sel === 'all' && (
                  <div style={{ marginTop: 6 }}>
                    <Rating
                      value={ratings[item.id] || 0}
                      onChange={(v) =>
                        setRating(item.id, v, {
                          media_type: (item.type || '').toLowerCase().includes('manga') ? 'manga' : 'anime',
                        })
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        />
      )}

      {!isLoading && Array.isArray(items) && items.length === 0 && (
        <div className="kc-empty">
          {sel === 'all'
            ? "You haven't added anything yet."
            : sel === 'favorite'
            ? 'No favorites yet.'
            : sel === 'completed'
            ? 'No completed titles yet.'
            : sel === 'current'
            ? 'Nothing in progress yet.'
            : 'No planned titles yet.'}
        </div>
      )}
    </div>
  );
}
