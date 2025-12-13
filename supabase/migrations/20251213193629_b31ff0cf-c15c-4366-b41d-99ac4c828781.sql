-- Create a security definer function to check ban status by username
-- This bypasses RLS since it's called before authentication
CREATE OR REPLACE FUNCTION public.check_ban_status_by_username(p_username text)
RETURNS TABLE(
  ban_type text,
  reason text,
  suspended_until timestamp with time zone,
  appeal_deadline timestamp with time zone,
  appeal_submitted boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get user ID from username
  SELECT id INTO v_user_id FROM profiles WHERE username = p_username;
  
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Return ban info if exists
  RETURN QUERY
  SELECT 
    bu.ban_type,
    bu.reason,
    bu.suspended_until,
    bu.appeal_deadline,
    bu.appeal_submitted
  FROM banned_users bu
  WHERE bu.user_id = v_user_id;
END;
$$;