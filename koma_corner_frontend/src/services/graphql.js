const ANILIST_ENDPOINT = 'https://graphql.anilist.co';

// Simple in-memory cache without TTL
const cache = {
  search: new Map(),
  trending: new Map(),
  details: new Map(),
  batch: new Map(),
};

function keyFor(query, variables) {
  return JSON.stringify({ q: query, v: variables || {} });
}

// PUBLIC_INTERFACE
export async function graphQLFetch(query, variables = {}, { cacheBucket, bypassCache = false } = {}) {
  /** Lightweight GraphQL POST to AniList with JSON/error handling. No auth required. */
  const k = keyFor(query, variables);
  const bucket = cacheBucket && cache[cacheBucket] ? cache[cacheBucket] : null;

  if (!bypassCache && bucket && bucket.has(k)) {
    return bucket.get(k);
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
    bucket.set(k, json.data);
  }
  return json.data;
}
