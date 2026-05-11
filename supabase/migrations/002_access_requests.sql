-- 002_access_requests.sql
-- Self-service access requests submitted from the public login page.
-- Anyone (anon) can INSERT; only admins (per public.user_profiles.role) can SELECT/UPDATE.
-- The Netlify function netlify/functions/request-access.mjs writes here via the service role.
-- This file was already applied directly in the Supabase SQL editor; it is committed
-- here for tracking / replay purposes (the IF NOT EXISTS / DROP POLICY IF EXISTS clauses make it idempotent).

create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  organisation text,
  role text,
  message text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  decline_reason text,
  user_agent text,
  ip_hash text,
  constraint access_requests_status_check check (status in ('pending','approved','declined'))
);

create index if not exists access_requests_status_created_idx
  on public.access_requests (status, created_at desc);

create index if not exists access_requests_email_idx
  on public.access_requests (lower(email));

alter table public.access_requests enable row level security;

-- Anyone (anon or signed-in) can submit a new request.
drop policy if exists access_requests_insert_public on public.access_requests;
create policy access_requests_insert_public on public.access_requests
  for insert
  to anon, authenticated
  with check (true);

-- Only admins can read access requests.
drop policy if exists access_requests_admin_select on public.access_requests;
create policy access_requests_admin_select on public.access_requests
  for select
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid() and up.role = 'admin'
    )
  );

-- Only admins can mark a request approved / declined.
drop policy if exists access_requests_admin_update on public.access_requests;
create policy access_requests_admin_update on public.access_requests
  for update
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid() and up.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid() and up.role = 'admin'
    )
  );

comment on table public.access_requests is
  'Self-service access requests from the public /request-access page. Admins review and approve.';
