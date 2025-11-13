import { graphQLFetch, clearGraphQLCache, invalidateGraphQLCache } from './graphql';

// We can't hit real network in unit test environment reliably; instead, mock fetch
const originalFetch = global.fetch;

beforeEach(() => {
  jest.useFakeTimers();
  clearGraphQLCache();
  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => ({ data: { ok: true, ts: Date.now() } }),
    statusText: 'OK'
  }));
});

afterEach(() => {
  global.fetch = originalFetch;
});

test('graphQLFetch caches per bucket and respects TTL', async () => {
  const query = 'query X { x }';
  const vars = { a: 1 };
  // First call fetches
  const r1 = await graphQLFetch(query, vars, { cacheBucket: 'search', ttlMs: 1000 });
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(r1).toHaveProperty('ok', true);

  // Second call within TTL uses cache
  const r2 = await graphQLFetch(query, vars, { cacheBucket: 'search', ttlMs: 1000 });
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(r2).toHaveProperty('ok', true);

  // Advance beyond TTL -> triggers fetch
  jest.advanceTimersByTime(1001);
  const r3 = await graphQLFetch(query, vars, { cacheBucket: 'search', ttlMs: 1000 });
  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(r3).toHaveProperty('ok', true);
});

test('invalidateGraphQLCache removes entries', async () => {
  const q = 'query Y { y }';
  await graphQLFetch(q, { b: 2 }, { cacheBucket: 'trending', ttlMs: 10000 });
  expect(global.fetch).toHaveBeenCalledTimes(1);
  invalidateGraphQLCache({ bucket: 'trending', predicate: () => true });
  // Next call should fetch again
  await graphQLFetch(q, { b: 2 }, { cacheBucket: 'trending', ttlMs: 10000 });
  expect(global.fetch).toHaveBeenCalledTimes(2);
});
