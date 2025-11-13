//
// Centralized helpers for safe redirects/navigation.
//
// These utilities enforce:
// - Same-origin path-based navigation
// - Optional whitelist of allowed path prefixes
// - No javascript:, data:, or other dangerous schemes
// - Default to a safe fallback ('/') when invalid or missing
//
// PUBLIC_INTERFACE
export function getFrontendOrigin() {
  /** Returns the configured frontend origin from env or window.location.origin as a fallback. */
  // Note: REACT_APP_FRONTEND_URL should be set in .env to match the deployed frontend URL.
  const env = process.env.REACT_APP_FRONTEND_URL;
  try {
    const candidate = (env || window.location.origin || '').trim();
    // Normalize and validate origin
    const u = new URL(candidate);
    return `${u.protocol}//${u.host}`;
  } catch {
    // Fallback to current origin if env misconfigured
    try {
      return window.location.origin;
    } catch {
      return 'http://localhost:3000';
    }
  }
}

// PUBLIC_INTERFACE
export function isSafeRedirect(target, options = {}) {
  /**
   * Validates a target string for redirection within the SPA.
   * Accepts only same-origin path/relative URLs; optional whitelist of allowed path prefixes.
   * Returns true when target is considered safe.
   */
  const { allowedPrefixes = ['/', '/auth', '/library', '/title', '/health'] } = options;

  if (target == null) return false;
  const t = String(target).trim();

  if (!t) return false;

  // Disallow dangerous schemes explicitly
  const lower = t.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) {
    return false;
  }

  // Allow hash-only anchors as non-navigation
  if (t.startsWith('#')) return true;

  // Allow query-only as non-navigation (we'll treat safely later)
  if (t.startsWith('?')) return true;

  // If absolute URL, it must be same-origin
  let asUrl = null;
  try {
    asUrl = new URL(t, getFrontendOrigin());
  } catch {
    // If parsing fails, consider unsafe
    return false;
  }

  // Require same origin
  const appOrigin = getFrontendOrigin();
  const resolvedOrigin = `${asUrl.protocol}//${asUrl.host}`;
  if (resolvedOrigin !== appOrigin) {
    return false;
  }

  // Must be path-based and begin with an allowed prefix
  const path = asUrl.pathname || '/';
  const okPrefix = allowedPrefixes.some((p) => path === p || path.startsWith(p.endsWith('/') ? p : `${p}/`) || (p === '/' && path.startsWith('/')));
  if (!okPrefix) return false;

  return true;
}

// PUBLIC_INTERFACE
export function normalizeToPath(target, fallback = '/') {
  /**
   * Converts any provided URL/relative string into a clean path+search+hash for react-router.
   * If invalid, returns the fallback (default '/').
   */
  if (!target) return fallback;
  try {
    const url = new URL(String(target), getFrontendOrigin());
    // Only return path, search, and hash for SPA navigation
    const path = url.pathname || '/';
    const search = url.search || '';
    const hash = url.hash || '';
    return `${path}${search}${hash}`;
  } catch {
    return fallback;
  }
}

// PUBLIC_INTERFACE
export function getSafeRedirectFromParams(search, paramName = 'redirect', fallback = '/') {
  /**
   * Reads the redirect target from a querystring, validates with isSafeRedirect,
   * and returns a normalized path or the fallback when invalid/missing.
   * Defensive against malformed search strings.
   */
  let target = null;
  try {
    const params = new URLSearchParams(search || '');
    target = params.get(paramName);
  } catch {
    return fallback;
  }
  if (!isSafeRedirect(target)) return fallback;
  return normalizeToPath(target, fallback);
}

// PUBLIC_INTERFACE
export function safeNavigate(navigateFn, target, options = {}) {
  /**
   * Wrapper around react-router navigate:
   * - Validates target via isSafeRedirect
   * - Normalizes to path
   * - Falls back to '/'
   */
  const { replace = false, fallback = '/' } = options;
  const safe = isSafeRedirect(target) ? normalizeToPath(target, fallback) : fallback;
  try {
    navigateFn(safe, { replace });
  } catch (e) {
    // No-throw policy to avoid crashes in rare cases
    try {
      navigateFn(fallback, { replace: true });
    } catch {
      // swallow
    }
  }
}

// PUBLIC_INTERFACE
export function buildSupabaseRedirectTo(nextPath) {
  /**
   * Builds a safe absolute URL for Supabase emailRedirectTo during sign-up.
   * Uses REACT_APP_FRONTEND_URL origin and only appends a safe path (if provided).
   */
  const origin = getFrontendOrigin();
  const path = isSafeRedirect(nextPath) ? normalizeToPath(nextPath, '/') : '/';
  return `${origin}${path}`;
}
