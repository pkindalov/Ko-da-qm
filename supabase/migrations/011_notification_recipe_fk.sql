-- Add a typed FK column for recipe notifications so that deleting a recipe
-- automatically cascades to its notifications.
-- entity_id is kept as-is for future non-recipe entity types.

ALTER TABLE notifications
  ADD COLUMN recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE;

-- Backfill existing recipe notifications
UPDATE notifications
  SET recipe_id = entity_id
  WHERE entity_type = 'recipe' AND entity_id IS NOT NULL;

-- Update trigger to populate recipe_id alongside entity_id
CREATE OR REPLACE FUNCTION public.notify_on_favorite()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (recipient_id, actor_id, type, entity_id, entity_type, recipe_id)
  SELECT
    r.user_id,
    NEW.user_id,
    'recipe_favorited',
    NEW.recipe_id,
    'recipe',
    NEW.recipe_id
  FROM recipes r
  WHERE r.id = NEW.recipe_id
    AND r.user_id IS NOT NULL
    AND r.user_id != NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
