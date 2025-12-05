-- Drop the existing update policy and create a proper one
DROP POLICY IF EXISTS "System can update codes" ON invitation_codes;

-- Allow updating codes when marking them as used during registration (used_by was null)
CREATE POLICY "Allow marking codes as used"
ON invitation_codes
FOR UPDATE
USING (used_by IS NULL)
WITH CHECK (used_by IS NOT NULL);

-- Also allow admins to update any codes
CREATE POLICY "Admins can update codes"
ON invitation_codes
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));