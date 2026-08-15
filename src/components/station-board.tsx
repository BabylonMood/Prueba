"use client";

import type { Order, OrderItem, StationId } from "@/lib/types";
import { formatTime } from "@/lib/format";
import { usePolling } from "@/lib/use-polling";

const COLUMNS: { key: OrderItem["status"]; label: string; accent: string }[] = [
  { key: "pendiente", label: "Nuevos", accent: "border-red-300" },
  { key: "preparando", label: "En preparación", accent: "border-amber-300" },
  { key: "listo", label: "Listos", accent: "border-green-300" },
];

export function StationBoard({
  station,
  title,
}: {
  station: StationId;
  title: string;
}) {
  const { data } = usePolling<Order[]>(`/api/orders?station=${station}`, 5000);
  const orders = data ?? [];

  async function setStatus(itemId: string, status: OrderItem["status"]) {
    await fetch(`/api/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  const visibleOrders = orders.filter((o) =>
    o.items.some((i) => i.status !== "entregado")
  );

  const pendingCount = visibleOrders.reduce(
    (n, o) => n + o.items.filter((i) => i.status === "pendiente").length,
    0
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-zinc-500">Actualización automática</p>
        </div>
        <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
          {pendingCount} nuevos
        </span>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const entries = visibleOrders.flatMap((o) =>
            o.items
              .filter((i) => i.status === col.key)
              .map((i) => ({ item: i, order: o }))
          );
          return (
            <section key={col.key} className="flex flex-col gap-3">
              <h2
                className={`border-b-2 pb-1 text-sm font-semibold uppercase tracking-wide ${col.accent} ${
                  col.key === "pendiente"
                    ? "text-red-700"
                    : col.key === "preparando"
                      ? "text-amber-700"
                      : "text-green-700"
                }`}
              >
                {col.label} ({entries.length})
              </h2>
              {entries.length === 0 && (
                <p className="text-sm text-zinc-400">
                  Sin {col.label.toLowerCase()}
                </p>
              )}
              {entries.map(({ item, order }) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-zinc-200 p-3"
                >
                  <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
                    <span className="font-semibold text-zinc-800">
                      {order.tableLabel}
                    </span>
                    <span>{formatTime(order.createdAt)}</span>
                  </div>
                  <p className="text-sm">
                    {item.quantity} × {item.name}
                  </p>
                  {item.notes ? (
                    <p className="text-xs text-zinc-500">“{item.notes}”</p>
                  ) : null}
                  <p className="text-xs text-zinc-400">
                    {order.id} · {item.memberName}
                  </p>
                  {col.key === "pendiente" && (
                    <button
                      onClick={() => setStatus(item.id, "preparando")}
                      className="mt-2 w-full rounded-full bg-amber-500 py-2 text-sm font-medium text-white hover:bg-amber-600"
                    >
                      Comenzar
                    </button>
                  )}
                  {col.key === "preparando" && (
                    <button
                      onClick={() => setStatus(item.id, "listo")}
                      className="mt-2 w-full rounded-full bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700"
                    >
                      Marcar listo
                    </button>
                  )}
                </div>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}
