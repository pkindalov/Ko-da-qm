-- IMPORTANT: Enable pg_cron via Supabase Dashboard → Database → Extensions before running this migration.

-- ============================================================
-- 1. NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE notifications (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- References public.users so PostgREST can join actor name
  actor_id     UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  type         TEXT        NOT NULL,
  entity_id    UUID,
  entity_type  TEXT,
  is_read      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications: select own"
  ON notifications FOR SELECT
  USING (auth.uid() = recipient_id);

CREATE POLICY "notifications: update own"
  ON notifications FOR UPDATE
  USING (auth.uid() = recipient_id);

CREATE POLICY "notifications: delete own"
  ON notifications FOR DELETE
  USING (auth.uid() = recipient_id);

-- ============================================================
-- 2. DB TRIGGER — insert notification when a recipe is favorited
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_on_favorite()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip if the person favoriting is the recipe author (no self-notifications)
  INSERT INTO notifications (recipient_id, actor_id, type, entity_id, entity_type)
  SELECT
    r.user_id,
    NEW.user_id,
    'recipe_favorited',
    NEW.recipe_id,
    'recipe'
  FROM recipes r
  WHERE r.id = NEW.recipe_id
    AND r.user_id IS NOT NULL
    AND r.user_id != NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_favorite_insert
  AFTER INSERT ON favorites
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_favorite();

-- ============================================================
-- 3. CLEANUP FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  -- Delete read notifications older than 30 days
  DELETE FROM notifications
  WHERE is_read = TRUE
    AND created_at < now() - INTERVAL '30 days';

  -- Safety cap: keep max 50 unread per user, delete oldest beyond that
  DELETE FROM notifications
  WHERE id IN (
    SELECT id FROM (
      SELECT id,
             ROW_NUMBER() OVER (PARTITION BY recipient_id ORDER BY created_at DESC) AS row_num
      FROM notifications
      WHERE is_read = FALSE
    ) ranked
    WHERE row_num > 50
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. SCHEDULE DAILY CLEANUP via pg_cron — runs every day at 03:00 UTC
-- ============================================================
SELECT cron.schedule(
  'cleanup-old-notifications',
  '0 3 * * *',
  'SELECT public.cleanup_old_notifications();'
);
