import { createClient } from '@supabase/supabase-js';

const url = process.env.REACT_APP_SUPABASE_URL;
const key = process.env.REACT_APP_SUPABASE_KEY;
const frontendUrl = process.env.REACT_APP_FRONTEND_URL;

let envWarning = null;
if (!url || !key) {
  envWarning = 'Supabase env vars missing. Auth and persistence are disabled. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.';
} else if (!frontendUrl) {
  // Not fatal for sign-in, but important for emailRedirectTo on sign-up
  envWarning = 'REACT_APP_FRONTEND_URL is not set. Sign-up email redirects may not work correctly.';
}

// Create a SINGLETON Supabase client once so auth state and listeners are consistent across app
let SUPABASE_SINGLETON = null;
if (url && key) {
  try {
    SUPABASE_SINGLETON = createClient(url, key);
  } catch (_e) {
    // leave as null; envWarning already covers missing/misconfig
    SUPABASE_SINGLETON = null;
  }
}

/**
 * Returns the singleton Supabase client if configured; otherwise null.
 */
// PUBLIC_INTERFACE
export const getSupabase = () => {
  /** Returns configured Supabase singleton client or null if env vars are missing. */
  return SUPABASE_SINGLETON;
};

// PUBLIC_INTERFACE
export function getEnvWarning() {
  /** Returns environment warning string when env vars are missing or partially configured, else null. */
  return envWarning;
}

// PUBLIC_INTERFACE
export async function getCurrentSession() {
  /** Retrieves current Supabase auth session if configured; else returns null. */
  const client = getSupabase();
  if (!client) return null;
  const { data, error } = await client.auth.getSession();
  if (error) return null;
  return data?.session ?? null;
}

/**
 * PUBLIC_INTERFACE
 * Determine whether a table exists (best-effort). Requires anon to have access to pg_catalog or fallback query try.
 */
export async function tableExists(table) {
  /** Check if table exists by attempting a minimal select with head:true. */
  const client = getSupabase();
  if (!client) return false;
  try {
    const { error } = await client.from(table).select('id', { count: 'exact', head: true });
    if (error && String(error.message || '').toLowerCase().includes('relation')) return false;
    return !error;
  } catch {
    return false;
  }
}
