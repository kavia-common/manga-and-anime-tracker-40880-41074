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
