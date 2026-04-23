-- ============================================================================
-- TCA HR Compliance System — RLS Lockdown (Stage 6)
-- ============================================================================
-- This migration:
--   1. Normalises home names across staff, shift_patterns, rota_entries,
--      onboarding_checklists and user_roles.homes[] to canonical casing.
--   2. Enables Row-Level Security on all sensitive tables.
--   3. Creates helper functions current_user_email(), current_user_homes(),
--      current_user_is_admin(), current_user_has_home(text).
--   4. Creates SELECT/INSERT/UPDATE/DELETE policies scoped by home.
--
-- Canonical home names:
--   DOM Care, Maple Lodge, Spring House, Spring Lodge, Dorothy Lodge, Cambria
--
-- Role semantics:
--   admin                -> full access to everything
--   registered_manager   -> read/write rows for homes in user_roles.homes[]
--   rm                   -> same as registered_manager
--   (any other role)     -> no access to HR data
--
-- Rota + pay tables:
--   visible to admin + rm/registered_manager only (no other roles).
-- Invoice tables:
--   admin-only.
-- Audit log:
--   admin-only (read).
-- user_roles:
--   each user can read their own row; admin can read all.
--
-- Run order: paste into Supabase SQL Editor, review, then Run.
-- Safe to re-run (idempotent where possible).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. NORMALISE HOME NAMES
-- ----------------------------------------------------------------------------
-- Standardise "DOM CARE" -> "DOM Care" and fix any other casing drift.
-- Add more rewrites below if new variants are discovered.

UPDATE staff                 SET loc           = 'DOM Care' WHERE lower(loc)           = 'dom care';
UPDATE shift_patterns        SET home          = 'DOM Care' WHERE lower(home)          = 'dom care';
UPDATE rota_entries          SET home          = 'DOM Care' WHERE lower(home)          = 'dom care';
UPDATE onboarding_checklists SET home_location = 'DOM Care' WHERE lower(home_location) = 'dom care';

-- user_roles.homes is a text[] array — rewrite any element matching case-insensitively.
UPDATE user_roles
SET homes = (
  SELECT array_agg(
    CASE
      WHEN lower(h) = 'dom care'       THEN 'DOM Care'
      WHEN lower(h) = 'maple lodge'    THEN 'Maple Lodge'
      WHEN lower(h) = 'spring house'   THEN 'Spring House'
      WHEN lower(h) = 'spring lodge'   THEN 'Spring Lodge'
      WHEN lower(h) = 'dorothy lodge'  THEN 'Dorothy Lodge'
      WHEN lower(h) = 'cambria'        THEN 'Cambria'
      ELSE h
    END
  )
  FROM unnest(homes) AS h
)
WHERE homes IS NOT NULL AND array_length(homes, 1) > 0;

-- ----------------------------------------------------------------------------
-- 2. HELPER FUNCTIONS
-- ----------------------------------------------------------------------------
-- These read the authenticated JWT and look up user_roles by email.
-- SECURITY DEFINER so they can read user_roles regardless of caller's RLS.

CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM user_roles WHERE lower(email) = public.current_user_email() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_homes()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(homes, ARRAY[]::text[])
    FROM user_roles
   WHERE lower(email) = public.current_user_email()
   LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() IN ('admin','registered_manager','rm');
$$;

CREATE OR REPLACE FUNCTION public.current_user_has_home(h text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.current_user_is_admin()
    OR lower(coalesce(h,'')) = ANY(SELECT lower(x) FROM unnest(public.current_user_homes()) x);
$$;

GRANT EXECUTE ON FUNCTION public.current_user_email()      TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role()       TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_homes()      TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin()   TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_is_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_has_home(text) TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. ENABLE RLS + DROP ANY EXISTING POLICIES (clean slate)
-- ----------------------------------------------------------------------------
-- List of tables we will protect.

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'staff','supervisions','staff_documents','training','audit_log',
    'user_roles','shift_patterns','rota_entries','open_shifts',
    'staff_pay_rates','onboarding_checklists',
    'invoice_clients','invoice_records','invoice_sequences'
  ];
  pol record;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    FOR pol IN
      SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 4. POLICIES — staff (filter by loc)
-- ----------------------------------------------------------------------------
CREATE POLICY staff_select ON public.staff
  FOR SELECT TO authenticated
  USING (public.current_user_has_home(loc));

CREATE POLICY staff_insert ON public.staff
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_has_home(loc));

