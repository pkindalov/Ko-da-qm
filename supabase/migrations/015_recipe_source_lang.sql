-- Records the language a recipe was authored in, so translation features work in
-- both directions (en→bg and bg→en) without guessing from the name's script.
alter table recipes
  add column if not exists source_lang text;

-- Backfill existing rows from the script of the name (Cyrillic ⇒ Bulgarian).
update recipes
  set source_lang = case when name ~ '[Ѐ-ӿ]' then 'bg' else 'en' end
  where source_lang is null;
