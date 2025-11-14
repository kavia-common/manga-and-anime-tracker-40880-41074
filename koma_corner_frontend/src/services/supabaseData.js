import { getSupabase, tableExists } from '../supabaseClient';

/**
 * Supabase-backed data access for user_ratings, user_lists, and optional user_progress.
 * All methods are tolerant of missing Supabase config and will no-op or return empty results.
 * IMPORTANT: For RLS policies that use auth.uid() = user_id, we explicitly include user_id
 * on all write operations (insert/upsert/delete filters) to avoid relying on defaults.
 */
const TABLE_RATINGS = 'user_ratings';
const TABLE_LISTS = 'user_lists'; // verify: table name is user_lists (not users_lists)
const TABLE_PROGRESS = 'user_progress';

// Small helper to fetch current auth user id safely
async function getCurrentUserId() {
  const supabase = getSupabase();
  if (!supabase?.auth?.getUser) return null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data?.user?.id || null;
  } catch {
    return null;
  }
}

// Centralized detailed error formatter for Supabase errors
function formatSbError(prefix, error, extra = {}) {
  const code = error?.code;
  const msg = error?.message || String(error || '');
  const hint =
    /row-level security|rls|violates row-level security/i.test(msg)
      ? 'RLS policy blocked the operation. Ensure user_id matches auth.uid() and policies exist on correct table name.'
      : '';
  // eslint-disable-next-line no-console
  console.warn(prefix, { code, message: msg, hint, ...extra });
  return msg;
}

