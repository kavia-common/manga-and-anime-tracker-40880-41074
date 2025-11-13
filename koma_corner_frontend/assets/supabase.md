# Supabase Integration Notes

Environment variables (must be set via .env):
- REACT_APP_SUPABASE_URL
- REACT_APP_SUPABASE_KEY
- REACT_APP_FRONTEND_URL (used for emailRedirectTo on sign-up and OAuth redirect; must match the app origin)
- Optional: REACT_APP_FEATURE_FLAGS (e.g., "progress,analytics")

Frontend uses @supabase/supabase-js v2 client created in src/supabaseClient.js via getSupabase().

Auth:
- Email/password and Google SSO (OAuth).
- Session loaded at app startup in AppContext.
- onAuthStateChange updates context user state.
- Sign-in/up handled in src/pages/Auth.jsx.
- On sign-up, emailRedirectTo is built from REACT_APP_FRONTEND_URL origin and a safe path using utils/redirects.buildSupabaseRedirectTo().
- For Google OAuth, we call supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: buildSupabaseRedirectTo(afterAuth) } }).
- Post-login/post-signup redirects only allow same-origin paths and default to '/library' when not provided or invalid.

Persistence:
- Ratings: public.user_ratings (1..5 scale, unique per user/media_id/media_type).
- Lists: public.user_lists (plan/current/completed/favorite).
- Optional Progress: public.user_progress with last_unit (episode/chapter). Guarded by feature flag "progress" and table existence check.

Schema (execute in Supabase SQL editor):
See README_APP.md for SQL snippets. Ensure RLS is enabled with owner-only policies.

Usage:
- RatingsService.loadAll(): map of { media_id: rating }
- RatingsService.upsert({ media_id, media_type, rating })
- ListsService.add/remove helpers
- ProgressService.isAvailable(), .get(), .upsert()
- Optimistic updates in context; failures log warnings.

Notes:
- No notes/comments fields are implemented by design.
