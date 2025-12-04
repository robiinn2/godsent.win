-- Allow users to view keys they created
CREATE POLICY "Users can view their own created codes"
ON public.invitation_codes
FOR SELECT
USING (created_by = auth.uid());

-- Allow users to view unused codes for registration
CREATE POLICY "Anyone can check if code is valid"
ON public.invitation_codes
FOR SELECT
USING (used_by IS NULL);