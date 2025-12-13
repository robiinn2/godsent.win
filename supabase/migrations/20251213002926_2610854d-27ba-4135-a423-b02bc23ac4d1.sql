-- Create table to track wheel spins
CREATE TABLE public.wheel_spins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  spun_at timestamp with time zone NOT NULL DEFAULT now(),
  result text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wheel_spins ENABLE ROW LEVEL SECURITY;

-- Users can view their own spins
CREATE POLICY "Users can view their own spins"
ON public.wheel_spins
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own spins
CREATE POLICY "Users can insert their own spins"
ON public.wheel_spins
FOR INSERT
WITH CHECK (auth.uid() = user_id);