import { createClient } from '@supabase/supabase-js';

const url = process.env.REACT_APP_SUPABASE_URL;
const key = process.env.REACT_APP_SUPABASE_KEY;

let envWarning = null;
if (!url || !key) {
  envWarning = 'Supabase env vars missing. Auth and persistence are disabled. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.';
}

/**
 * Returns a Supabase client if environment variables are configured; otherwise returns null.
 */
export const getSupabase = () => {
  if (!url || !key) return null;
  return createClient(url, key);
};

// PUBLIC_INTERFACE
export function getEnvWarning() {
  /** Returns environment warning string when env vars are missing, else null. */
  return envWarning;
}
