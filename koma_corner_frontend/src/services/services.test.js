import { CatalogAPI } from './catalog';

test('CatalogAPI list returns array', async () => {
  const arr = await CatalogAPI.list();
  expect(Array.isArray(arr)).toBe(true);
});

test('CatalogAPI getRecommendations returns array (fallback empty allowed)', async () => {
  const arr = await CatalogAPI.getRecommendations(1);
  expect(Array.isArray(arr)).toBe(true);
});
