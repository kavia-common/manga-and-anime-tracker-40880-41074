import mock from './mock_catalog.json';
import { graphQLFetch } from './graphql';

/**
 * Mapping utilities to normalize AniList media into the existing UI shape.
 */
function mapMediaListItem(m) {
  return {
    id: m.id,
    title: m.title?.english || m.title?.romaji || m.title?.native || 'Untitled',
    type: m.type === 'MANGA' ? 'Manga' : 'Anime',
    year: m.startDate?.year || m.seasonYear || null,
    cover: m.coverImage?.large || m.coverImage?.medium || m.bannerImage || '',
    genres: Array.isArray(m.genres) ? m.genres.filter(Boolean) : [],
    synopsis: m.description ? stripHTML(m.description) : '',
    averageScore: m.averageScore || null,
    format: m.format || null,
    status: m.status || null,
    episodes: m.episodes || null,
    chapters: m.chapters || null,
  };
}

function mapMediaDetail(m) {
  const base = mapMediaListItem(m);
  return {
    ...base,
    bannerImage: m.bannerImage || '',
    endDate: m.endDate || null,
    volumes: m.volumes || null,
    studios: (m.studios?.edges || [])
      .filter(e => e?.node?.name)
      .map(e => e.node.name),
    publishers: (m.staff?.edges || [])
      .filter(e => e?.role && String(e.role).toLowerCase().includes('publisher'))
      .map(e => e.node?.name?.full)
      .filter(Boolean),
    externalLinks: (m.externalLinks || []).map(l => ({
      site: l.site,
      url: l.url,
    })),
  };
}

function stripHTML(s) {
  if (!s) return '';
  const div = typeof document !== 'undefined' ? document.createElement('div') : null;
  if (div) {
    div.innerHTML = s;
    return (div.textContent || div.innerText || '').trim();
  }
  return String(s).replace(/<[^>]+>/g, '').trim();
}

// GraphQL snippets
const LIST_FIELDS = `
  id
  type
  format
  status
  averageScore
  episodes
  chapters
  title { romaji english native }
  coverImage { medium large }
  bannerImage
  genres
  startDate { year month day }
  endDate { year month day }
`;

const DETAILS_FIELDS = `
  id
  type
  format
  status
  averageScore
  episodes
  chapters
  volumes
  title { romaji english native }
  coverImage { medium large }
  bannerImage
  genres
  description(asHtml: true)
  startDate { year month day }
  endDate { year month day }
  studios(isMain: true) { edges { node { name } } }
  externalLinks { site url }
`;

// Add server-driven filtering for search/trending
const QUERY_SEARCH = `
  query SearchMedia($type: MediaType, $page: Int, $perPage: Int, $query: String, $status: MediaStatus, $genres: [String]) {
    Page(page: $page, perPage: $perPage) {
      media(
        type: $type,
        search: $query,
        sort: POPULARITY_DESC,
        status: $status,
        genre_in: $genres
      ) {
        ${LIST_FIELDS}
      }
    }
  }
`;

const QUERY_TRENDING = `
  query Trending($type: MediaType, $page: Int, $perPage: Int, $status: MediaStatus, $genres: [String]) {
    Page(page: $page, perPage: $perPage) {
      media(
        type: $type,
        sort: TRENDING_DESC,
        status: $status,
        genre_in: $genres
      ) {
        ${LIST_FIELDS}
      }
    }
  }
`;

const QUERY_DETAILS = `
  query Details($id: Int) {
    Media(id: $id) {
      ${DETAILS_FIELDS}
    }
  }
`;

const QUERY_RECOMMENDATIONS = `
  query Recommendations($id: Int, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      recommendations(mediaId: $id, sort: RATING_DESC) {
        mediaRecommendation {
          ${LIST_FIELDS}
        }
      }
    }
  }
`;

const QUERY_BATCH_MIN = `
  query BatchMin($ids: [Int], $type: MediaType) {
    Page(perPage: 50) {
      media(id_in: $ids, type: $type) {
        id
        type
        title { romaji english native }
        coverImage { medium large }
      }
    }
  }
`;

// Helpers
const DEFAULT_PER_PAGE = Number(process.env.REACT_APP_PAGE_SIZE) || 30;

