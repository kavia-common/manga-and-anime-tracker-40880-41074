import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getSupabase, getEnvWarning, getCurrentSession } from '../supabaseClient';
import { CatalogAPI } from '../services/catalog';
import { RatingsService, ListsService } from '../services/supabaseData';
import { ToastProvider } from '../components/Toast';

/**
 * Internal abort controller for canceling in-flight fetches on sign-out.
 * Here represented by a boolean ref; services can check this flag if needed.
 */
const inFlightAbortRef = { current: false };

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

/**
 * Utility: withTimeout to guard async ops from hanging.
 */
async function withTimeout(promise, ms = 4000) {
  let to;
  try {
    const res = await Promise.race([
      promise,
      new Promise((_r, rej) => { to = setTimeout(() => rej(new Error('timeout')), ms); })
    ]);
    return res;
  } finally {
    if (to) clearTimeout(to);
  }
}

// PUBLIC_INTERFACE
export function AppProvider({ children }) {
  /**
   * Provides global app state: user session, search term, library ratings, and unified sign-out helper.
   * Uses Supabase if configured, otherwise runs fully in-memory with mock data.
   * Ratings are persisted to public.user_ratings when Supabase is available.
   */
  const supabase = useMemo(() => getSupabase(), []);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const [ratings, setRatings] = useState({}); // { mediaId: number (1..5) }
  const [lists, setLists] = useState({}); // { list_name: Array<{media_id, media_type}> }
  const signingOutRef = useRef(false);

  // Load session and subscribe to auth state changes
  useEffect(() => {
    let unsub = null;
    let mounted = true;
    (async () => {
      try {
        if (supabase) {
          // Initial session fetch
          const session = await getCurrentSession();
          if (mounted) setUser(session?.user ?? null);
          // Subscribe to further auth changes
          const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
            // Update user promptly on any auth state change
            setUser(sess?.user ?? null);
            // If we receive SIGNED_OUT or USER_DELETED, hard clear local state
            if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
              inFlightAbortRef.current = true;
              setRatings({});
              setLists({});
            }
            // Ensure sessionChecked is true after first event if it was not yet set
            setSessionChecked((prev) => prev || true);
          });
          unsub = sub?.subscription;
          // Mark that we have completed the initial session check
          if (mounted) setSessionChecked(true);
        } else {
          // No supabase configured; treat as checked and anonymous
          if (mounted) {
            setUser(null);
            setSessionChecked(true);
          }
        }
      } catch (e) {
        // On any unexpected error, still unblock the app to avoid indefinite buffering
        if (mounted) {
          setUser(null);
          setSessionChecked(true);
        }
      }
    })();
    return () => {
      if (unsub) unsub.unsubscribe();
      mounted = false;
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
        setRatings(prev => prev);
        // eslint-disable-next-line no-console
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

  /**
   * PUBLIC_INTERFACE
   * signOutAndNavigate: unified sign-out with timeout, single-call guard, and local fallback clear.
   * Accepts an optional navigate function to redirect after sign-out (default '/') and
   * an optional toast object with addToast(message, {type}).
   */
  const signOutAndNavigate = async ({ navigate, onAfter = () => {}, toast } = {}) => {
    if (signingOutRef.current) return; // prevent double sign-out
    signingOutRef.current = true;
    inFlightAbortRef.current = true; // signal to cancel any ongoing fetch usage

    let success = false;
    try {
      const sb = getSupabase();
      if (sb?.auth?.signOut) {
        const res = await withTimeout(sb.auth.signOut(), 4000).catch((e) => {
          // surface as thrown for uniform handling
          throw e;
        });
        // Handle { data, error } shape in some cases
        if (res?.error) {
          throw res.error;
        }
        success = true;
      }
    } catch (_e) {
      success = false;
    } finally {
      // Force-clear local state regardless of Supabase event firing to avoid stale user
      setUser(null);
      setRatings({});
      setLists({});
      setSessionChecked(true);
      try { onAfter(); } catch {}
      // Toasts
      try {
        if (toast?.addToast) {
          toast.addToast(success ? 'Signed out' : 'Signed out locally', { type: success ? 'success' : 'error' });
        }
      } catch {}
      // Navigation
      if (typeof navigate === 'function') {
        try { navigate('/', { replace: true }); } catch {}
      }
      signingOutRef.current = false;
    }
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
    CatalogAPI,
    signOutAndNavigate, // exposed unified helper
  };

  return (
    <AppContext.Provider value={value}>
      <ToastProvider>{children}</ToastProvider>
    </AppContext.Provider>
  );
}
