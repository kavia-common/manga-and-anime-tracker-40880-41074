import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getSupabase, getEnvWarning } from '../supabaseClient';
import { CatalogAPI } from '../services/catalog';

// PUBLIC_INTERFACE
export const AppContext = createContext(null);

// PUBLIC_INTERFACE
export function useAppContext() {
  /** Hook to access the application context values. */
  return useContext(AppContext);
}

// PUBLIC_INTERFACE
export function AppProvider({ children }) {
  /**
   * Provides global app state: user session, search term, library ratings.
   * Uses Supabase if configured, otherwise runs fully in-memory with mock data.
   */
  const supabase = useMemo(() => getSupabase(), []);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const [ratings, setRatings] = useState({}); // { mediaId: number (1..5) }

  // Load existing session (if supabase present)
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (mounted) setUser(data?.session?.user ?? null);
        supabase.auth.onAuthStateChange((_event, sess) => {
          setUser(sess?.user ?? null);
        });
      }
      setSessionChecked(true);
    };
    init();
    return () => { mounted = false; };
  }, [supabase]);

  // Mock persistence of ratings (could be extended to Supabase)
  const setRating = (mediaId, value) => {
    setRatings(prev => ({ ...prev, [mediaId]: value }));
  };

  const value = {
    envWarning: getEnvWarning(),
    sessionChecked,
    user,
    search,
    setSearch,
    ratings,
    setRating,
    supabase,
    CatalogAPI
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
