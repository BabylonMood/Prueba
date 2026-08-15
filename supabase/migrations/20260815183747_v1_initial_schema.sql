-- ============================================================================
-- V1: Esquema base · Sistema de pedidos para restaurantes
-- Conceptos según sistema_pedidos_restaurantes.md (§21, §22)
-- Acceso: catálogo público (anon read) + mutaciones vía API con service role.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tipos (máquina de estados básica)
-- ---------------------------------------------------------------------------
create type table_status      as enum ('libre', 'ocupada');
create type session_status    as enum ('activa', 'cerrada');
create type item_status       as enum ('pendiente', 'preparando', 'listo', 'entregado');
create type option_group_type as enum ('variante', 'extra');
create type staff_role        as enum ('admin', 'mozo', 'cocina', 'bar');

-- ---------------------------------------------------------------------------
-- restaurants
-- ---------------------------------------------------------------------------
create table restaurants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  settings    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- users + restaurant_users (staff)
-- ---------------------------------------------------------------------------
create table users (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null default '',
  created_at  timestamptz not null default now()
);

create table restaurant_users (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants (id) on delete cascade,
  user_id        uuid not null references users (id) on delete cascade,
  role           staff_role not null default 'mozo',
  created_at     timestamptz not null default now(),
  unique (restaurant_id, user_id)
);

-- ---------------------------------------------------------------------------
-- sectors -> tables
-- ---------------------------------------------------------------------------
create table sectors (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants (id) on delete cascade,
  name           text not null,
  sort_order     int  not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (restaurant_id, name)
);

create table tables (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants (id) on delete cascade,
  sector_id      uuid not null references sectors (id) on delete restrict,
  label          text not null,
  status         table_status not null default 'libre',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (restaurant_id, label)
);

-- ---------------------------------------------------------------------------
-- stations (cocina, bar, ...)
-- ---------------------------------------------------------------------------
create table stations (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants (id) on delete cascade,
  name           text not null,
  slug           text not null,
  sort_order     int  not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (restaurant_id, slug)
);

-- ---------------------------------------------------------------------------
-- categories -> products -> product options
-- ---------------------------------------------------------------------------
create table categories (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants (id) on delete cascade,
  name           text not null,
  sort_order     int  not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (restaurant_id, name)
);

