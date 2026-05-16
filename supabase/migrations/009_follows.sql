-- ============================================================
-- 1. FOLLOWS TABLE
-- ============================================================
CREATE TABLE follows (
  follower_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read follows (needed for public follower counts on profiles)
CREATE POLICY "follows: select"
  ON follows FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can only follow as themselves
CREATE POLICY "follows: insert own"
  ON follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- Users can only unfollow their own follows
CREATE POLICY "follows: delete own"
  ON follows FOR DELETE
  USING (auth.uid() = follower_id);

-- ============================================================
-- 2. DB TRIGGER — insert notification when a user is followed
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (recipient_id, actor_id, type)
  VALUES (NEW.following_id, NEW.follower_id, 'user_followed');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_follow_insert
  AFTER INSERT ON follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();
