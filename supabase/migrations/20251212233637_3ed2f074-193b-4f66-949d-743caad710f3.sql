-- Drop the restrictive policy and recreate as permissive
DROP POLICY IF EXISTS "Authenticated users can view sections" ON public.forum_sections;

CREATE POLICY "Authenticated users can view sections" 
ON public.forum_sections 
FOR SELECT 
TO authenticated
USING ((auth.uid() IS NOT NULL) AND (NOT is_banned(auth.uid())));