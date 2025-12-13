-- Fix banned_users ban_type CHECK constraint to match app values
ALTER TABLE public.banned_users
  DROP CONSTRAINT IF EXISTS banned_users_ban_type_check;

ALTER TABLE public.banned_users
  ADD CONSTRAINT banned_users_ban_type_check
  CHECK (ban_type IN ('suspended', 'banned'));