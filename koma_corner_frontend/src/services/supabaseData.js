import { getSupabase, tableExists } from '../supabaseClient';

/**
 * Supabase-backed data access for user_ratings, user_lists, and optional user_progress.
 * All methods are tolerant of missing Supabase config and will no-op or return empty results.
 */
const TABLE_RATINGS = 'user_ratings';
const TABLE_LISTS = 'user_lists';
const TABLE_PROGRESS = 'user_progress';

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
      // eslint-disable-next-line no-console
      console.warn('RatingsService.loadAll error', error);
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
    const payload = {
      media_id,
      media_type,
      rating,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from(TABLE_RATINGS)
      .upsert(payload, { onConflict: 'user_id,media_id,media_type' });
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('RatingsService.upsert error', error);
      return { ok: false, error: error.message || 'Failed to save rating' };
    }
    return { ok: true };
  },
  /** Delete a rating (kept for completeness). */
  async remove({ media_id, media_type }) {
    const supabase = getSupabase();
    if (!supabase) return { ok: false, error: 'Supabase not configured' };
    const { error } = await supabase
      .from(TABLE_RATINGS)
      .delete()
      .eq('media_id', media_id)
      .eq('media_type', media_type);
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('RatingsService.remove error', error);
      return { ok: false, error: error.message };
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
    // RLS ensures only the current user's rows are visible. We do not need to pass user_id in filters.
    const { data, error } = await supabase
      .from(TABLE_LISTS)
      .select('media_id, media_type, list_name')
      .eq('list_name', list_name);
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('ListsService.loadList error', error);
      return [];
    }
    return data || [];
  },
  /** Add to a named list. Inserts with implicit user_id via RLS auth.uid(). */
  async add({ media_id, media_type, list_name }) {
    const supabase = getSupabase();
    if (!supabase) return { ok: false, error: 'Supabase not configured' };
    // Ensure required fields are present
    if (!media_id || !media_type || !list_name) {
      return { ok: false, error: 'Missing required fields' };
    }
    // Use insert not upsert to surface uniqueness errors clearly; handle 23505 manually as success
    const { error } = await supabase
      .from(TABLE_LISTS)
      .insert({ media_id, media_type, list_name });
    if (error) {
      const msg = error.message || '';
      // If unique constraint violation, treat as success (idempotent add)
      if (String(error.code) === '23505' || /duplicate key value|unique/i.test(msg)) {
        return { ok: true, warning: 'Already in list' };
      }
      // eslint-disable-next-line no-console
      console.warn('ListsService.add error', error);
      return { ok: false, error: msg || 'Failed to add to list' };
    }
    return { ok: true };
  },
  /** Remove from a named list. Scoped by RLS to current user. */
  async remove({ media_id, media_type, list_name }) {
    const supabase = getSupabase();
    if (!supabase) return { ok: false, error: 'Supabase not configured' };
    if (!media_id || !media_type || !list_name) {
      return { ok: false, error: 'Missing required fields' };
    }
    const { error } = await supabase
      .from(TABLE_LISTS)
      .delete()
      .eq('media_id', media_id)
      .eq('media_type', media_type)
      .eq('list_name', list_name);
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('ListsService.remove error', error);
      return { ok: false, error: error.message || 'Failed to remove from list' };
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
    const { data, error } = await sb
      .from(TABLE_PROGRESS)
      .select('media_id, media_type, last_unit')
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
    const { error } = await sb
      .from(TABLE_PROGRESS)
      .upsert(
        { media_id, media_type, last_unit, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,media_id,media_type' }
      );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },
};
