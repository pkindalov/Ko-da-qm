alter table recipes
  add column if not exists name_translated       text,
  add column if not exists ingredients_translated text[] not null default '{}',
  add column if not exists steps_translated       text[] not null default '{}';
