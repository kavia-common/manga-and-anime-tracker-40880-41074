# Koma Corner Frontend

This is the React SPA for Koma Corner following the Ocean Professional minimalist style. It includes routing, Supabase auth integration (email/password), a mock catalog, and ratings (no notes/comments).

Quick start:
1) npm install
2) Create .env with:
   REACT_APP_SUPABASE_URL=your_url
   REACT_APP_SUPABASE_KEY=your_anon_key
   REACT_APP_FRONTEND_URL=http://localhost:3000
3) npm start

Security notes:
- Redirects and navigation are hardened to only allow same-origin path-based targets.
- Supabase emailRedirectTo uses REACT_APP_FRONTEND_URL origin with a safe path.

Docs:
- See README_APP.md for detailed instructions and Supabase schema.

Behavior summary:
- Catalog loads a single page (30 items) for trending or search.
- Search uses a simple inline debounce (~300ms) in the TopBar and Home filter.
- Explicit "Load more" button adds subsequent pages; no infinite scroll.
- Basic client-side genre/status filters and popularity sort in a container on Home.
- GraphQL uses a simple in-memory cache without TTL.
