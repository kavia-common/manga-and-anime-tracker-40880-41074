const ANILIST_ENDPOINT = 'https://graphql.anilist.co';

/**
 * Simple in-memory cache using Maps.
 * Keys are stringified based on query+variables.
 */
const cache = {
  search: new Map(),
  trending: new Map(),
  details: new Map(),
  batch: new Map(),
};

/**
 * Internal helper to create a cache key.
 */
function keyFor(query, variables) {
  return JSON.stringify({ q: query, v: variables || {} });
}

// PUBLIC_INTERFACE
export async function graphQLFetch(query, variables = {}, { cacheBucket } = {}) {
  /** Lightweight GraphQL POST to AniList with JSON/error handling. No auth required. */
  const k = keyFor(query, variables);
  if (cacheBucket && cache[cacheBucket]?.has(k)) {
    return cache[cacheBucket].get(k);
  }

  const res = await fetch(ANILIST_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.errors) {
    const errMsg = json?.errors?.[0]?.message || res.statusText || 'GraphQL request failed';
    const error = new Error(errMsg);
    error.response = json;
    throw error;
  }

  if (cacheBucket && cache[cacheBucket]) {
    cache[cacheBucket].set(k, json.data);
  }
  return json.data;
}

// PUBLIC_INTERFACE
export function clearGraphQLCache(bucket) {
  /** Clears in-memory cache. If bucket omitted, clears all. */
  if (!bucket) {
    Object.keys(cache).forEach((b) => cache[b].clear());
    return;
  }
  cache[bucket]?.clear();
}

// PUBLIC_INTERFACE
export function getCache() {
  /** Returns the internal cache object for inspection (read-only). */
  return cache;
}
