# Supabase Integration Notes

Environment variables (must be set via .env):
- REACT_APP_SUPABASE_URL
- REACT_APP_SUPABASE_KEY
- REACT_APP_FRONTEND_URL (used for emailRedirectTo on sign-up; must match the app origin)
- Optional: REACT_APP_FEATURE_FLAGS (e.g., "progress,analytics")

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
- Lists: public.user_lists (plan/current/completed/favorite).
- Optional Progress: public.user_progress with last_unit (episode/chapter). Guarded by feature flag "progress" and table existence check.

Schema and RLS (apply in Supabase SQL editor or via migration/tooling):

-- Ensure pgcrypto for gen_random_uuid
create extension if not exists pgcrypto;

-- user_ratings
create table if not exists public.user_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_id text not null,
  media_type text not null check (media_type in ('manga','anime')),
  rating int2 not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, media_id, media_type)
);

-- user_lists
create table if not exists public.user_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_id text not null,
  media_type text not null check (media_type in ('manga','anime')),
  list_name text not null check (list_name in ('plan','current','completed','favorite')),
  created_at timestamptz not null default now(),
  unique(user_id, media_id, media_type, list_name)
);

-- user_progress (optional; enable via REACT_APP_FEATURE_FLAGS includes 'progress')
create table if not exists public.user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_id text not null,
  media_type text not null check (media_type in ('manga','anime')),
  last_unit int4 not null,
  updated_at timestamptz not null default now(),
  unique(user_id, media_id, media_type)
);

-- Helpful update trigger to manage updated_at (optional)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_updated_at_user_ratings'
  ) then
    create trigger set_updated_at_user_ratings
    before update on public.user_ratings
    for each row execute procedure public.set_updated_at();
  end if;
  if not exists (
    select 1 from pg_trigger where tgname = 'set_updated_at_user_progress'
  ) then
    create trigger set_updated_at_user_progress
    before update on public.user_progress
    for each row execute procedure public.set_updated_at();
  end if;
end $$;

-- RLS
alter table public.user_ratings enable row level security;
alter table public.user_lists enable row level security;
alter table public.user_progress enable row level security;

-- Drop pre-existing policies with same names to avoid duplicates (safe idempotency)
drop policy if exists "Allow select own ratings" on public.user_ratings;
drop policy if exists "Allow insert own ratings" on public.user_ratings;
drop policy if exists "Allow update own ratings" on public.user_ratings;
drop policy if exists "Allow delete own ratings" on public.user_ratings;

drop policy if exists "Allow select own lists" on public.user_lists;
drop policy if exists "Allow insert own lists" on public.user_lists;
drop policy if exists "Allow update own lists" on public.user_lists;
drop policy if exists "Allow delete own lists" on public.user_lists;

drop policy if exists "Allow select own progress" on public.user_progress;
drop policy if exists "Allow insert own progress" on public.user_progress;
drop policy if exists "Allow update own progress" on public.user_progress;
drop policy if exists "Allow delete own progress" on public.user_progress;

-- Policies: per-user ownership using auth.uid() = user_id
create policy "Allow select own ratings"
on public.user_ratings for select
using (auth.uid() = user_id);

create policy "Allow insert own ratings"
on public.user_ratings for insert
with check (auth.uid() = user_id);

create policy "Allow update own ratings"
on public.user_ratings for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Allow delete own ratings"
on public.user_ratings for delete
using (auth.uid() = user_id);

create policy "Allow select own lists"
on public.user_lists for select
using (auth.uid() = user_id);

create policy "Allow insert own lists"
on public.user_lists for insert
with check (auth.uid() = user_id);

create policy "Allow update own lists"
on public.user_lists for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Allow delete own lists"
on public.user_lists for delete
using (auth.uid() = user_id);

create policy "Allow select own progress"
on public.user_progress for select
using (auth.uid() = user_id);

create policy "Allow insert own progress"
on public.user_progress for insert
with check (auth.uid() = user_id);

create policy "Allow update own progress"
on public.user_progress for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Allow delete own progress"
on public.user_progress for delete
using (auth.uid() = user_id);

-- Indexes / constraints (idempotent via IF NOT EXISTS pattern for names)
do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'user_ratings_user_media_unique'
  ) then
    create unique index user_ratings_user_media_unique
      on public.user_ratings (user_id, media_id, media_type);
  end if;

  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'user_lists_user_media_list_unique'
  ) then
    create unique index user_lists_user_media_list_unique
      on public.user_lists (user_id, media_id, media_type, list_name);
  end if;

  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'user_progress_user_media_unique'
  ) then
    create unique index user_progress_user_media_unique
      on public.user_progress (user_id, media_id, media_type);
  end if;
end $$;

-- Optional: set table owners or grants if needed (default anon/authenticated via RLS)
-- No broad grants recommended; RLS enforces per-user access.

## Verification checklist (after running the SQL)
1) Insert a test row as an authenticated user via Supabase SQL:
   -- Example: using your user id (replace <user_uuid>)
   -- Should succeed only when auth.uid() = user_id (via PostgREST; in SQL editor, set role to authenticated)
   -- For quick smoke tests, interact via the frontend to perform upserts.

2) Frontend feature flags:
   - To enable progress UI: set REACT_APP_FEATURE_FLAGS=progress,analytics (analytics optional)
   - The app checks for user_progress existence at runtime and uses it if present.

3) Auth redirect configuration in Supabase Dashboard:
   - Authentication > URL Configuration
   - Site URL: your REACT_APP_FRONTEND_URL origin (e.g., http://localhost:3000)
   - Redirect URLs allowlist:
     * http://localhost:3000/**
     * Your production domain /**

4) Environment variables:
   - REACT_APP_SUPABASE_URL=https://deygudumwuravulvovrh.supabase.co
   - REACT_APP_SUPABASE_KEY=… (anon key)
   - REACT_APP_FRONTEND_URL=http://localhost:3000

## Notes
- The provided SQL is idempotent: re-running is safe; it drops and recreates policies to ensure correct definitions.
- SECURITY INVOKER is not explicitly set; default behavior with RLS + auth.uid() policies is sufficient for @supabase/supabase-js v2 usage.
- Frontend already integrates ratings, lists, and optional progress; no further code changes required after schema creation.
