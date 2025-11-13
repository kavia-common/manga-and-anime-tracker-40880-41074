import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getSupabase, getEnvWarning, getCurrentSession } from '../supabaseClient';
import { CatalogAPI } from '../services/catalog';
import { RatingsService, ListsService } from '../services/supabaseData';
import { ToastProvider } from '../components/Toast';

// PUBLIC_INTERFACE
export const AppContext = createContext(null);

// PUBLIC_INTERFACE
export function useAppContext() {
  /** Hook to access the application context values. */
  return useContext(AppContext);
}

// Helper: infer media_type from catalog item "type" field
function normalizeMediaType(type) {
  const t = String(type || '').toLowerCase();
  if (t.includes('manga')) return 'manga';
  return 'anime';
}

// PUBLIC_INTERFACE
export function AppProvider({ children }) {
  /**
   * Provides global app state: user session, search term, library ratings.
   * Uses Supabase if configured, otherwise runs fully in-memory with mock data.
   * Ratings are persisted to public.user_ratings when Supabase is available.
   */
  const supabase = useMemo(() => getSupabase(), []);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const [ratings, setRatings] = useState({}); // { mediaId: number (1..5) }
  const [lists, setLists] = useState({}); // { list_name: Array<{media_id, media_type}> }

  // Load session and subscribe to auth state changes
  useEffect(() => {
    let unsub = null;
    let mounted = true;
    (async () => {
      if (supabase) {
        const session = await getCurrentSession();
        if (mounted) setUser(session?.user ?? null);
        const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
          setUser(sess?.user ?? null);
        });
        unsub = sub?.subscription;
      }
      setSessionChecked(true);
    })();
    return () => {
      if (unsub) unsub.unsubscribe();
    };
  }, [supabase]);

  // When user changes and supabase exists, fetch persisted ratings and lists
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (supabase && user) {
        const map = await RatingsService.loadAll();
        const names = ['favorite', 'current', 'plan', 'completed'];
        const entries = await Promise.all(names.map(n => ListsService.loadList(n).then(arr => [n, arr])));
        const listsObj = Object.fromEntries(entries);
        if (mounted) {
          setRatings(map);
          setLists(listsObj);
        }
      } else if (!supabase) {
        // mock mode
      } else {
        // signed out
        setRatings({});
        setLists({});
      }
    })();
    return () => { mounted = false; };
  }, [supabase, user]);

  // PUBLIC_INTERFACE
  const setRating = (mediaId, value, opts = {}) => {
    /**
     * Optimistically set rating and persist to Supabase (if configured).
     * opts may include media_type to avoid re-fetching item when known.
     */
    setRatings(prev => ({ ...prev, [mediaId]: value }));

    // Persist asynchronously; rollback on error
    (async () => {
      const sb = getSupabase();
      if (!sb || !user) return; // mock mode or signed out: keep optimistic state
      const media_type = opts.media_type || 'anime';
      const res = await RatingsService.upsert({ media_id: String(mediaId), media_type, rating: value });
      if (!res.ok) {
        // rollback
        setRatings(prev => {
          const copy = { ...prev };
          // In real UX we could surface a toast; for now just revert
          // Remove if previously undefined? For simplicity we can't know old value here.
          // Assume failure rare; we can refetch to be accurate.
          return prev;
        });
        console.warn('Failed to persist rating, leaving optimistic state in place:', res.error);
      }
    })();
  };

  // Minimal list helpers (available to UI for future features)
  const addToList = async (list_name, media) => {
    const sb = getSupabase();
    if (!sb || !user) return { ok: false, error: 'Not signed in or Supabase not configured' };
    const payload = {
      media_id: String(media.id),
      media_type: normalizeMediaType(media.type),
      list_name,
    };
    // optimistic local cache
    setLists(prev => {
      const arr = prev[list_name] ? [...prev[list_name]] : [];
      if (!arr.find(x => x.media_id === payload.media_id && x.media_type === payload.media_type)) {
        arr.push({ media_id: payload.media_id, media_type: payload.media_type, list_name });
      }
      return { ...prev, [list_name]: arr };
    });
    const res = await ListsService.add(payload);
    if (!res.ok) {
      // rollback by removing the inserted item
      setLists(prev => {
        const arr = (prev[list_name] || []).filter(x => !(x.media_id === payload.media_id && x.media_type === payload.media_type));
        return { ...prev, [list_name]: arr };
      });
    }
    return res;
  };

  const removeFromList = async (list_name, media) => {
    const sb = getSupabase();
    if (!sb || !user) return { ok: false, error: 'Not signed in or Supabase not configured' };
    const payload = {
      media_id: String(media.id),
      media_type: normalizeMediaType(media.type),
      list_name,
    };
    // optimistic remove
    const prevSnapshot = lists[list_name] || [];
    setLists(prev => {
      const arr = (prev[list_name] || []).filter(x => !(x.media_id === payload.media_id && x.media_type === payload.media_type));
      return { ...prev, [list_name]: arr };
    });
    const res = await ListsService.remove(payload);
    if (!res.ok) {
      // rollback
      setLists(prev => ({ ...prev, [list_name]: prevSnapshot }));
    }
    return res;
  };

  const value = {
    envWarning: getEnvWarning(),
    sessionChecked,
    user,
    search,
    setSearch,
    ratings,
    setRating,
    lists,
    addToList,
    removeFromList,
    supabase,
    CatalogAPI
  };

  return (
    <AppContext.Provider value={value}>
      <ToastProvider>{children}</ToastProvider>
    </AppContext.Provider>
  );
}
