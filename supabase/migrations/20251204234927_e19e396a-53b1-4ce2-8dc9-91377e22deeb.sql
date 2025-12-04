-- Allow elders and admins to create posts in announcements
CREATE POLICY "Elders and admins can create posts in announcements"
ON public.posts
FOR INSERT
WITH CHECK (
  (auth.uid() IS NOT NULL) 
  AND (NOT is_banned(auth.uid())) 
  AND (section_id IN (SELECT id FROM forum_sections WHERE slug = 'announcements'))
  AND (has_role(auth.uid(), 'elder') OR has_role(auth.uid(), 'admin'))
);