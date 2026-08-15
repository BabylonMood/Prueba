# Resto · Pedidos de mesa

V1 del punto 25: **QR → carta → pedido → cocina/bar → mozo**.

Sistema de pedidos y atención para restaurantes. El cliente escanea un QR
(simulado por ahora desde la página de inicio), ve la carta, arma su pedido y
lo envía. El sistema lo reparte automáticamente entre **cocina** y **bar**
según la estación de cada producto, y el **mozo** ve qué mesas tienen productos
listos para entregar.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
- Tailwind CSS 4
- **Supabase (Postgres)** como base de datos real, con RLS y migraciones
  versionadas en `supabase/migrations/`. La capa de datos vive en
  `src/lib/store.ts` y habla con la base mediante el **service role** desde las
  rutas de API; el catálogo (categorías, productos, mesas) es de lectura
  pública vía RLS.

## Requisitos

- Una cuenta/proyecto Supabase con las migraciones aplicadas
  (`supabase/migrations/`).
- Variables en `.env.local`:

  ```bash
  NEXT_PUBLIC_SUPABASE_URL=...
  NEXT_PUBLIC_SUPABASE_ANON_KEY=...
  SUPABASE_SERVICE_ROLE_KEY=...   # solo se usa en el servidor
  ```

## Cómo correr

```bash
npm install
npm run dev
```

Abrir http://localhost:3000

## Flujo para probar (2 navegadores o 2 pestañas)

1. `/` → entrá a una mesa (simula el QR).
2. En la mesa: elegí productos y enviá el pedido (poné tu nombre opcional).
3. Abrí `/cocina` y `/bar`: cada estación ve solo sus ítems, los comienza y los
   marca listos.
4. Abrí `/mozo`: la mesa queda ocupada y los productos listos aparecen con el
   botón **Entregado**.

La actualización en vivo es por **polling** (2.5–3s). El siguiente paso es
reemplazarlo por Supabase Realtime.

## Rutas

| Ruta            | Para quién | Qué hace                                   |
| --------------- | ---------- | ------------------------------------------ |
| `/`             | —          | Hub + entrada a mesas (simula el QR)       |
| `/mesa/[id]`    | Cliente    | Carta, carrito, pedido y estado en vivo    |
| `/cocina`       | Cocina     | Nuevos → en preparación → listos           |
| `/bar`          | Bar        | Ídem cocina, solo bebidas/cafés/jugos      |
| `/mozo`         | Mozo       | Mesas ocupadas, productos listos, entregas |

## API

| Método | Ruta                    | Descripción                              |
| ------ | ----------------------- | ---------------------------------------- |
| GET    | `/api/menu`             | Categorías + productos                   |
| GET    | `/api/tables`           | Mesas con estado                         |
| POST   | `/api/orders`           | Crea pedido (`tableId`, `memberName`, `lines`) |
| GET    | `/api/orders`           | Todos los pedidos (filtros `?station=` o `?tableId=`) |
| PATCH  | `/api/items/[itemId]`   | Cambia estado del ítem (`status`)        |

## Estados de ítem

`pendiente → preparando → listo → entregado`

## Base de datos (Supabase)

- Esquema y datos semilla: `supabase/migrations/` (16 tablas, RLS habilitado).
- El catálogo (restaurants, sectors, tables, stations, categories, products y
  opciones) es de **lectura pública** (`anon`/`authenticated`).
- Pedidos, ítems, sesiones y miembros quedan **sin políticas RLS**: solo
  accesibles con service role desde las rutas de API de la app.
- Tipos de cliente en `src/lib/supabase/`: `env.ts` (variables),
  `server.ts` (service role, para rutas server) y `client.ts` (anon, reservado
  para cuando hagamos Realtime desde el navegador).

## Estructura

```
supabase/
└── migrations/            # schema + seed + fixes (versionados)
src/
├── app/                   # rutas y API
│   ├── api/menu|tables|orders|items
│   ├── mesa/[tableId]     # vista cliente
│   ├── cocina | bar       # estaciones
│   └── mozo               # salón
├── components/
│   ├── mesa/menu-client   # carta + carrito (cliente)
│   ├── station-board      # panel cocina/bar
│   └── mozo-dashboard     # panel mozo
└── lib/
    ├── types.ts           # modelo de dominio
    ├── store.ts           # capa de datos (Supabase + mapeo snake→camel)
    ├── supabase/          # clientes y tipos generados
    ├── format.ts
    └── use-polling.ts     # hook de polling
```

## Pendiente (próximo paso)

- Realtime (Supabase Realtime) en vez de polling.
- Máquina de estados formal (mesa, sesión, pedido, ítem, solicitud, turno).
- Autenticación para las mutaciones de pedidos (hoy son libres vía API).
- Solicitudes de mesa (cubiertos, cuenta, llamar mozo) — V2.