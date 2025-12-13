-- Create a security definer function to remove expired suspension by username
CREATE OR REPLACE FUNCTION public.remove_expired_suspension_by_username(p_username text)
RETURNS void
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
  
  -- Delete the ban record
  DELETE FROM banned_users WHERE user_id = v_user_id;
END;
$$;