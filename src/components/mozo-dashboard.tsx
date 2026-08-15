"use client";

import type { Order, OrderItem, Table, TableRequest } from "@/lib/types";
import { ITEM_STATUS_LABELS } from "@/lib/types";
import { formatTime } from "@/lib/format";
import { usePolling } from "@/lib/use-polling";

interface DashboardData {
  tables: Table[];
  orders: Order[];
  requests: TableRequest[];
}

const REQUEST_LABELS: Record<string, string> = {
  mozo: "Llamar al mozo",
  cubiertos: "Cubiertos",
  servilletas: "Servilletas",
  cuenta: "La cuenta",
  sal: "Sal",
  agua: "Agua",
  otro: "Otro",
};

function StationBadge({ station }: { station: OrderItem["station"] }) {
  return station === "bar" ? (
    <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700">
      Bar
    </span>
  ) : (
    <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
      Cocina
    </span>
  );
}

export function MozoDashboard() {
  const { data, refresh } = usePolling<DashboardData>("/api/dashboard", 6000);
  const tables = data?.tables ?? [];
  const orders = data?.orders ?? [];
  const requests = data?.requests ?? [];
  const pendingRequests = requests.filter((r) => r.status === "pendiente");

  const ordersByTable = new Map<string, Order[]>();
  for (const order of orders) {
    const list = ordersByTable.get(order.tableId) ?? [];
    list.push(order);
    ordersByTable.set(order.tableId, list);
  }

  async function deliver(itemId: string) {
    await fetch(`/api/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "entregado" }),
    });
  }

  async function attend(requestId: string) {
    await fetch(`/api/requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "atendido" }),
    });
    refresh();
  }

  async function closeTable(tableId: string) {
    await fetch("/api/sessions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "close", tableId }),
    });
    refresh();
  }

  const occupied = tables.filter((t) => t.status === "ocupada");
  const free = tables.filter((t) => t.status === "libre");
  const readyTotal = orders.reduce(
    (n, o) => n + o.items.filter((i) => i.status === "listo").length,
    0
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mozos · Salón</h1>
          <p className="text-sm text-zinc-500">Mesas, pedidos y entregas</p>
        </div>
        <div className="flex gap-2 text-sm">
          <span className="rounded-full bg-zinc-100 px-3 py-1 font-medium text-zinc-700">
            {occupied.length} ocupadas
          </span>
          <span className="rounded-full bg-green-100 px-3 py-1 font-medium text-green-700">
            {readyTotal} listas para entregar
          </span>
          {pendingRequests.length > 0 && (
            <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-700">
              {pendingRequests.length} solicitudes
            </span>
          )}
        </div>
      </header>

      {pendingRequests.length > 0 && (
        <section className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="font-semibold text-amber-800">
            Solicitudes pendientes
          </h2>
          <ul className="flex flex-col gap-2">
            {pendingRequests.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"
              >
                <span>
                  <span className="font-semibold">{r.tableLabel}</span>
                  {" · "}
                  {REQUEST_LABELS[r.kind]}
                  <span className="text-xs text-zinc-500">
                    {" · "}
                    {formatTime(r.createdAt)}
                  </span>
                </span>
                <button
                  onClick={() => attend(r.id)}
                  className="rounded-full bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700"
                >
                  Atender
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {occupied.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No hay mesas ocupadas todavía. Entrá a una mesa desde el inicio para
          simular un pedido.
        </p>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {occupied.map((t) => {
            const tableOrders = ordersByTable.get(t.id) ?? [];
            const ready = tableOrders.flatMap((o) =>
              o.items
                .filter((i) => i.status === "listo")
                .map((i) => ({ item: i, orderLabel: o.id }))
            );
            const pending = tableOrders.flatMap((o) =>
              o.items.filter(
                (i) => i.status !== "listo" && i.status !== "entregado"
              )
            );
            return (
              <div
                key={t.id}
                className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold">{t.label}</h3>
                    <p className="text-xs text-zinc-500">{t.sector}</p>
                  </div>
                  <button
                    onClick={() => closeTable(t.id)}
                    className="rounded-full border border-red-300 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Cerrar mesa
                  </button>
                </div>

                {ready.length > 0 && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-2">
                    <p className="mb-1 text-xs font-semibold text-green-700">
                      Listas para entregar
                    </p>
                    {ready.map(({ item, orderLabel }) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 py-1 text-sm"
                      >
                        <span className="flex flex-wrap items-center gap-1.5">
                          <StationBadge station={item.station} />
                          <span>
                            {item.quantity} × {item.name}
                            <span className="text-xs text-zinc-500">
                              {" "}
                              · {item.memberName} · {orderLabel}
                            </span>
                          </span>
                        </span>
                        <button
                          onClick={() => deliver(item.id)}
                          className="shrink-0 rounded-full bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
                        >
                          Listo
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {pending.length > 0 && (
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2">
                    <p className="mb-1 text-xs font-semibold text-zinc-600">
                      En preparación
                    </p>
                    <ul className="flex flex-col gap-1 text-sm">
                      {pending.map((i) => (
                        <li
                          key={i.id}
                          className="flex items-center justify-between gap-2"
                        >
                          <span className="flex flex-wrap items-center gap-1.5">
                            <StationBadge station={i.station} />
                            <span>
                              {i.quantity} × {i.name}
                              <span className="text-xs text-zinc-500">
                                {" "}
                                · {i.memberName}
                              </span>
                            </span>
                          </span>
                          <span className="shrink-0 text-xs text-zinc-500">
                            {ITEM_STATUS_LABELS[i.status]}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {tableOrders.length > 0 && (
                  <p className="mt-auto text-xs text-zinc-400">
                    Último pedido{" "}
                    {formatTime(
                      tableOrders[tableOrders.length - 1].createdAt
                    )}
                  </p>
                )}
              </div>
            );
          })}
        </section>
      )}

      {free.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Libres
          </h2>
          <div className="flex flex-wrap gap-2">
            {free.map((t) => (
              <span
                key={t.id}
                className="rounded-full border border-zinc-200 px-3 py-1 text-sm text-zinc-400"
              >
                {t.label}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
