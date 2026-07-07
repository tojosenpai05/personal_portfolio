-- ============================================================
-- RLS Rate-Limit Policies + Double Opt-In Booking Schema
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- Idempotent: safe to re-run.
-- ============================================================

-- 1. Confirm RLS is enabled on both tables
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- 2. Double opt-in columns on bookings.
--    confirmed_at stays NULL until the person clicks the email link.
--    The owner is only notified once confirmed_at is set.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS confirm_token text;

-- 3. Anon can no longer INSERT into bookings directly.
--    All writes now go through the submit-booking Edge Function
--    (service_role client, which bypasses RLS entirely).
DROP POLICY IF EXISTS "allow_anon_insert" ON bookings;
DROP POLICY IF EXISTS "anon_insert" ON bookings;
DROP POLICY IF EXISTS "booking_rate_limit_per_email" ON bookings;
CREATE POLICY "block_anon_insert" ON bookings
  FOR INSERT TO anon
  WITH CHECK (false);

-- 4. Anon cannot UPDATE bookings (confirmation happens via Edge Function).
DROP POLICY IF EXISTS "block_anon_update" ON bookings;
CREATE POLICY "block_anon_update" ON bookings
  FOR UPDATE TO anon USING (false);

-- 5. Anon cannot read bookings.
DROP POLICY IF EXISTS "allow_anon_select" ON bookings;
DROP POLICY IF EXISTS "block_anon_select" ON bookings;
CREATE POLICY "block_anon_select" ON bookings
  FOR SELECT TO anon USING (false);

-- 6. Rate-limit ledger. Keys are 'ip:<sha256hash>' and 'email:<address>'.
--    Only the service_role client (inside the Edge Function) touches this;
--    RLS is enabled with NO anon policies, so anon has zero access.
CREATE TABLE IF NOT EXISTS rate_limits (
  key text PRIMARY KEY,
  last_submitted_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- 6b. contact_messages.created_at was originally created with a typo'd name
--     ("created _at", with a space) via the Supabase Table Editor. Rename it
--     so the rate-limit policy below can reference it normally.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contact_messages' AND column_name = 'created _at'
  ) THEN
    ALTER TABLE contact_messages RENAME COLUMN "created _at" TO created_at;
  END IF;
END $$;

-- 7. Contact messages: one message per email per 10 minutes (unchanged).
DROP POLICY IF EXISTS "allow_anon_insert" ON contact_messages;
DROP POLICY IF EXISTS "anon_insert" ON contact_messages;
CREATE POLICY "contact_rate_limit_per_email" ON contact_messages
  FOR INSERT TO anon
  WITH CHECK (
    (SELECT COUNT(*) FROM public.contact_messages AS m
     WHERE m.email = email
       AND m.created_at > NOW() - INTERVAL '10 minutes'
    ) = 0
  );

DROP POLICY IF EXISTS "allow_anon_select" ON contact_messages;
CREATE POLICY "block_anon_select_contacts" ON contact_messages
  FOR SELECT TO anon USING (false);
