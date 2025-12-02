-- Fix RLS policies - change from RESTRICTIVE to PERMISSIVE

-- Forum sections
DROP POLICY IF EXISTS "Authenticated users can view sections" ON public.forum_sections;
CREATE POLICY "Authenticated users can view sections"
ON public.forum_sections
FOR SELECT
TO authenticated
USING ((auth.uid() IS NOT NULL) AND (NOT is_banned(auth.uid())));

-- Support tickets - ensure admins can view all
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.support_tickets;
CREATE POLICY "Users can view their own tickets"
ON public.support_tickets
FOR SELECT
TO authenticated
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'));

-- Profiles - ensure all authenticated users can view
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (NOT is_banned(auth.uid()));

-- Posts - ensure authenticated users can view
DROP POLICY IF EXISTS "Authenticated users can view posts" ON public.posts;
CREATE POLICY "Authenticated users can view posts"
ON public.posts
FOR SELECT
TO authenticated
USING ((auth.uid() IS NOT NULL) AND (NOT is_banned(auth.uid())));