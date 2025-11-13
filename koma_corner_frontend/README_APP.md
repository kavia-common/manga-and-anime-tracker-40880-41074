# Koma Corner Frontend (React SPA)

Ocean Professional minimalist React SPA for browsing manga/anime, managing a personal library, and rating titles. Auth and data persistence are powered by Supabase (optional for local mock mode).

## Features
- Catalog grid with search, filters (type, status, genres), and sorting
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

   # New optional tunables:
   REACT_APP_PAGE_SIZE=30                # Per-page size for catalog queries (default 30)
   REACT_APP_SEARCH_DEBOUNCE_MS=300      # Debounce delay for search input (default 300ms)
   REACT_APP_REFRESH_INTERVAL_MS=300000  # Periodic refresh interval in ms (0 to disable; default disabled)
   REACT_APP_CACHE_TTL_MS=300000         # TTL for AniList GraphQL cache entries in ms (default 300000)

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

## Supabase Setup (Schema)
A concise, centralized schema and usage guide (including DDL and RLS) is available here:
- ../../kavia-docs/supabase-schema.md

Quick steps:
1) Open your project in the Supabase SQL editor.
2) Copy the SQL from kavia-docs/supabase-schema.md and run it to create public.user_lists and public.user_ratings with RLS enabled.
3) In your .env, set:
   REACT_APP_SUPABASE_URL=<your_supabase_url>
   REACT_APP_SUPABASE_KEY=<your_supabase_anon_key>
   REACT_APP_FRONTEND_URL=http://localhost:3000
4) Start the app with npm start and sign up/sign in from /auth.

Notes:
- Ratings are stored in public.user_ratings on a 1..5 scale; notes/comments are not implemented.
- Lists are stored in public.user_lists with list_name in { plan, current, completed, favorite }.
- Optional Progress is stored in public.user_progress with last_unit numeric.
- Without env vars the app runs in mock mode and will not persist ratings.

## Authentication
Koma Corner uses Supabase authentication:
- Email/password only.
- Sign up and sign in are available at /auth.
- On sign up, Supabase will send a confirmation email and redirect to REACT_APP_FRONTEND_URL after confirmation.
- Ensure your .env includes:
  - REACT_APP_SUPABASE_URL
  - REACT_APP_SUPABASE_KEY
  - REACT_APP_FRONTEND_URL (used for email redirect targets)
  - Optional: REACT_APP_FEATURE_FLAGS (comma-separated: e.g., "progress,analytics")

Troubleshooting:
- If you see "Supabase env vars missing" banner, set the required .env variables and restart the dev server.
- For local development, REACT_APP_FRONTEND_URL should be http://localhost:3000.

## Styling
Colors and minimal components are in src/theme.css following the Ocean Professional palette:
- primary: #374151
- secondary: #9CA3AF
- success: #10B981
- error: #EF4444
- background: #FFFFFF
- surface: #F9FAFB
- text: #111827

## Feature Flags
- REACT_APP_FEATURE_FLAGS can enable: 
  - progress: enables progress UI on Detail and uses user_progress table if present.
  - analytics: enables console analytics stubs.

### Optional progress table
Run this SQL if you enable the "progress" feature:
```sql
create extension if not exists "uuid-ossp";

create table if not exists public.user_progress (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  media_id text not null,
  media_type text check (media_type in ('anime','manga')) not null,
  last_unit integer not null default 0,
  updated_at timestamp with time zone default now(),
  unique(user_id, media_id, media_type)
);
alter table public.user_progress enable row level security;
create policy "user owns progress" on public.user_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

## Notes
- Ratings persistence is wired: see src/services/supabaseData.js and src/context/AppContext.jsx. Without Supabase env vars, the app falls back to in-memory ratings.
- AniList integration: catalog data is fetched from the public AniList GraphQL API (https://graphql.anilist.co) using a lightweight helper (src/services/graphql.js). The catalog service (src/services/catalog.js) provides search, trending, detail, and minimal batch lookups, with in-memory caching and graceful mock fallbacks if the API call fails.
- Rate limiting: AniList is a public API with fair-use limits. This app memoizes recent responses in-memory to reduce calls and keeps the UI responsive with loading/error states. If the API is temporarily unavailable, Home/Search fall back to the local mock dataset for a basic experience.
