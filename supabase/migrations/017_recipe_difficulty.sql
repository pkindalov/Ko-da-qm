-- Optional preparation difficulty for a recipe. Hybrid model: the app suggests a
-- value from the recipe's steps/ingredients/time, the author can override it, and
-- Gemini estimates its own for AI suggestions. Nullable so existing rows and curated
-- database recipes (which carry no difficulty) stay valid.
alter table recipes
  add column if not exists difficulty text
  check (difficulty in ('easy', 'medium', 'hard'));
