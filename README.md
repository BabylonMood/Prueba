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
- Datos en memoria con semilla (`src/lib/data.ts`) — **se resetean al reiniciar**
  el server. El paso siguiente es pasar a una base real (Postgres/SQLite).

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

La actualización en vivo es por **polling** (2.5–3s). El paso siguiente es
reemplazarlo por real-time (SSE o WebSocket) para la V1 real.

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

## Estructura

```
src/
├── app/                    # rutas y API
│   ├── api/menu|tables|orders|items
│   ├── mesa/[tableId]      # vista cliente
│   ├── cocina | bar        # estaciones
│   └── mozo                # salón
├── components/
│   ├── mesa/menu-client    # carta + carrito (cliente)
│   ├── station-board       # panel cocina/bar
│   └── mozo-dashboard      # panel mozo
└── lib/
    ├── types.ts            # modelo de dominio
    ├── data.ts             # semilla (menú y mesas)
    ├── store.ts            # capa de datos (en memoria)
    ├── format.ts
    └── use-polling.ts      # hook de polling
```

## Pendiente (próximo paso)

- Base de datos real y sesión de mesa persistente.
- Máquina de estados formal (mesa, sesión, pedido, ítem, solicitud, turno).
- Real-time (SSE/WebSocket) en vez de polling.
- Solicitudes de mesa (cubiertos, cuenta, llamar mozo) — V2.
