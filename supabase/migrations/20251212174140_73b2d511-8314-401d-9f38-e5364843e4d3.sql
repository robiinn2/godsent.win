-- Add file columns to posts table for file attachments
ALTER TABLE public.posts 
ADD COLUMN file_url text,
ADD COLUMN file_name text,
ADD COLUMN file_size integer;

-- Create policy for admins and elders to delete posts
CREATE POLICY "Elders can delete any post"
ON public.posts
FOR DELETE
USING (has_role(auth.uid(), 'elder'::app_role));