create table products (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants (id) on delete cascade,
  category_id    uuid not null references categories (id) on delete restrict,
  station_id     uuid not null references stations (id) on delete restrict,
  name           text not null,
  description    text not null default '',
  price_cents    int  not null default 0 check (price_cents >= 0),
  image_url      text,
  active         boolean not null default true,
  sort_order     int  not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table product_option_groups (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references products (id) on delete cascade,
  name           text not null,
  group_type     option_group_type not null default 'variante',
  required       boolean not null default false,
  min_select     int  not null default 0,
  max_select     int,
  sort_order     int  not null default 0,
  created_at     timestamptz not null default now(),
  check (max_select is null or max_select >= min_select)
);

create table product_option_choices (
  id                uuid primary key default gen_random_uuid(),
  group_id          uuid not null references product_option_groups (id) on delete cascade,
  name              text not null,
  price_delta_cents int  not null default 0 check (price_delta_cents >= 0),
  sort_order        int  not null default 0,
  unique (group_id, name)
);

-- ---------------------------------------------------------------------------
-- qr_codes (identifican restaurante + mesa)
-- ---------------------------------------------------------------------------
create table qr_codes (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants (id) on delete cascade,
  table_id       uuid not null references tables (id) on delete cascade,
  code           text not null unique,
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  unique (restaurant_id, table_id)
);

-- ---------------------------------------------------------------------------
-- table_sessions + table_session_members
-- ---------------------------------------------------------------------------
create table table_sessions (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants (id) on delete cascade,
  table_id       uuid not null references tables (id) on delete restrict,
  status         session_status not null default 'activa',
  opened_at      timestamptz not null default now(),
  closed_at      timestamptz
);

create unique index one_active_session_per_table
  on table_sessions (table_id)
  where status = 'activa';

create table table_session_members (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references table_sessions (id) on delete cascade,
  name        text not null default 'Persona',
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- orders -> order_items -> order_item_options
-- ---------------------------------------------------------------------------
create table orders (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants (id) on delete cascade,
  session_id     uuid not null references table_sessions (id) on delete cascade,
  table_id       uuid not null references tables (id) on delete restrict,
  member_id      uuid references table_session_members (id) on delete set null,
  notes          text not null default '',
  created_at     timestamptz not null default now()
);

create table order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references orders (id) on delete cascade,
  product_id     uuid references products (id) on delete set null,
  station_id     uuid not null references stations (id) on delete restrict,
  name           text not null,
  price_cents    int  not null check (price_cents >= 0),
  quantity       int  not null check (quantity >= 1),
  notes          text not null default '',
  status         item_status not null default 'pendiente',
  created_at     timestamptz not null default now()
);

create table order_item_options (
  id                uuid primary key default gen_random_uuid(),
  order_item_id     uuid not null references order_items (id) on delete cascade,
  group_id          uuid references product_option_groups (id) on delete set null,
  choice_id         uuid references product_option_choices (id) on delete set null,
  name              text not null,
  price_delta_cents int  not null default 0 check (price_delta_cents >= 0)
);

-- ---------------------------------------------------------------------------
-- Índices de uso frecuente
-- ---------------------------------------------------------------------------
create index products_by_restaurant_category on products (restaurant_id, category_id);
create index products_by_restaurant_station on products (restaurant_id, station_id);
create index tables_by_restaurant_sector    on tables (restaurant_id, sector_id);
create index table_sessions_by_restaurant   on table_sessions (restaurant_id, status);
create index table_sessions_by_table        on table_sessions (table_id);
create index members_by_session             on table_session_members (session_id);
create index orders_by_session              on orders (session_id);
create index orders_by_restaurant_table     on orders (restaurant_id, table_id);
create index order_items_by_order           on order_items (order_id);
create index order_items_by_station         on order_items (station_id, status);
create index qr_codes_by_restaurant         on qr_codes (restaurant_id);
create index qr_codes_by_table              on qr_codes (table_id);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create function set_updated_at()
returns trigger language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_restaurants_updated_at before update on restaurants
  for each row execute function set_updated_at();
create trigger trg_sectors_updated_at before update on sectors
  for each row execute function set_updated_at();
create trigger trg_tables_updated_at before update on tables
  for each row execute function set_updated_at();
create trigger trg_stations_updated_at before update on stations
  for each row execute function set_updated_at();
create trigger trg_categories_updated_at before update on categories
  for each row execute function set_updated_at();
create trigger trg_products_updated_at before update on products
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS (catálogo público de lectura; toda mutación vía API con service role)
-- ---------------------------------------------------------------------------
alter table restaurants            enable row level security;
alter table users                  enable row level security;
alter table restaurant_users       enable row level security;
alter table sectors                enable row level security;
alter table tables                 enable row level security;
alter table stations               enable row level security;
alter table categories             enable row level security;
alter table products               enable row level security;
alter table product_option_groups  enable row level security;
alter table product_option_choices enable row level security;
alter table qr_codes               enable row level security;
alter table table_sessions         enable row level security;
alter table table_session_members  enable row level security;
alter table orders                 enable row level security;
alter table order_items            enable row level security;
alter table order_item_options     enable row level security;

create policy "Leer restaurantes" on restaurants
  for select to anon, authenticated using (true);
create policy "Leer sectores" on sectors
  for select to anon, authenticated using (true);
create policy "Leer mesas" on tables
  for select to anon, authenticated using (true);
create policy "Leer estaciones" on stations
  for select to anon, authenticated using (true);
create policy "Leer categorías" on categories
  for select to anon, authenticated using (true);
create policy "Leer productos" on products
  for select to anon, authenticated using (true);
create policy "Leer opciones de producto" on product_option_groups
  for select to anon, authenticated using (true);
create policy "Leer choices de opciones" on product_option_choices
  for select to anon, authenticated using (true);

-- El resto (users, restaurant_users, qr_codes, table_sessions, members,
-- orders, order_items, order_item_options) queda sin políticas: solo accesible
-- por service role desde la API de la app.