CREATE POLICY staff_update ON public.staff
  FOR UPDATE TO authenticated
  USING (public.current_user_has_home(loc))
  WITH CHECK (public.current_user_has_home(loc));

CREATE POLICY staff_delete ON public.staff
  FOR DELETE TO authenticated
  USING (public.current_user_is_admin());

-- ----------------------------------------------------------------------------
-- 5. POLICIES — supervisions (filter via staff.loc)
-- ----------------------------------------------------------------------------
CREATE POLICY supervisions_rw ON public.supervisions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = supervisions.staff_id
        AND public.current_user_has_home(s.loc)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = supervisions.staff_id
        AND public.current_user_has_home(s.loc)
    )
  );

-- ----------------------------------------------------------------------------
-- 6. POLICIES — staff_documents (filter via staff.loc)
-- ----------------------------------------------------------------------------
CREATE POLICY staff_documents_rw ON public.staff_documents
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = staff_documents.staff_id
        AND public.current_user_has_home(s.loc)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = staff_documents.staff_id
        AND public.current_user_has_home(s.loc)
    )
  );

-- ----------------------------------------------------------------------------
-- 7. POLICIES — training (filter via staff.loc)
-- ----------------------------------------------------------------------------
CREATE POLICY training_rw ON public.training
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = training.staff_id
        AND public.current_user_has_home(s.loc)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = training.staff_id
        AND public.current_user_has_home(s.loc)
    )
  );

-- ----------------------------------------------------------------------------
-- 8. POLICIES — rota + pay (manager/admin only, filter by home)
-- ----------------------------------------------------------------------------
CREATE POLICY shift_patterns_rw ON public.shift_patterns
  FOR ALL TO authenticated
  USING (public.current_user_is_manager() AND public.current_user_has_home(home))
  WITH CHECK (public.current_user_is_manager() AND public.current_user_has_home(home));

CREATE POLICY rota_entries_rw ON public.rota_entries
  FOR ALL TO authenticated
  USING (public.current_user_is_manager() AND public.current_user_has_home(home))
  WITH CHECK (public.current_user_is_manager() AND public.current_user_has_home(home));

CREATE POLICY open_shifts_rw ON public.open_shifts
  FOR ALL TO authenticated
  USING (public.current_user_is_manager() AND public.current_user_has_home(home))
  WITH CHECK (public.current_user_is_manager() AND public.current_user_has_home(home));

CREATE POLICY staff_pay_rates_rw ON public.staff_pay_rates
  FOR ALL TO authenticated
  USING (
    public.current_user_is_manager()
    AND EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = staff_pay_rates.staff_id
        AND public.current_user_has_home(s.loc)
    )
  )
  WITH CHECK (
    public.current_user_is_manager()
    AND EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = staff_pay_rates.staff_id
        AND public.current_user_has_home(s.loc)
    )
  );

-- ----------------------------------------------------------------------------
-- 9. POLICIES — onboarding_checklists (home_location)
-- ----------------------------------------------------------------------------
CREATE POLICY onboarding_checklists_rw ON public.onboarding_checklists
  FOR ALL TO authenticated
  USING (public.current_user_has_home(home_location))
  WITH CHECK (public.current_user_has_home(home_location));

-- ----------------------------------------------------------------------------
-- 10. POLICIES — audit_log (admin-only)
-- ----------------------------------------------------------------------------
CREATE POLICY audit_log_select ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.current_user_is_admin());

CREATE POLICY audit_log_insert ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true);  -- any logged-in user can write an audit entry; nobody else can read non-admin

-- ----------------------------------------------------------------------------
-- 11. POLICIES — invoice_* (admin-only)
-- ----------------------------------------------------------------------------
CREATE POLICY invoice_clients_rw ON public.invoice_clients
  FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

CREATE POLICY invoice_records_rw ON public.invoice_records
  FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

CREATE POLICY invoice_sequences_rw ON public.invoice_sequences
  FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- ----------------------------------------------------------------------------
-- 12. POLICIES — user_roles (self-read; admin full)
-- ----------------------------------------------------------------------------
CREATE POLICY user_roles_select_self ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_admin()
    OR lower(email) = public.current_user_email()
  );

CREATE POLICY user_roles_admin_write ON public.user_roles
  FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- ============================================================================
-- DONE.
-- After running, verify with:
--   SELECT * FROM pg_policies WHERE schemaname='public' ORDER BY tablename;
-- ============================================================================

COMMIT;
