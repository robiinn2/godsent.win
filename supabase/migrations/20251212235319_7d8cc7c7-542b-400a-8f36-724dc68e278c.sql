-- Add suspended_until column to banned_users for suspensions
ALTER TABLE public.banned_users ADD COLUMN IF NOT EXISTS suspended_until timestamp with time zone;

-- Add appeal_deadline column for 30-day auto-termination warning
ALTER TABLE public.banned_users ADD COLUMN IF NOT EXISTS appeal_deadline timestamp with time zone;

-- Add appeal_submitted column to track if user submitted an appeal
ALTER TABLE public.banned_users ADD COLUMN IF NOT EXISTS appeal_submitted boolean DEFAULT false;

-- Allow public access to check ban status (for login page)
DROP POLICY IF EXISTS "Anyone can check their ban status" ON public.banned_users;
CREATE POLICY "Anyone can check their ban status"
ON public.banned_users
FOR SELECT
USING (true);

-- Allow admins to update banned_users (for unsuspend/unban)
DROP POLICY IF EXISTS "Admins can update banned users" ON public.banned_users;
CREATE POLICY "Admins can update banned users"
ON public.banned_users
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update support_tickets to allow appeals (unauthenticated users need to create tickets)
DROP POLICY IF EXISTS "Anyone can create unban appeals" ON public.support_tickets;
CREATE POLICY "Anyone can create unban appeals"
ON public.support_tickets
FOR INSERT
WITH CHECK (subject = 'Unban Appeal');