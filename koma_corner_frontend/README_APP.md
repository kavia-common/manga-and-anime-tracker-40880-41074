# Koma Corner Frontend (React SPA)

Ocean Professional minimalist React SPA for browsing manga/anime, managing a personal library, and rating titles. Auth and data persistence are powered by Supabase (optional for local mock mode).

## Features
- Catalog grid with search
- Title detail view
- My Library (requires auth)
- Ratings enabled (no notes/comments)
- Supabase Auth (email/password + Google SSO)
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
- Without env vars the app runs in mock mode and will not persist ratings.

## Google SSO (Supabase OAuth)
Enable Google Sign-In via Supabase:
1) In Supabase Dashboard -> Authentication -> Providers -> Google:
   - Enable the Google provider.
   - Provide your Google OAuth Client ID and Client Secret (from Google Cloud Console).
2) In Supabase Dashboard -> Authentication -> URL Configuration:
   - Add your site URL to "Site URL" (e.g., http://localhost:3000 for local).
   - Add Authorized Redirect URLs:
     - http://localhost:3000
     - http://localhost:3000/auth
     - Any deployed frontend URL and its /auth path (e.g., https://your.app and https://your.app/auth)
   Supabase will handle redirects back to the SPA root or the provided redirectTo.
3) Ensure your .env includes:
   - REACT_APP_SUPABASE_URL
   - REACT_APP_SUPABASE_KEY
   - REACT_APP_FRONTEND_URL (used for OAuth/email redirect targets)

Usage:
- Navigate to /auth and click "Continue with Google".
- The app uses signInWithOAuth({ provider: 'google', options: { redirectTo: REACT_APP_FRONTEND_URL || window.location.origin } }).
- Session handling is automatic via onAuthStateChange in src/context/AppContext.jsx. After redirect, user state is refreshed and guarded routes (e.g., /library) work as expected.

Troubleshooting:
- If you see "Supabase env vars missing" banner, set the required .env variables and restart the dev server.
- If Google redirects to a disallowed URL, verify the "Site URL" and authorized redirect URLs in Supabase Settings.
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

## Notes
- Ratings persistence is wired: see src/services/supabaseData.js and src/context/AppContext.jsx. Without Supabase env vars, the app falls back to in-memory ratings.
- AniList integration: catalog data is fetched from the public AniList GraphQL API (https://graphql.anilist.co) using a lightweight helper (src/services/graphql.js). The catalog service (src/services/catalog.js) provides search, trending, detail, and minimal batch lookups, with in-memory caching and graceful mock fallbacks if the API call fails.
- Rate limiting: AniList is a public API with fair-use limits. This app memoizes recent responses in-memory to reduce calls and keeps the UI responsive with loading/error states. If the API is temporarily unavailable, Home/Search fall back to the local mock dataset for a basic experience.
