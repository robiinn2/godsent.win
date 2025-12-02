-- Create a function to notify admins when a new user registers
CREATE OR REPLACE FUNCTION public.notify_admins_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- Insert notification for all admins
  FOR admin_record IN 
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
      admin_record.user_id,
      'new_account',
      'New Account Created',
      'User ' || NEW.username || ' has registered'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS on_new_user_notify_admins ON public.profiles;
CREATE TRIGGER on_new_user_notify_admins
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_new_user();

-- Create a function to notify admins when a new support ticket is created
CREATE OR REPLACE FUNCTION public.notify_admins_new_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
  ticket_user TEXT;
BEGIN
  -- Get the username of the ticket creator
  SELECT username INTO ticket_user FROM public.profiles WHERE id = NEW.user_id;
  
  -- Insert notification for all admins
  FOR admin_record IN 
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
      admin_record.user_id,
      'new_ticket',
      'New Support Ticket',
      'User ' || COALESCE(ticket_user, 'Unknown') || ' submitted: ' || NEW.subject
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger on support_tickets table
DROP TRIGGER IF EXISTS on_new_ticket_notify_admins ON public.support_tickets;
CREATE TRIGGER on_new_ticket_notify_admins
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_new_ticket();