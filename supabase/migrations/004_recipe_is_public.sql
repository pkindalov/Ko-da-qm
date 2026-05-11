-- Add public-sharing columns to recipes
ALTER TABLE recipes
  ADD COLUMN is_public   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN author_name  TEXT,
  ADD COLUMN author_email TEXT;

-- Replace the single "for all" policy with separate ones so that
-- authenticated users can read any public recipe while only owners
-- can write their own rows.
DROP POLICY "recipes: own rows only" ON recipes;

CREATE POLICY "recipes: select own or public"
  ON recipes FOR SELECT
  USING (auth.uid() = user_id OR is_public = TRUE);

CREATE POLICY "recipes: insert own rows only"
  ON recipes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "recipes: update own rows only"
  ON recipes FOR UPDATE
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "recipes: delete own rows only"
  ON recipes FOR DELETE
  USING (auth.uid() = user_id);
