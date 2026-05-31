-- Shared cache of machine translations so a recipe is translated once per
-- language (by the first viewer) and reused by everyone afterwards. Writes are
-- done only by the translate-recipe edge function (service role); the trigger
-- below clears the cache whenever the original recipe's content changes.

create table if not exists recipe_translations (
  recipe_id   text        not null,
  lang        text        not null,            -- target language: 'en' | 'bg'
  name        text        not null,
  ingredients text[]      not null default '{}',
  steps       text[]      not null default '{}',
  created_at  timestamptz not null default now(),
  primary key (recipe_id, lang)
);

alter table recipe_translations enable row level security;

-- A translation is readable only by someone who may see the underlying recipe
-- (its owner, or anyone if it is public). Inserts/updates come from the edge
-- function via the service role, which bypasses RLS, so no write policy is granted.
-- recipes.id is a uuid; recipe_id is text, so cast for the comparison.
drop policy if exists "recipe_translations: visible recipes only" on recipe_translations;
create policy "recipe_translations: visible recipes only"
  on recipe_translations for select
  using (
    exists (
      select 1 from recipes r
      where r.id::text = recipe_translations.recipe_id
        and (r.is_public or r.user_id = auth.uid())
    )
  );

-- Drop a recipe's cached translations when its translatable content changes or
-- the recipe is deleted, so viewers never see a translation that is out of date.
create or replace function invalidate_recipe_translations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from recipe_translations where recipe_id = old.id::text;
    return old;
  end if;

  if new.name is distinct from old.name
     or new.ingredients is distinct from old.ingredients
     or new.steps is distinct from old.steps then
    delete from recipe_translations where recipe_id = new.id::text;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_invalidate_recipe_translations on recipes;
create trigger trg_invalidate_recipe_translations
  after update or delete on recipes
  for each row execute function invalidate_recipe_translations();
