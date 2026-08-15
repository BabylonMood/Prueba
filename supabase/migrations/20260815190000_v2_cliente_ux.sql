-- ============================================================================
-- V2: features cliente (PR cliente) sobre la arquitectura V1 (Supabase).
--   · atribución de cada ítem de pedido a un participante de la mesa
--   · solicitudes de mesa (mozo, cubiertos, cuenta, etc.)
--   · carta reorganizada (Entradas → Platos principales → Postres → Bebidas)
--   · branding del demo (nombre + tagline)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Atribución por ítem
-- ----------------------------------------------------------------------------
alter table order_items
  add column member_id uuid references table_session_members (id) on delete set null;

create index order_items_by_member on order_items (member_id);

-- ----------------------------------------------------------------------------
-- Solicitudes de mesa
-- ----------------------------------------------------------------------------
create table table_requests (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants (id) on delete cascade,
  table_id       uuid not null references tables (id) on delete restrict,
  kind           text not null check (kind in ('mozo', 'cubiertos', 'servilletas', 'cuenta', 'sal', 'agua', 'otro')),
  status         text not null default 'pendiente' check (status in ('pendiente', 'atendido')),
  created_at     timestamptz not null default now(),
  attended_at    timestamptz
);

create index table_requests_by_table on table_requests (table_id, status);

alter table table_requests enable row level security;

-- ----------------------------------------------------------------------------
-- Carta reorganizada
-- ----------------------------------------------------------------------------
-- Entradas primero
update categories set sort_order = 0 where id = '44444444-4444-4444-8444-000000000003';

-- Hamburguesas + Pizzas pasan a ser "Platos principales"
update categories set name = 'Platos principales', sort_order = 1
  where id = '44444444-4444-4444-8444-000000000001';
update products set category_id = '44444444-4444-4444-8444-000000000001'
  where category_id = '44444444-4444-4444-8444-000000000002';
delete from categories where id = '44444444-4444-4444-8444-000000000002';

-- Postres
update categories set sort_order = 2 where id = '44444444-4444-4444-8444-000000000004';

-- Bebidas (absorbe Cafés y Jugos)
update categories set sort_order = 3 where id = '44444444-4444-4444-8444-000000000005';
update products set category_id = '44444444-4444-4444-8444-000000000005'
  where category_id in ('44444444-4444-4444-8444-000000000006', '44444444-4444-4444-8444-000000000007');
delete from categories where id in ('44444444-4444-4444-8444-000000000006', '44444444-4444-4444-8444-000000000007');

-- ----------------------------------------------------------------------------
-- Branding del demo
-- ----------------------------------------------------------------------------
update restaurants
  set name = 'Casa Fuego',
      settings = jsonb_set(
        coalesce(settings, '{}'::jsonb),
        '{tagline}',
        '"Comida de barrio, hecha al momento"'
      )
  where id = '11111111-1111-4111-8111-111111111111';
