-- Add INSERT policy for admins to create invitation codes
CREATE POLICY "Admins can create invitation codes"
ON public.invitation_codes
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add DELETE policy for admins to terminate keys
CREATE POLICY "Admins can delete invitation codes"
ON public.invitation_codes
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to view all keys (not just unused)
DROP POLICY IF EXISTS "Anyone can view unused codes" ON public.invitation_codes;
CREATE POLICY "Admins can view all codes"
ON public.invitation_codes
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Allow users with invites to create keys
CREATE POLICY "Users with invites can create codes"
ON public.invitation_codes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_invitations 
    WHERE user_id = auth.uid() AND invites_remaining > 0
  )
);

-- Add granted_to column to track who received the invite grant
ALTER TABLE public.user_invitations ADD COLUMN IF NOT EXISTS topic text;

-- Add creator info to invitation_codes
ALTER TABLE public.invitation_codes ADD COLUMN IF NOT EXISTS creator_username text;