// PUBLIC_INTERFACE
export const RatingsService = {
  /** Load all ratings for the current user. Returns map { media_id: rating } */
  async loadAll() {
    const supabase = getSupabase();
    if (!supabase) return {};
    const { data, error } = await supabase
      .from(TABLE_RATINGS)
      .select('media_id, rating');
    if (error) {
      // Swallow errors to keep UI usable in mock mode
      formatSbError('RatingsService.loadAll error', error);
      return {};
    }
    const map = {};
    for (const row of data || []) {
      map[row.media_id] = row.rating;
    }
    return map;
  },
  /** Upsert a rating (1..5) for a media id and type ('manga' | 'anime'). */
  async upsert({ media_id, media_type, rating }) {
    const supabase = getSupabase();
    if (!supabase) return { ok: false, error: 'Supabase not configured' };
    if (!media_id || !media_type || !rating) {
      return { ok: false, error: 'Missing required fields' };
    }
    const user_id = await getCurrentUserId();
    if (!user_id) return { ok: false, error: 'Not authenticated' };

    const payload = {
      user_id, // explicitly include to satisfy RLS with check (auth.uid() = user_id)
      media_id,
      media_type,
      rating,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from(TABLE_RATINGS)
      .upsert(payload, { onConflict: 'user_id,media_id,media_type' });
    if (error) {
      const msg = formatSbError('RatingsService.upsert error', error, { payload });
      return { ok: false, error: msg || 'Failed to save rating' };
    }
    return { ok: true };
  },
  /** Delete a rating (kept for completeness). */
  async remove({ media_id, media_type }) {
    const supabase = getSupabase();
    if (!supabase) return { ok: false, error: 'Supabase not configured' };
    const user_id = await getCurrentUserId();
    if (!user_id) return { ok: false, error: 'Not authenticated' };

    const { error } = await supabase
      .from(TABLE_RATINGS)
      .delete()
      .eq('user_id', user_id)
      .eq('media_id', media_id)
      .eq('media_type', media_type);
    if (error) {
      const msg = formatSbError('RatingsService.remove error', error, { media_id, media_type });
      return { ok: false, error: msg };
    }
    return { ok: true };
  },
};

// PUBLIC_INTERFACE
export const ListsService = {
  /** Load a list by list_name. Returns array of { media_id, media_type, list_name } */
  async loadList(list_name) {
    const supabase = getSupabase();
    if (!supabase) return [];
    const user_id = await getCurrentUserId();
    if (!user_id) return [];

    // RLS ensures only the current user's rows are visible, but we also filter by user_id
    const { data, error } = await supabase
      .from(TABLE_LISTS)
      .select('media_id, media_type, list_name')
      .eq('user_id', user_id)
      .eq('list_name', list_name);
    if (error) {
      formatSbError('ListsService.loadList error', error, { list_name });
      return [];
    }
    return data || [];
  },
  /** Add to a named list. Inserts with explicit user_id to satisfy with check (auth.uid() = user_id). */
  async add({ media_id, media_type, list_name }) {
    const supabase = getSupabase();
    if (!supabase) return { ok: false, error: 'Supabase not configured' };
    if (!media_id || !media_type || !list_name) {
      return { ok: false, error: 'Missing required fields' };
    }
    const user_id = await getCurrentUserId();
    if (!user_id) return { ok: false, error: 'Not authenticated' };

    // Use insert to catch uniqueness; treat unique violation as success.
    const { error } = await supabase
      .from(TABLE_LISTS)
      .insert({ user_id, media_id, media_type, list_name });
    if (error) {
      const msg = error.message || '';
      if (String(error.code) === '23505' || /duplicate key value|unique/i.test(msg)) {
        return { ok: true, warning: 'Already in list' };
      }
      const fmt = formatSbError('ListsService.add error', error, { user_id, media_id, media_type, list_name });
      return { ok: false, error: fmt || 'Failed to add to list' };
    }
    return { ok: true };
  },
  /** Remove from a named list. Scoped by RLS to current user (explicit user_id filter included). */
  async remove({ media_id, media_type, list_name }) {
    const supabase = getSupabase();
    if (!supabase) return { ok: false, error: 'Supabase not configured' };
    if (!media_id || !media_type || !list_name) {
      return { ok: false, error: 'Missing required fields' };
    }
    const user_id = await getCurrentUserId();
    if (!user_id) return { ok: false, error: 'Not authenticated' };

    const { error } = await supabase
      .from(TABLE_LISTS)
      .delete()
      .eq('user_id', user_id)
      .eq('media_id', media_id)
      .eq('media_type', media_type)
      .eq('list_name', list_name);
    if (error) {
      const msg = formatSbError('ListsService.remove error', error, { user_id, media_id, list_name });
      return { ok: false, error: msg || 'Failed to remove from list' };
    }
    return { ok: true };
  },
};

/**
 * Optional Progress Service guarded by feature flag and table existence.
 */
// PUBLIC_INTERFACE
export const ProgressService = {
  /** Check availability: feature flag and table exists. */
  async isAvailable() {
    const flags = (process.env.REACT_APP_FEATURE_FLAGS || '').split(',').map(s => s.trim());
    if (!flags.includes('progress')) return false;
    const sb = getSupabase();
    if (!sb) return false;
    try {
      return await tableExists(TABLE_PROGRESS);
    } catch {
      return false;
    }
  },
  /** Load last progress record for a media item. */
  async get({ media_id, media_type }) {
    const sb = getSupabase();
    if (!sb) return null;
    const user_id = await getCurrentUserId();
    if (!user_id) return null;

    const { data, error } = await sb
      .from(TABLE_PROGRESS)
      .select('media_id, media_type, last_unit')
      .eq('user_id', user_id)
      .eq('media_id', media_id)
      .eq('media_type', media_type)
      .limit(1);
    if (error) return null;
    return Array.isArray(data) && data[0] ? data[0] : null;
  },
  /** Upsert progress value (chapter/episode). */
  async upsert({ media_id, media_type, last_unit }) {
    const sb = getSupabase();
    if (!sb) return { ok: false, error: 'Supabase not configured' };
    const user_id = await getCurrentUserId();
    if (!user_id) return { ok: false, error: 'Not authenticated' };

    const { error } = await sb
      .from(TABLE_PROGRESS)
      .upsert(
        { user_id, media_id, media_type, last_unit, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,media_id,media_type' }
      );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },
};
