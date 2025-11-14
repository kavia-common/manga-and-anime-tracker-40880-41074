# RLS Notes for Koma Corner

This document summarizes important points to avoid "new row violates row-level security policy" errors when interacting with Supabase.

1) Table names (verify in your Supabase project):
   - Ratings: public.user_ratings
   - Lists: public.user_lists  (NOT users_lists)
   - Optional Progress: public.user_progress

2) Policies (must exist on the correct tables):
   - All three tables should have RLS enabled.
   - Policies should enforce per-user access with `auth.uid() = user_id` for SELECT, INSERT, UPDATE, DELETE.
   - See ../koma_corner_frontend/assets/supabase.md for the idempotent SQL to create tables, indexes, and policies.

3) Frontend writes include user_id explicitly:
   - The frontend now sets `user_id = auth.uid()` for all write operations (insert/upsert/delete filters) for:
     - user_ratings
     - user_lists
     - user_progress
   - This satisfies WITH CHECK policies on INSERT/UPDATE and avoids depending on database defaults.

4) Error logging:
   - The frontend logs Supabase error code/message and adds a hint when an RLS policy blocks the operation.
   - Check the browser console for details if adds/removes fail.

5) Retesting:
   - Sign in, then add/remove a title across favorites/plan/current/completed.
   - If any operation fails, verify:
     - You are authenticated (valid session).
     - Policies exist on public.user_lists (not users_lists).
     - The SQL from assets/supabase.md has been applied.

