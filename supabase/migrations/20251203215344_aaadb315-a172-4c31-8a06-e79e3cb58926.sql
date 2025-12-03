-- Create a function to assign admin role that bypasses RLS
CREATE OR REPLACE FUNCTION public.assign_admin_role_for_key(p_user_id uuid, p_invitation_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the invitation code is 411, assign admin role
  IF p_invitation_code = '411' THEN
    -- Check if user already has admin role
    IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role = 'admin') THEN
      INSERT INTO user_roles (user_id, role) VALUES (p_user_id, 'admin');
    END IF;
  END IF;
END;
$$;