-- Add image_urls array column for user-curated recipe galleries (up to 5 URLs).
-- image_url is kept for backward compatibility with AI/MealDB recipes.
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}';
