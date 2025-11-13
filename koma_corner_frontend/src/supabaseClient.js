import { createClient } from '@supabase/supabase-js';

const url = process.env.REACT_APP_SUPABASE_URL;
const key = process.env.REACT_APP_SUPABASE_KEY;

let envWarning = null;
if (!url || !key) {
  envWarning = 'Supabase env vars missing. Auth and persistence are disabled. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.';
}

/**
 * Returns a Supabase client if environment variables are configured; otherwise returns null.
 * The client is created per-call to ensure it always reflects current env configuration.
 */
// PUBLIC_INTERFACE
export const getSupabase = () => {
  /** Returns configured Supabase client or null if env vars are missing. */
  if (!url || !key) return null;
  return createClient(url, key);
};

// PUBLIC_INTERFACE
export function getEnvWarning() {
  /** Returns environment warning string when env vars are missing, else null. */
  return envWarning;
}

 // PUBLIC_INTERFACE
export async function getCurrentSession() {
  /** Retrieves current Supabase auth session if configured; else returns null. */
  const client = getSupabase();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data?.session ?? null;
}

/**
 * PUBLIC_INTERFACE
 * Determine whether a table exists (best-effort). Requires anon to have access to pg_catalog or fallback query try.
 */
export async function tableExists(table) {
  /** Check if table exists by attempting a minimal select with limit 0. */
  const client = getSupabase();
  if (!client) return false;
  try {
    // try select with limit 0 - if table missing, error comes back
    const { error } = await client.from(table).select('id', { count: 'exact', head: true });
    if (error && String(error.message || '').toLowerCase().includes('relation')) return false;
    return !error;
  } catch {
    return false;
  }
}