// PUBLIC_INTERFACE
export const CatalogAPI = {
  /**
   * Get trending media with optional server-driven filters.
   */
  async getTrendingMedia({ type = 'ANIME', page = 1, perPage = DEFAULT_PER_PAGE, status, genres } = {}) {
    try {
      const vars = { type, page, perPage, status: normalizeStatus(status), genres: normalizeGenres(genres) };
      const data = await graphQLFetch(
        QUERY_TRENDING,
        vars,
        { cacheBucket: 'trending' }
      );
      const list = data?.Page?.media || [];
      return list.map(mapMediaListItem);
    } catch (e) {
      console.warn('AniList trending failed, using mock data', e?.message || e);
      return mock;
    }
  },

  /**
   * Search media by text query with server-driven filters.
   */
  // PUBLIC_INTERFACE
  async searchMedia({ query, type = 'ANIME', page = 1, perPage = DEFAULT_PER_PAGE, status, genres } = {}) {
    const q = String(query || '').trim();
    if (!q) {
      // If no query, show trending to keep UI populated
      return this.getTrendingMedia({ type, page, perPage, status, genres });
    }
    try {
      const vars = { query: q, type, page, perPage, status: normalizeStatus(status), genres: normalizeGenres(genres) };
      const data = await graphQLFetch(
        QUERY_SEARCH,
        vars,
        { cacheBucket: 'search' }
      );
      const list = data?.Page?.media || [];
      return list.map(mapMediaListItem);
    } catch (e) {
      console.warn('AniList search failed, using mock fallback', e?.message || e);
      // simple mock local filter + client-side filter for status/genres
      let base = mock.filter((i) => i.title.toLowerCase().includes(q.toLowerCase()));
      base = clientFilter(base, { status, genres, type });
      return base;
    }
  },

  /**
   * Get media details by AniList id.
   */
  // PUBLIC_INTERFACE
  async getMediaDetails(id) {
    const nid = Number(id);
    if (!Number.isFinite(nid)) return null;
    try {
      const data = await graphQLFetch(
        QUERY_DETAILS,
        { id: nid },
        { cacheBucket: 'details' }
      );
      const m = data?.Media;
      if (!m) return null;
      const detailed = mapMediaDetail(m);
      if (!detailed.synopsis && m.description) {
        detailed.synopsis = stripHTML(m.description);
      }
      return detailed;
    } catch (e) {
      console.warn('AniList details failed, using mock lookup', e?.message || e);
      const it = mock.find((x) => String(x.id) === String(id));
      return it || null;
    }
  },

  /**
   * Optional: recommendations
   */
  // PUBLIC_INTERFACE
  async getRecommendations(id, { page = 1, perPage = 10 } = {}) {
    const nid = Number(id);
    if (!Number.isFinite(nid)) return [];
    try {
      const data = await graphQLFetch(
        QUERY_RECOMMENDATIONS,
        { id: nid, page, perPage },
        { cacheBucket: 'search' }
      );
      const recs = data?.Page?.recommendations || [];
      return recs
        .map((r) => r?.mediaRecommendation)
        .filter(Boolean)
        .map(mapMediaListItem);
    } catch (_e) {
      return [];
    }
  },

  /**
   * Batch minimal info for a list of IDs (used by Library to render rated items).
   * Note: We do not know which IDs are anime vs manga from ratings, so try ANIME first then MANGA for misses.
   */
  // PUBLIC_INTERFACE
  async getMinimalByIds(ids = []) {
    const unique = Array.from(new Set(ids.map((x) => Number(x)).filter((n) => Number.isFinite(n))));
    if (!unique.length) return [];

    const fetchType = async (mediaType, subset) => {
      if (!subset.length) return [];
      try {
        const data = await graphQLFetch(
          QUERY_BATCH_MIN,
          { ids: subset, type: mediaType },
          { cacheBucket: 'batch' }
        );
        const list = data?.Page?.media || [];
        return list.map((m) => ({
          id: m.id,
          title: m.title?.english || m.title?.romaji || m.title?.native || 'Untitled',
          type: m.type === 'MANGA' ? 'Manga' : 'Anime',
          year: null,
          cover: m.coverImage?.large || m.coverImage?.medium || '',
          genres: [],
          synopsis: '',
        }));
      } catch (_e) {
        return [];
      }
    };

    const animeItems = await fetchType('ANIME', unique);
    const animeIds = new Set(animeItems.map((i) => i.id));
    const remaining = unique.filter((id) => !animeIds.has(id));
    const mangaItems = await fetchType('MANGA', remaining);

    const combined = [...animeItems, ...mangaItems];

    // fallback with mock for any still missing
    const foundIds = new Set(combined.map((i) => String(i.id)));
    const mockAdds = mock
      .filter((m) => unique.some((id) => String(id) === String(m.id)))
      .filter((m) => !foundIds.has(String(m.id)));
    return [...combined, ...mockAdds];
  },

  /**
   * Compatibility methods for existing UI calls.
   */
  // PUBLIC_INTERFACE
  async list() {
    return this.getTrendingMedia({ type: 'ANIME', page: 1, perPage: DEFAULT_PER_PAGE });
  },

  // PUBLIC_INTERFACE
  async getById(id) {
    return this.getMediaDetails(id);
  },
};

// Helpers for filters
function normalizeStatus(status) {
  const s = String(status || '').toUpperCase();
  if (!s || s === 'ANY') return null;
  return s;
}
function normalizeGenres(genres) {
  if (!Array.isArray(genres) || !genres.length) return null;
  return genres;
}
function clientFilter(list, { status, genres, type }) {
  let out = [...list];
  if (type && type !== 'BOTH') {
    out = out.filter(i => (type === 'ANIME' ? i.type === 'Anime' : i.type === 'Manga'));
  }
  if (status && status !== 'ANY') {
    out = out.filter(i => String(i.status || '').toUpperCase() === status);
  }
  if (Array.isArray(genres) && genres.length) {
    out = out.filter(i => {
      const gs = i.genres || [];
      return genres.every(g => gs.includes(g));
    });
  }
  return out;
}
