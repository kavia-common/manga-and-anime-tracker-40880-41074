const ANILIST_ENDPOINT = 'https://graphql.anilist.co';

// Cache entry: { data, ts }
const cache = {
  search: new Map(),
  trending: new Map(),
  details: new Map(),
  batch: new Map(),
};

const DEFAULT_TTL = Number(process.env.REACT_APP_CACHE_TTL_MS) || 300000; // 5 min

function keyFor(query, variables) {
  return JSON.stringify({ q: query, v: variables || {} });
}

function isFresh(entry, ttl = DEFAULT_TTL) {
  if (!entry) return false;
  return Date.now() - entry.ts < ttl;
}

// PUBLIC_INTERFACE
export async function graphQLFetch(query, variables = {}, { cacheBucket, bypassCache = false, ttlMs } = {}) {
  /** Lightweight GraphQL POST to AniList with JSON/error handling. No auth required. */
  const k = keyFor(query, variables);
  const bucket = cacheBucket && cache[cacheBucket] ? cache[cacheBucket] : null;
  const ttl = Number(ttlMs) || DEFAULT_TTL;

  if (!bypassCache && bucket && bucket.has(k)) {
    const entry = bucket.get(k);
    if (isFresh(entry, ttl)) {
      return entry.data;
    }
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

  if (bucket) {
    bucket.set(k, { data: json.data, ts: Date.now() });
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
export function invalidateGraphQLCache({ bucket, predicate } = {}) {
  /** Targeted invalidation: remove entries from a bucket that match predicate(key, entry). */
  if (!bucket || !cache[bucket]) return;
  const map = cache[bucket];
  for (const [k, v] of map.entries()) {
    try {
      if (!predicate || predicate(k, v)) {
        map.delete(k);
      }
    } catch {
      // swallow errors from predicate
    }
  }
}

// PUBLIC_INTERFACE
export function getCache() {
  /** Returns shallow copy of cache sizes for inspection. */
  const sizes = {};
  for (const b of Object.keys(cache)) sizes[b] = cache[b].size;
  return { sizes, raw: cache };
}
