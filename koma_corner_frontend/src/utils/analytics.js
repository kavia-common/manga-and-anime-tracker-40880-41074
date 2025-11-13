//
// Lightweight analytics utility
//
const FLAGS = (process.env.REACT_APP_FEATURE_FLAGS || "").split(",").map(s => s.trim()).filter(Boolean);
const ENABLED = FLAGS.includes("analytics");

// PUBLIC_INTERFACE
export function logEvent(name, payload = {}) {
  /** Log analytics event. Defaults to console; can be extended for Supabase table. */
  const evt = { name, payload, ts: Date.now() };
  if (!ENABLED) {
    // No-op but keep a debug log
    // eslint-disable-next-line no-console
    console.debug("[analytics]", evt);
    return;
  }
  // For now: console log; future: persist to Supabase or external
  // eslint-disable-next-line no-console
  console.info("[analytics]", evt);
}
