# Koma Corner Frontend (React SPA)

Ocean Professional minimalist React SPA for browsing manga/anime, managing a personal library, and rating titles. Auth and data persistence are powered by Supabase (optional for local mock mode).

## Features
- Catalog grid with simple search
- Title detail view with metadata, rating, favorites, lists, recommendations
- My Library (requires auth) with simple toggles: All, Favorites, Completed, Currently Watching, Planned to Watch
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
- /               Home (catalog grid only; same experience for anonymous and signed-in)
- /dashboard      Personalized dashboard
- /title/:id      Title detail (with rating, lists, favorite, recommendations)
- /library        My Library (requires auth) with toggles
- /settings       Settings/Profile (requires auth)
- /auth           Sign-in / Sign-up

## Behavior (Catalog)
- Home loads a single page of 30 items for trending.
- No infinite scroll or periodic refresh is performed.
- An explicit "Load more" button fetches and appends the next 30 items each time (perPage=30). Results are de-duplicated by id and end-of-list is detected when fewer than a page is returned or no new items are added. The button shows a loading state and is disabled while fetching.
- Home filter container includes: Media Type toggle (Anime / Manga / Both) and a Genre multiselect.
  - The Genre list includes an "All" option; when selected (alone or with others), no genre filtering is applied.
  - When "Both" is selected, pages alternate between Anime and Manga to keep pagination consistent.
- Status filter has been removed from the UI and logic.
- Global title search remains in the TopBar but is not used by the Home filter container.
- Popularity sort UI has been removed; the underlying query uses the API’s trending/popularity ordering.
- GraphQL uses a simple in-memory cache (no TTL or invalidation).

## Library
- The Library page waits until your session is checked and a user exists before fetching data.
- A simple toggle group replaces tabs: All, Favorites, Completed, Currently Watching, Planned to Watch.
- Each toggle fetches lazily only once using minimal batch queries (CatalogAPI.getMinimalByIds) and caches results locally; subsequent visits reuse the cache.
- While loading, a lightweight skeleton grid is shown. Results are de-duplicated by id.
- If you are signed out or Supabase is not configured, a friendly empty state is displayed.

## Sign-out behavior
- A centralized helper signOutAndNavigate() is used across the app (TopBar and Settings) to ensure consistent behavior.
- supabase.auth.signOut() is called exactly once per click and awaited with a 4s timeout guard; both { error } returns and thrown exceptions are handled.
- On timeout or failure, the app falls back to a local clear of user/session and shows a toast "Signed out locally". On success, it shows "Signed out".
- AppContext also listens for onAuthStateChange('SIGNED_OUT') and force-clears local state on any sign-out attempt completion to avoid stale UI.
- Navigation safely redirects to "/" after sign-out regardless of success, and sign-out buttons are disabled while the operation is in progress to prevent double clicks.
- In-flight fetches are canceled best-effort via an internal flag to avoid races.

## Supabase Setup (Schema)
See ../../kavia-docs/supabase-schema.md for a concise guide.

Notes:
- Ratings are stored in public.user_ratings on a 1..5 scale; notes/comments are not implemented.
- Lists are stored in public.user_lists with list_name in { plan, current, completed, favorite }.
- Optional Progress is stored in public.user_progress with last_unit numeric.
- Without env vars the app runs in mock mode and will not persist ratings.

## Styling
Palette is defined in src/theme.css.

### Title Grid Layout (Fixed 4 Columns)
- All pages that display title cards use a fixed 4-column grid via the shared component `src/components/TitleGrid.jsx`.
- The grid always renders exactly 4 columns (`grid-template-columns: repeat(4, 1fr)`).
- On viewports narrower than the minimum width required for 4 columns, the container becomes horizontally scrollable instead of changing the column count. This preserves 4 items per row at all sizes.
- Default gap is 24px to align with the Ocean Professional theme. You can customize via the `gap` prop.
- Usage:
  ```jsx
  import { TitleGrid } from '../components/TitleGrid';
  <TitleGrid
    items={data}
    gap={24}
    renderItem={(item) => (
      <div className="kc-card">{/* card content */}</div>
    )}
  />
  ```

## Feature Flags
- REACT_APP_FEATURE_FLAGS can enable: 
  - progress: enables progress UI on Detail and uses user_progress table if present.
  - analytics: enables console analytics stubs.

### Optional progress table
SQL snippet retained in this document above.
