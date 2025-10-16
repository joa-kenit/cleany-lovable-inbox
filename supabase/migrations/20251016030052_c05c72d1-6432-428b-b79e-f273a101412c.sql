-- Create email_actions table to track user decisions
CREATE TABLE public.email_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_sender TEXT NOT NULL,
  email_subject TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('keep', 'delete', 'unsubscribe')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_preferences table to store learned patterns
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_pattern TEXT NOT NULL,
  preferred_action TEXT NOT NULL CHECK (preferred_action IN ('keep', 'delete', 'unsubscribe')),
  confidence_score FLOAT NOT NULL DEFAULT 0.5,
  action_count INT NOT NULL DEFAULT 1,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, sender_pattern)
);

-- Create weekly_summaries table
CREATE TABLE public.weekly_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  emails_processed INT NOT NULL DEFAULT 0,
  emails_kept INT NOT NULL DEFAULT 0,
  emails_deleted INT NOT NULL DEFAULT 0,
  emails_unsubscribed INT NOT NULL DEFAULT 0,
  auto_actions_applied INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- Enable RLS
ALTER TABLE public.email_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_actions
CREATE POLICY "Users can view their own email actions"
ON public.email_actions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email actions"
ON public.email_actions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_preferences
CREATE POLICY "Users can view their own preferences"
ON public.user_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
ON public.user_preferences FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
ON public.user_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for weekly_summaries
CREATE POLICY "Users can view their own summaries"
ON public.weekly_summaries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own summaries"
ON public.weekly_summaries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own summaries"
ON public.weekly_summaries FOR UPDATE
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_email_actions_user_id ON public.email_actions(user_id);
CREATE INDEX idx_email_actions_created_at ON public.email_actions(created_at);
CREATE INDEX idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX idx_weekly_summaries_user_id_week ON public.weekly_summaries(user_id, week_start);