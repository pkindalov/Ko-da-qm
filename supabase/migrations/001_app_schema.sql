-- ============================================================
-- Ko-da-qm: App Schema
-- ============================================================

-- Profiles (one row per auth user)
create table if not exists profiles (
  id           uuid primary key references auth.users on delete cascade,
  name         text        not null default '',
  allergies    text[]      not null default '{}',
  dislikes     text[]      not null default '{}',
  dietary_prefs text[]     not null default '{}',
  updated_at   timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles: own row only"
  on profiles for all
  using  (auth.uid() = id)
  with check (auth.uid() = id);

-- Fridge items
create table if not exists fridge_items (
  id         text        not null,
  user_id    uuid        not null references auth.users on delete cascade,
  name       text        not null,
  emoji      text        not null default '',
  category   text        not null,
  created_at timestamptz not null default now(),
  primary key (id, user_id)
);

alter table fridge_items enable row level security;

create policy "fridge_items: own rows only"
  on fridge_items for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Recipes
create table if not exists recipes (
  id                   text        not null,
  user_id              uuid        not null references auth.users on delete cascade,
  name                 text        not null,
  name_en              text,
  emoji                text        not null default '',
  ingredients          text[]      not null default '{}',
  steps                text[]      not null default '{}',
  time                 integer     not null default 0,
  tags                 text[]      not null default '{}',
  required_ingredients text[]      not null default '{}',
  is_ai                boolean     not null default false,
  created_at           timestamptz not null default now(),
  primary key (id, user_id)
);

alter table recipes enable row level security;

create policy "recipes: own rows only"
  on recipes for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Products
create table if not exists products (
  id         text        not null,
  user_id    uuid        not null references auth.users on delete cascade,
  name       text        not null,
  name_en    text,
  category   text        not null,
  status     text        not null,
  emoji      text        not null default '',
  created_at timestamptz not null default now(),
  primary key (id, user_id)
);

alter table products enable row level security;

create policy "products: own rows only"
  on products for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
