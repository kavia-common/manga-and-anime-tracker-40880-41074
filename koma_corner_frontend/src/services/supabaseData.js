import { getSupabase } from '../supabaseClient';

/**
 * Supabase-backed data access for user_ratings and user_lists.
 * All methods are tolerant of missing Supabase config and will no-op or return empty results.
 */
const TABLE_RATINGS = 'user_ratings';
const TABLE_LISTS = 'user_lists';

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
      console.warn('RatingsService.upsert error', error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  },
  /** Delete a rating (used if user clears rating; UI currently only sets 1..5 so this is kept for completeness). */
  async remove({ media_id, media_type }) {
    const supabase = getSupabase();
    if (!supabase) return { ok: false, error: 'Supabase not configured' };
    const { error } = await supabase
      .from(TABLE_RATINGS)
      .delete()
      .eq('media_id', media_id)
      .eq('media_type', media_type);
    if (error) {
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
    const { data, error } = await supabase
      .from(TABLE_LISTS)
      .select('media_id, media_type, list_name')
      .eq('list_name', list_name);
    if (error) {
      console.warn('ListsService.loadList error', error);
      return [];
    }
    return data || [];
  },
  /** Add to a named list. */
  async add({ media_id, media_type, list_name }) {
    const supabase = getSupabase();
    if (!supabase) return { ok: false, error: 'Supabase not configured' };
    const { error } = await supabase
      .from(TABLE_LISTS)
      .upsert({ media_id, media_type, list_name });
    if (error) {
      console.warn('ListsService.add error', error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  },
  /** Remove from a named list. */
  async remove({ media_id, media_type, list_name }) {
    const supabase = getSupabase();
    if (!supabase) return { ok: false, error: 'Supabase not configured' };
    const { error } = await supabase
      .from(TABLE_LISTS)
      .delete()
      .eq('media_id', media_id)
      .eq('media_type', media_type)
      .eq('list_name', list_name);
    if (error) {
      console.warn('ListsService.remove error', error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  },
};
