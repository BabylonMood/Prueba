"use client";

import { useMemo, useState } from "react";
import type {
  CreateOrderLine,
  MenuData,
  Order,
  Product,
  TableMember,
  TableSession,
} from "@/lib/types";
import { ITEM_STATUS_LABELS, SHARED_MEMBER_ID } from "@/lib/types";
import { formatPrice, formatTime } from "@/lib/format";
import { usePolling } from "@/lib/use-polling";

interface CartLine extends CreateOrderLine {
  memberId: string;
}

export function MenuClient({ tableId }: { tableId: string }) {
  const { data: menu } = usePolling<MenuData>("/api/menu");
  const { data: session, refresh: refreshSession } = usePolling<
    TableSession | null
  >(`/api/sessions?tableId=${tableId}`, 5000);
  const { data: ordersData, refresh: refreshOrders } = usePolling<Order[]>(
    `/api/orders?tableId=${tableId}`,
    3000
  );
  const orders = useMemo(() => ordersData ?? [], [ordersData]);

  const [activeCategory, setActiveCategory] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinName, setJoinName] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | string>("all");
  const [splitCount, setSplitCount] = useState(1);

  const storageKey = `resto.member.${tableId}`;
  const countKey = `resto.people.${tableId}`;
  const [myMemberId, setMyMemberId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(storageKey);
  });
  const [declaredCount, setDeclaredCount] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(countKey);
    const n = raw ? Number.parseInt(raw, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  });

  const me: TableMember | null =
    session?.members.find((m) => m.id === myMemberId) ?? null;

  const memberCount = session?.members.length ?? 0;
  const peopleCount = Math.max(memberCount, declaredCount ?? 0, 1);
  const split = Math.min(splitCount, peopleCount);

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

  const tableTotal = useMemo(
    () =>
      orders.reduce(
        (sum, o) =>
          sum + o.items.reduce((s, i) => s + i.priceCents * i.quantity, 0),
        0
      ),
    [orders]
  );

  const hasShared = orders.some((o) =>
    o.items.some((i) => i.memberId === SHARED_MEMBER_ID)
  );
  const visibleOrders =
    filter === "all"
      ? orders
      : orders.filter((o) => o.items.some((i) => i.memberId === filter));

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          quantity: 1,
          memberId: me?.id ?? SHARED_MEMBER_ID,
        },
      ];
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

  function changeMember(productId: string, memberId: string) {
    setCart((prev) =>
      prev.map((l) => (l.productId === productId ? { ...l, memberId } : l))
    );
  }

  function changePeopleCount(delta: number) {
    const minPeople = Math.max(memberCount, 1);
    const next = Math.max(minPeople, Math.min(peopleCount + delta, 30));
    setDeclaredCount(next);
    window.localStorage.setItem(countKey, String(next));
  }

  async function joinTable(e: React.FormEvent) {
    e.preventDefault();
    setJoinError(null);
    if (!joinName.trim()) {
      setJoinError("Ingresá tu nombre");
      return;
    }
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId, name: joinName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setJoinError(data.error ?? "No se pudo unir");
        return;
      }
      setMyMemberId(data.member.id);
      window.localStorage.setItem(storageKey, data.member.id);
      setJoinName("");
      refreshSession();
    } catch {
      setJoinError("Error de conexión");
    }
  }

  async function deleteMember(member: TableMember) {
    const res = await fetch(
      `/api/sessions/members/${member.id}?tableId=${tableId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      refreshSession();
      if (me?.id === member.id) {
        setMyMemberId(null);
        window.localStorage.removeItem(storageKey);
      }
    }
  }

  function leaveTable() {
    setMyMemberId(null);
    window.localStorage.removeItem(storageKey);
  }

  async function submitOrder() {
    if (cart.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId, lines: cart }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo enviar el pedido");
        return;
      }
      setCart([]);
      setShowCart(false);
      refreshOrders();
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
            Mesa {tableId.replace("t", "")} · Pedí y seguí tu pedido en vivo
          </p>
        </div>
        <button
          onClick={() => setShowCart(true)}
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Carrito{cartCount > 0 ? ` (${cartCount})` : ""}
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 p-3">
        <span className="text-sm font-medium">Participantes:</span>
        {session?.members.map((m) => (
          <span
            key={m.id}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm ${
              me?.id === m.id
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-700"
            }`}
          >
            {m.name}
            <button
              onClick={() => deleteMember(m)}
              aria-label={`Borrar ${m.name}`}
              className="opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </span>
        ))}
        {me ? (
          <span className="flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
            Sos {me.name}
            <button onClick={leaveTable} aria-label="Salir">
              ✕
            </button>
          </span>
        ) : (
          <form onSubmit={joinTable} className="flex items-center gap-2">
            <input
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              placeholder="Tu nombre"
              className="w-32 rounded-full border border-zinc-300 px-3 py-1 text-sm"
            />
            <button
              type="submit"
              className="rounded-full bg-zinc-900 px-3 py-1 text-sm text-white"
            >
              Unirme
            </button>
            {joinError && (
              <span className="text-xs text-red-600">{joinError}</span>
            )}
          </form>
        )}
      </div>

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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Pedidos de la mesa</h2>
            <div className="flex gap-1">
              <button
                onClick={() => setFilter("all")}
                className={`rounded-full px-3 py-1 text-sm ${
                  filter === "all"
                    ? "bg-zinc-900 text-white"
                    : "border border-zinc-300 text-zinc-700"
                }`}
              >
                Todos
              </button>
              {me && (
                <button
                  onClick={() => setFilter(me.id)}
                  className={`rounded-full px-3 py-1 text-sm ${
                    filter === me.id
                      ? "bg-zinc-900 text-white"
                      : "border border-zinc-300 text-zinc-700"
                  }`}
                >
                  {me.name}
                </button>
              )}
              {hasShared && (
                <button
                  onClick={() => setFilter(SHARED_MEMBER_ID)}
                  className={`rounded-full px-3 py-1 text-sm ${
                    filter === SHARED_MEMBER_ID
                      ? "bg-zinc-900 text-white"
                      : "border border-zinc-300 text-zinc-700"
                  }`}
                >
                  Compartido
                </button>
              )}
            </div>
          </div>
          {visibleOrders.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No hay pedidos para este filtro.
            </p>
          ) : (
            visibleOrders.map((o) => (
              <div key={o.id} className="rounded-xl border border-zinc-200 p-4">
                <div className="mb-2 flex items-center justify-between text-sm text-zinc-500">
                  <span>{o.id} · {formatTime(o.createdAt)}</span>
                </div>
                <ul className="flex flex-col gap-1">
                  {o.items.map((i) => (
                    <li
                      key={i.id}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span>
                        {i.quantity} × {i.name}
                        <span className="text-zinc-500">
                          {" "}
                          · {i.memberName}
                          {i.notes ? ` — ${i.notes}` : ""}
                        </span>
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
            ))
          )}
        </section>
      )}

      {orders.length > 0 && (
        <section className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Cuenta</h2>
            <span className="text-sm text-zinc-500">
              {orders.length} pedido(s)
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">Personas en la mesa</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => changePeopleCount(-1)}
                className="h-7 w-7 rounded-full border border-zinc-300"
                aria-label="Menos personas"
              >
                −
              </button>
              <span className="w-6 text-center text-sm font-semibold">
                {peopleCount}
              </span>
              <button
                onClick={() => changePeopleCount(1)}
                className="h-7 w-7 rounded-full border border-zinc-300"
                aria-label="Más personas"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm text-zinc-500">Dividir en</span>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: peopleCount }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setSplitCount(n)}
                  className={`rounded-full px-3 py-1 text-sm ${
                    split === n
                      ? "bg-zinc-900 text-white"
                      : "border border-zinc-300 text-zinc-700"
                  }`}
                >
                  {n === 1 ? "1 (paga 1)" : `${n} personas`}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2 flex flex-col gap-1 border-t border-zinc-100 pt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-500">Total de la mesa</span>
              <span className="font-semibold">{formatPrice(tableTotal)}</span>
            </div>
            {split > 1 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">
                  Por persona (dividido en {split})
                </span>
                <span className="font-semibold">
                  {formatPrice(Math.round(tableTotal / split))}
                </span>
              </div>
            )}
            <p className="text-xs text-zinc-400">
              El pago final se procesa en el POS del local.
            </p>
          </div>
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
                        <select
                          value={l.memberId}
                          onChange={(e) =>
                            changeMember(l.productId, e.target.value)
                          }
                          className="ml-auto rounded-lg border border-zinc-300 px-2 py-1 text-sm"
                          disabled={!me}
                        >
                          {me && <option value={me.id}>Yo ({me.name})</option>}
                          <option value={SHARED_MEMBER_ID}>Compartido</option>
                        </select>
                      </div>
                      <input
                        value={l.notes ?? ""}
                        onChange={(e) =>
                          changeNotes(l.productId, e.target.value)
                        }
                        placeholder="Nota (ej: sin cebolla)"
                        className="w-full rounded-lg border border-zinc-300 px-2 py-1 text-sm"
                      />
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-auto flex flex-col gap-2">
              {!me && (
                <p className="text-xs text-zinc-500">
                  Unite como participante arriba para que tus productos se
                  acrediten a tu nombre (sino quedan como
                  &quot;Compartido&quot;).
                </p>
              )}
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
