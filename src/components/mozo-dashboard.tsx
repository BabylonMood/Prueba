"use client";

import type { Order, Table } from "@/lib/types";
import { ITEM_STATUS_LABELS } from "@/lib/types";
import { formatTime } from "@/lib/format";
import { usePolling } from "@/lib/use-polling";

export function MozoDashboard() {
  const { data: tablesData } = usePolling<Table[]>("/api/tables", 3000);
  const tables = tablesData ?? [];
  const { data: ordersData } = usePolling<Order[]>("/api/orders", 3000);
  const orders = ordersData ?? [];

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
        </div>
      </header>

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
                  {ready.length > 0 && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                      {ready.length} listos
                    </span>
                  )}
                </div>

                {ready.length > 0 && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-2">
                    <p className="mb-1 text-xs font-semibold text-green-700">
                      Para entregar
                    </p>
                    {ready.map(({ item, orderLabel }) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 py-1 text-sm"
                      >
                        <span>
                          {item.quantity} × {item.name}
                          <span className="text-xs text-zinc-500">
                            {" "}
                            · {item.memberName} · {orderLabel}
                          </span>
                        </span>
                        <button
                          onClick={() => deliver(item.id)}
                          className="rounded-full bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
                        >
                          Entregado
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {pending.length > 0 && (
                  <ul className="flex flex-col gap-1 text-sm">
                    {pending.map((i) => (
                      <li
                        key={i.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <span>
                          {i.quantity} × {i.name}
                          <span className="text-xs text-zinc-500">
                            {" "}
                            · {i.memberName}
                          </span>
                        </span>
                        <span className="text-xs text-zinc-500">
                          {ITEM_STATUS_LABELS[i.status]}
                        </span>
                      </li>
                    ))}
                  </ul>
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
