import { getFrontendOrigin, isSafeRedirect, normalizeToPath } from './redirects';

describe('redirect utils', () => {
  test('getFrontendOrigin returns a valid origin', () => {
    const origin = getFrontendOrigin();
    expect(origin).toMatch(/^https?:\/\/[^/]+$/);
  });

  test('isSafeRedirect rejects dangerous schemes', () => {
    expect(isSafeRedirect('javascript:alert(1)')).toBe(false);
    expect(isSafeRedirect('data:text/html;base64,AAAA')).toBe(false);
  });

  test('isSafeRedirect allows same-origin paths', () => {
    expect(isSafeRedirect('/')).toBe(true);
    expect(isSafeRedirect('/library')).toBe(true);
    expect(isSafeRedirect('/title/123?x=1#y')).toBe(true);
  });

  test('normalizeToPath returns just path,search,hash', () => {
    const p = normalizeToPath('https://example.com/title/1?x=1#h', '/');
    expect(p).toBe('/title/1?x=1#h');
  });
});
