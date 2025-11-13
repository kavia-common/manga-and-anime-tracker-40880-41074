# Koma Corner Frontend (React SPA)

Ocean Professional minimalist React SPA for browsing manga/anime, managing a personal library, and rating titles. Auth and data persistence are powered by Supabase (optional for local mock mode).

## Features
- Catalog grid with simple search
- Title detail view with metadata, rating, favorites, lists, recommendations
- My Library (requires auth) with tabs: Rated, Favorites, Current
- Dashboard with Continue, Favorites, Recommended; Trending for anonymous users
- Ratings enabled (no notes/comments)
- Supabase Auth (email/password)
- Optional Progress tracking (feature flag "progress" and user_progress table)
- Ocean Professional minimalist styling

## Getting Started
1) Install dependencies
   npm install

2) Configure environment variables (create .env)
   REACT_APP_SUPABASE_URL=<your_supabase_url>
   REACT_APP_SUPABASE_KEY=<your_supabase_anon_key>
   REACT_APP_FRONTEND_URL=http://localhost:3000
   # Note: FRONTEND_URL must be the exact origin of the app (scheme+host+port). It is used to build safe Supabase emailRedirectTo.

   Optional:
   REACT_APP_API_BASE=
   REACT_APP_BACKEND_URL=
   REACT_APP_WS_URL=
   REACT_APP_NODE_ENV=development
   REACT_APP_NEXT_TELEMETRY_DISABLED=1
   REACT_APP_ENABLE_SOURCE_MAPS=true
   REACT_APP_PORT=3000
   REACT_APP_TRUST_PROXY=true
   REACT_APP_LOG_LEVEL=info
   REACT_APP_HEALTHCHECK_PATH=/health
   REACT_APP_FEATURE_FLAGS=progress,analytics
   REACT_APP_EXPERIMENTS_ENABLED=false

3) Start the dev server
   npm start

If Supabase env vars are not set, the app runs fully in mock mode (catalog + in-memory ratings only).

## Pages
- /               Home (catalog grid; redirects to /dashboard when authenticated)
- /dashboard      Personalized dashboard
- /title/:id      Title detail (with rating, lists, favorite, recommendations)
- /library        My Library (requires auth) with tabs
- /settings       Settings/Profile (requires auth)
- /auth           Sign-in / Sign-up

## Behavior (Catalog)
- Home loads a single page of 30 items for trending or search results.
- Search input uses an inline setTimeout debounce (~300ms) (TopBar and Home filter).
- No infinite scroll or periodic refresh is performed.
- An explicit "Load more" button is available to fetch and append the next page. Results are de-duplicated by id and end-of-list is detected when fewer than a page is returned or no new items are added.
- A minimal filter container appears on Home with: title search, genre multiselect, status select (informational for now), and a popularity sort selector.
- GraphQL uses a simple in-memory cache (no TTL or invalidation).

## Supabase Setup (Schema)
See ../../kavia-docs/supabase-schema.md for a concise guide.

Notes:
- Ratings are stored in public.user_ratings on a 1..5 scale; notes/comments are not implemented.
- Lists are stored in public.user_lists with list_name in { plan, current, completed, favorite }.
- Optional Progress is stored in public.user_progress with last_unit numeric.
- Without env vars the app runs in mock mode and will not persist ratings.

## Styling
Palette is defined in src/theme.css.

## Feature Flags
- REACT_APP_FEATURE_FLAGS can enable: 
  - progress: enables progress UI on Detail and uses user_progress table if present.
  - analytics: enables console analytics stubs.

### Optional progress table
SQL snippet retained in this document above.
