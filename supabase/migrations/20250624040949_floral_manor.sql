/*
  # Quests System Database Schema

  1. New Tables
    - `quests`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `title` (text)
      - `description` (text)
      - `type` (text)
      - `difficulty` (text)
      - `rewards` (jsonb)
      - `is_completed` (boolean)
      - `is_active` (boolean)
      - `progress` (integer)
      - `max_progress` (integer)
      - `due_date` (timestamptz)
      - `completed_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on quests table
    - Add policies for users to manage their own quests

  3. Indexes
    - Add indexes for common queries
*/

-- Create quests table
CREATE TABLE IF NOT EXISTS quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  type text NOT NULL CHECK (type IN ('daily', 'weekly', 'main', 'single')),
  difficulty text NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'epic')),
  rewards jsonb DEFAULT '{}',
  is_completed boolean DEFAULT false,
  is_active boolean DEFAULT true,
  progress integer DEFAULT 0 CHECK (progress >= 0),
  max_progress integer DEFAULT 1 CHECK (max_progress > 0),
  due_date timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;

-- Create policies for quests
CREATE POLICY "Users can read their own quests"
  ON quests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quests"
  ON quests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quests"
  ON quests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quests"
  ON quests
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_quests_updated_at
  BEFORE UPDATE ON quests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quests_user_id ON quests(user_id);
CREATE INDEX IF NOT EXISTS idx_quests_type ON quests(type);
CREATE INDEX IF NOT EXISTS idx_quests_is_active ON quests(is_active);
CREATE INDEX IF NOT EXISTS idx_quests_is_completed ON quests(is_completed);
CREATE INDEX IF NOT EXISTS idx_quests_created_at ON quests(created_at);