-- Allow authenticated users to permanently delete their own account.
-- SECURITY DEFINER lets the function run with the privileges of its owner
-- (postgres), which has permission to delete rows from auth.users.
-- All user data in public.* is cleaned up via existing ON DELETE CASCADE
-- foreign keys (fridge_items, recipes, products, favorites, follows,
-- notifications).

CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- Only signed-in users may call this function.
REVOKE EXECUTE ON FUNCTION public.delete_user() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.delete_user() TO authenticated;
