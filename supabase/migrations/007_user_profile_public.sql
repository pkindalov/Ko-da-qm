-- Allow any authenticated user to read another user's name (public profile display)
CREATE POLICY "users: public read by authenticated"
  ON users FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RPC returning only favorite counts per recipe — does not expose which user favorited what
CREATE FUNCTION public.get_recipe_favorite_counts(recipe_ids text[])
RETURNS TABLE(recipe_id text, count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT recipe_id::text, count(*)
  FROM favorites
  WHERE recipe_id::text = ANY(recipe_ids)
  GROUP BY recipe_id
$$;
