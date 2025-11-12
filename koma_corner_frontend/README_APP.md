# Koma Corner Frontend (React SPA)

Ocean Professional minimalist React SPA for browsing manga/anime, managing a personal library, and rating titles. Auth and data persistence are powered by Supabase (optional for local mock mode).

## Features
- Catalog grid with search
- Title detail view
- My Library (requires auth)
- Ratings enabled (no notes/comments)
- Supabase Auth (email/password baseline; Google can be added)
- Ocean Professional minimalist styling

## Getting Started
1) Install dependencies
   npm install

2) Configure environment variables (create .env)
   REACT_APP_SUPABASE_URL=<your_supabase_url>
   REACT_APP_SUPABASE_KEY=<your_supabase_anon_key>
   REACT_APP_FRONTEND_URL=http://localhost:3000

   Optional (currently unused):
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
   REACT_APP_FEATURE_FLAGS=
   REACT_APP_EXPERIMENTS_ENABLED=false

3) Start the dev server
   npm start

If Supabase env vars are not set, the app runs fully in mock mode (catalog + in-memory ratings only).

## Pages
- /               Home (catalog grid)
- /title/:id      Title detail (with rating)
- /library        My Library (requires auth)
- /auth           Sign-in / Sign-up

## Supabase Setup (Schema)
Use SQL to create required tables. Ratings are enabled. Notes/Comments are intentionally excluded.

-- Users: Managed by Supabase Auth (auth.users)

-- Personal library list (favorite/plan/current/completed - optional extension)
create table if not exists public.user_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_id text not null,
  media_type text not null check (media_type in ('manga','anime')),
  list_name text not null check (list_name in ('plan','current','completed','favorite')),
  created_at timestamptz not null default now(),
  unique(user_id, media_id, media_type, list_name)
) security invoker;

-- Ratings (1..5)
create table if not exists public.user_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_id text not null,
  media_type text not null check (media_type in ('manga','anime')),
  rating int not null check (rating between 1 and 5),
  updated_at timestamptz not null default now(),
  unique(user_id, media_id, media_type)
) security invoker;

-- RLS
alter table public.user_lists enable row level security;
alter table public.user_ratings enable row level security;

create policy "Lists are viewable by owner"
on public.user_lists for select
using (auth.uid() = user_id);

create policy "Lists are modifiable by owner"
on public.user_lists for all
using (auth.uid() = user_id);

create policy "Ratings are viewable by owner"
on public.user_ratings for select
using (auth.uid() = user_id);

create policy "Ratings are modifiable by owner"
on public.user_ratings for all
using (auth.uid() = user_id);

-- Optionally create a 'titles' table if you plan server-side ingestion;
-- for now frontend uses AniList or mock data, so this is not required.

## Styling
Colors and minimal components are in src/theme.css following the Ocean Professional palette:
- primary: #374151
- secondary: #9CA3AF
- success: #10B981
- error: #EF4444
- background: #FFFFFF
- surface: #F9FAFB
- text: #111827

## Notes
- This initial scaffold stores ratings in memory when Supabase is not configured. To persist ratings, implement API calls to public.user_ratings with Supabase client inside context or a dedicated service.
- AniList integration is not included yet; a local mock dataset is provided.
