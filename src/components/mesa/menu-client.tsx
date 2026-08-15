"use client";

import { useMemo, useState } from "react";
import type { CreateOrderLine, MenuData, Order, Product } from "@/lib/types";
import { ITEM_STATUS_LABELS } from "@/lib/types";
import { formatPrice, formatTime } from "@/lib/format";
import { usePolling } from "@/lib/use-polling";

type CartLine = CreateOrderLine;

export function MenuClient({
  tableId,
  tableLabel,
}: {
  tableId: string;
  tableLabel?: string;
}) {
  const menu = usePolling<MenuData>("/api/menu");
  const orders = usePolling<Order[]>(`/api/orders?tableId=${tableId}`, 3000) ?? [];

  const [activeCategory, setActiveCategory] = useState("");
  const [memberName, setMemberName] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = menu?.categories ?? [];
  const active = activeCategory || categories[0]?.id || "";
  const products = useMemo(
    () => menu?.products.filter((p) => p.categoryId === active) ?? [],
    [menu, active]
  );

  const cartTotal = useMemo(
    () =>
      cart.reduce((total, line) => {
        const product = menu?.products.find((p) => p.id === line.productId);
        return total + (product?.priceCents ?? 0) * line.quantity;
      }, 0),
    [cart, menu]
  );

  const cartCount = cart.reduce((n, l) => n + l.quantity, 0);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [...prev, { productId: product.id, quantity: 1 }];
    });
  }

  function changeQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) =>
          l.productId === productId ? { ...l, quantity: l.quantity + delta } : l
        )
        .filter((l) => l.quantity > 0)
    );
  }

  function changeNotes(productId: string, notes: string) {
    setCart((prev) =>
      prev.map((l) => (l.productId === productId ? { ...l, notes } : l))
    );
  }

  async function submitOrder() {
    if (cart.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId, memberName, lines: cart }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo enviar el pedido");
        return;
      }
      setCart([]);
      setShowCart(false);
      setMemberName("");
    } catch {
      setError("Error de conexión");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Nuestra carta</h1>
          <p className="text-sm text-zinc-500">
            {tableLabel ?? `Mesa ${tableId}`} · Pedí y seguí tu pedido en vivo
          </p>
        </div>
        <button
          onClick={() => setShowCart(true)}
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Carrito{cartCount > 0 ? ` (${cartCount})` : ""}
        </button>
      </header>

      <nav className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm ${
              active === c.id
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-300 text-zinc-700"
            }`}
          >
            {c.name}
          </button>
        ))}
      </nav>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <div
            key={p.id}
            className="flex flex-col gap-2 rounded-xl border border-zinc-200 p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold">{p.name}</h3>
              <span className="shrink-0 text-sm text-zinc-500">
                {formatPrice(p.priceCents)}
              </span>
            </div>
            <p className="text-sm text-zinc-500">{p.description}</p>
            <button
              onClick={() => addToCart(p)}
              className="mt-auto self-start rounded-full border border-zinc-300 px-4 py-1.5 text-sm hover:border-zinc-900"
            >
              Agregar
            </button>
          </div>
        ))}
      </section>

      {orders.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Mis pedidos</h2>
          {orders.map((o) => (
            <div key={o.id} className="rounded-xl border border-zinc-200 p-4">
              <div className="mb-2 flex items-center justify-between text-sm text-zinc-500">
                <span>
                  {o.id} · {o.memberName} · {formatTime(o.createdAt)}
                </span>
              </div>
              <ul className="flex flex-col gap-1">
                {o.items.map((i) => (
                  <li
                    key={i.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span>
                      {i.quantity} × {i.name}
                      {i.notes ? (
                        <span className="text-zinc-500"> — {i.notes}</span>
                      ) : null}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        i.status === "entregado"
                          ? "bg-green-100 text-green-700"
                          : i.status === "listo"
                            ? "bg-emerald-100 text-emerald-700"
                            : i.status === "preparando"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {ITEM_STATUS_LABELS[i.status]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {showCart && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="flex max-h-[85vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Tu pedido</h2>
              <button
                onClick={() => setShowCart(false)}
                className="text-zinc-500"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {cart.length === 0 ? (
              <p className="text-sm text-zinc-500">El carrito está vacío.</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {cart.map((l) => {
                  const product = menu?.products.find(
                    (p) => p.id === l.productId
                  );
                  if (!product) return null;
                  return (
                    <li key={l.productId} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{product.name}</span>
                        <span className="text-sm text-zinc-500">
                          {formatPrice(product.priceCents * l.quantity)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => changeQuantity(l.productId, -1)}
                          className="h-7 w-7 rounded-full border border-zinc-300"
                          aria-label="Restar"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm">
                          {l.quantity}
                        </span>
                        <button
                          onClick={() => changeQuantity(l.productId, 1)}
                          className="h-7 w-7 rounded-full border border-zinc-300"
                          aria-label="Sumar"
                        >
                          +
                        </button>
                        <input
                          value={l.notes ?? ""}
                          onChange={(e) =>
                            changeNotes(l.productId, e.target.value)
                          }
                          placeholder="Nota (ej: sin cebolla)"
                          className="ml-auto w-44 rounded-lg border border-zinc-300 px-2 py-1 text-sm"
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-auto flex flex-col gap-2">
              <label className="text-sm font-medium">
                ¿Quién pide?
                <input
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="Tu nombre (opcional)"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">Total</span>
                <span className="font-semibold">{formatPrice(cartTotal)}</span>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                onClick={submitOrder}
                disabled={cart.length === 0 || submitting}
                className="w-full rounded-full bg-zinc-900 py-3 text-sm font-medium text-white disabled:opacity-40"
              >
                {submitting ? "Enviando…" : "Enviar pedido"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
