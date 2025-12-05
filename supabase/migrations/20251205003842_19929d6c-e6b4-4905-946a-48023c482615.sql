-- Allow users to update their own invitations (for decrementing remaining invites)
CREATE POLICY "Users can decrement their own invites"
ON user_invitations
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);