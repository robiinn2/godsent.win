-- Update announcements policy to admin-only (remove elder access)
DROP POLICY IF EXISTS "Elders and admins can create posts in announcements" ON public.posts;

CREATE POLICY "Admins can create posts in announcements" 
ON public.posts 
FOR INSERT 
TO authenticated
WITH CHECK (
  (auth.uid() IS NOT NULL) 
  AND (NOT is_banned(auth.uid())) 
  AND (section_id IN (SELECT id FROM forum_sections WHERE slug = 'announcements')) 
  AND has_role(auth.uid(), 'admin')
);