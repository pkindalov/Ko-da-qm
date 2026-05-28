-- Add disabled_at to support temporary account deactivation.
-- When set, the app signs the user out. Logging in again clears the column
-- (auto-reactivation) so no separate reactivation step is needed.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS disabled_at timestamptz;

-- Authenticated users call this to disable their own account.
CREATE OR REPLACE FUNCTION public.disable_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE public.users SET disabled_at = NOW() WHERE id = auth.uid();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.disable_user() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.disable_user() TO authenticated;
