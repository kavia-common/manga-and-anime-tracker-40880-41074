# Supabase Integration Notes

Environment variables (must be set via .env):
- REACT_APP_SUPABASE_URL
- REACT_APP_SUPABASE_KEY
- REACT_APP_FRONTEND_URL (used for emailRedirectTo on sign-up; must match the app origin)

Frontend uses @supabase/supabase-js v2 client created in src/supabaseClient.js via getSupabase().

Auth:
- Email/password only.
- Session loaded at app startup in AppContext.
- onAuthStateChange updates context user state.
- Sign-in/up handled in src/pages/Auth.jsx.
- On sign-up, emailRedirectTo is built from REACT_APP_FRONTEND_URL origin and a safe path using utils/redirects.buildSupabaseRedirectTo().
- Post-login/post-signup redirects only allow same-origin paths and default to '/library' when not provided or invalid.

Persistence:
- Ratings: public.user_ratings (1..5 scale, unique per user/media_id/media_type).
- Lists: public.user_lists (plan/current/completed/favorite). The UI currently does not expose lists but services exist for future use.

Schema (execute in Supabase SQL editor):
See README_APP.md for the same SQL snippet. Ensure RLS is enabled with owner-only policies.

Usage:
- RatingsService.loadAll(): map of { media_id: rating }
- RatingsService.upsert({ media_id, media_type, rating })
- ListsService.add/remove helpers
- Optimistic updates in context; failures log warnings.

Notes:
- No notes/comments fields are implemented by design.
