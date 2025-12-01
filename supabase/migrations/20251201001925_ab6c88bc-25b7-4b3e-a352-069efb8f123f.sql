-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true), ('updates', 'updates', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for updates
CREATE POLICY "Anyone can view updates" ON storage.objects FOR SELECT USING (bucket_id = 'updates');
CREATE POLICY "Only sandro can upload updates" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'updates' AND 
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.username = 'sandro')
);

-- Update profiles default pfp
ALTER TABLE profiles ALTER COLUMN pfp_url SET DEFAULT '/default-pfp.png';