-- Drop existing data (keeping schema for sandro to register)
TRUNCATE profiles, user_roles, invitation_codes, posts, banned_users CASCADE;

-- Update invitation_codes table structure for new key format
ALTER TABLE invitation_codes 
  DROP COLUMN IF EXISTS code,
  ADD COLUMN IF NOT EXISTS key TEXT PRIMARY KEY,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update banned_users table for enhanced ban system
ALTER TABLE banned_users 
  ADD COLUMN IF NOT EXISTS ban_type TEXT CHECK (ban_type IN ('temporary', 'permanent')),
  ADD COLUMN IF NOT EXISTS banned_by_username TEXT,
  ADD COLUMN IF NOT EXISTS wipe_date TIMESTAMP WITH TIME ZONE;

-- Add profile picture support
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS pfp_url TEXT DEFAULT '/placeholder.svg';

-- Create support tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'responded', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ticket responses table
CREATE TABLE IF NOT EXISTS ticket_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE NOT NULL,
  responder_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updates/files table for file uploads
CREATE TABLE IF NOT EXISTS update_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  filename TEXT NOT NULL,
  description TEXT,
  release_date TIMESTAMP WITH TIME ZONE,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user invitations tracking table
CREATE TABLE IF NOT EXISTS user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  invites_remaining INTEGER DEFAULT 0,
  granted_by UUID REFERENCES profiles(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Remove resell section
DELETE FROM forum_sections WHERE slug = 'resell';

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE update_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_tickets
CREATE POLICY "Users can view their own tickets"
  ON support_tickets FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create tickets"
  ON support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id AND NOT is_banned(auth.uid()));

CREATE POLICY "Admins can update tickets"
  ON support_tickets FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for ticket_responses
CREATE POLICY "Users can view responses to their tickets"
  ON ticket_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets 
      WHERE support_tickets.id = ticket_responses.ticket_id 
      AND (support_tickets.user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Admins can create responses"
  ON ticket_responses FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- RLS Policies for update_files
CREATE POLICY "Everyone can view update files"
  ON update_files FOR SELECT
  USING (NOT is_banned(auth.uid()));

CREATE POLICY "Only sandro can upload files"
  ON update_files FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.username = 'sandro'
    )
  );

-- RLS Policies for user_invitations
CREATE POLICY "Users can view their own invitations"
  ON user_invitations FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage invitations"
  ON user_invitations FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Update posts RLS to prevent banned users from posting
DROP POLICY IF EXISTS "Non-banned users can create posts in resell/questions" ON posts;

CREATE POLICY "Non-banned users can create posts in questions"
  ON posts FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND NOT is_banned(auth.uid()) 
    AND section_id IN (
      SELECT id FROM forum_sections WHERE slug = 'questions'
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert invitation code for sandro (code 411 still works for initial setup)
INSERT INTO invitation_codes (key, used_by, used_at) 
VALUES ('411', NULL, NULL)
ON CONFLICT (key) DO NOTHING;