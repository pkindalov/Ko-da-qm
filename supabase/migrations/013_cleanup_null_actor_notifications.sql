-- Also remove notifications whose actor was deleted.
-- When a user is deleted, notifications where they were the actor have
-- actor_id set to NULL (FK SET NULL). The cron was not cleaning these up.
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
AS $$
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

  -- Remove notifications whose actor was deleted (actor_id set to NULL by FK SET NULL)
  DELETE FROM notifications WHERE actor_id IS NULL;
END;
$$;
