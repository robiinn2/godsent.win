-- Create storage bucket for post files
INSERT INTO storage.buckets (id, name, public) VALUES ('post-files', 'post-files', true);

-- Create storage policies for post files
CREATE POLICY "Anyone can view post files"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-files');

CREATE POLICY "Authenticated users can upload post files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'post-files' AND auth.uid() IS NOT NULL);