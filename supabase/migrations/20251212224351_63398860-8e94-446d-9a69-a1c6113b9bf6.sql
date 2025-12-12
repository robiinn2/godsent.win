-- Add expires_at column to invitation_codes table
ALTER TABLE public.invitation_codes
ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;

-- Add expiration_days column to user_invitations (set by admin when granting)
ALTER TABLE public.user_invitations
ADD COLUMN expiration_days INTEGER DEFAULT 7;