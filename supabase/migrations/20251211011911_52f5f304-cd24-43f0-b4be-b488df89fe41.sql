-- Create post_replies table
CREATE TABLE public.post_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.post_replies ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view replies"
ON public.post_replies FOR SELECT
USING (auth.uid() IS NOT NULL AND NOT is_banned(auth.uid()));

CREATE POLICY "Authenticated users can create replies"
ON public.post_replies FOR INSERT
WITH CHECK (auth.uid() = author_id AND NOT is_banned(auth.uid()));

CREATE POLICY "Users can update their own replies"
ON public.post_replies FOR UPDATE
USING (auth.uid() = author_id AND NOT is_banned(auth.uid()));

CREATE POLICY "Admins can delete any reply"
ON public.post_replies FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_replies;