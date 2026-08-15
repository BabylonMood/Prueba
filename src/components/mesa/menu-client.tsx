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
  const [reviewing, setReviewing] = useState(false);
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

  const attributedMemberIds = useMemo(() => {
    const ids = new Set<string>();
    for (const o of orders) {
      for (const i of o.items) {
        if (i.memberId !== SHARED_MEMBER_ID) ids.add(i.memberId);
      }
    }
    return ids;
  }, [orders]);
  const attributedMembers = (session?.members ?? []).filter((m) =>
    attributedMemberIds.has(m.id)
  );
  const showMemberChips = attributedMembers.length > 1;
  const hasShared = orders.some((o) =>
    o.items.some((i) => i.memberId === SHARED_MEMBER_ID)
  );
  const activeFilter =
    filter === "all" ||
    (showMemberChips && attributedMembers.some((m) => m.id === filter)) ||
    (hasShared && filter === SHARED_MEMBER_ID)
      ? filter
      : "all";
  const visibleOrders =
    activeFilter === "all"
      ? orders
      : orders.filter((o) => o.items.some((i) => i.memberId === activeFilter));

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

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
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
      setReviewing(false);
      setShowCart(false);
      refreshOrders();
    } catch {
      setError("Error de conexión");
    } finally {
      setSubmitting(false);
    }
  }

  function openCart() {
    setReviewing(false);
    setShowCart(true);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pb-28 pt-8">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#c2562e]">
          Mesa {tableId.replace("t", "")}
        </p>
        <h1 className="mt-1 text-4xl font-black tracking-tight text-[#292016]">
          {menu?.name ?? "Nuestra carta"}
        </h1>
        <p className="mt-1 text-sm text-[#8a7a68]">{menu?.tagline}</p>
      </header>

      <section className="rounded-2xl bg-[#f7e7dc] px-4 py-3 text-sm leading-relaxed text-[#7a4b33]">
        Armá el pedido desde acá: elegí lo que quieran y envialo. Cada uno puede
        sumar su nombre para que su pedido quede a su cuenta — o uno solo pide
        por todos.
      </section>

      <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#eadfce] bg-white p-3">
        <span className="text-sm font-semibold text-[#292016]">Nombres</span>
        <span className="text-xs font-medium text-[#c2562e]">(Opcional)</span>
        {session?.members.map((m) => (
          <span
            key={m.id}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm ${
              me?.id === m.id
                ? "bg-[#292016] text-white"
                : "bg-[#f7e7dc] text-[#7a4b33]"
            }`}
          >
            {m.name}
            {me?.id === m.id ? " (vos)" : ""}
            <button
              onClick={() => deleteMember(m)}
              aria-label={`Borrar ${m.name}`}
              className="opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </span>
        ))}
        {!me && (
          <form onSubmit={joinTable} className="ml-auto flex items-center gap-2">
            <input
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              placeholder="Tu nombre"
              className="w-36 rounded-full border border-[#eadfce] px-3 py-1 text-sm outline-none focus:border-[#c2562e]"
            />
            <button
              type="submit"
              className="rounded-full bg-[#292016] px-3 py-1 text-sm text-white"
            >
              Sumarme
            </button>
            {joinError && (
              <span className="text-xs text-red-600">{joinError}</span>
            )}
          </form>
        )}
      </section>

      <div>
        <h2 className="mb-3 text-2xl font-bold text-[#292016]">Nuestra carta</h2>
        <nav className="flex gap-1.5 overflow-x-auto rounded-full border border-[#eadfce] bg-white p-1.5">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ${
                active === c.id
                  ? "bg-[#c2562e] text-white"
                  : "text-[#7a4b33] hover:bg-[#f7e7dc]"
              }`}
            >
              {c.name}
            </button>
          ))}
        </nav>
      </div>

      <section className="grid gap-2.5 sm:grid-cols-2">
        {products.map((p) => (
          <div
            key={p.id}
            className="flex flex-col gap-2 rounded-2xl border border-[#eadfce] bg-white p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-[#292016]">{p.name}</h3>
              <span className="shrink-0 font-semibold text-[#c2562e]">
                {formatPrice(p.priceCents)}
              </span>
            </div>
            <p className="text-sm text-[#8a7a68]">{p.description}</p>
            <button
              onClick={() => addToCart(p)}
              className="mt-auto self-start rounded-full border border-[#eadfce] px-4 py-1.5 text-sm font-medium text-[#292016] hover:border-[#c2562e] hover:text-[#c2562e]"
            >
              Agregar
            </button>
          </div>
        ))}
      </section>

      {orders.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-[#292016]">Pedidos de la mesa</h2>
            <div className="flex gap-1">
              <button
                onClick={() => setFilter("all")}
                className={`rounded-full px-3 py-1 text-sm ${
                  activeFilter === "all"
                    ? "bg-[#292016] text-white"
                    : "border border-[#eadfce] text-[#7a4b33]"
                }`}
              >
                Todos
              </button>
              {showMemberChips &&
                attributedMembers.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setFilter(m.id)}
                    className={`rounded-full px-3 py-1 text-sm ${
                      activeFilter === m.id
                        ? "bg-[#292016] text-white"
                        : "border border-[#eadfce] text-[#7a4b33]"
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              {hasShared && (
                <button
                  onClick={() => setFilter(SHARED_MEMBER_ID)}
                  className={`rounded-full px-3 py-1 text-sm ${
                    activeFilter === SHARED_MEMBER_ID
                      ? "bg-[#292016] text-white"
                      : "border border-[#eadfce] text-[#7a4b33]"
                  }`}
                >
                  Compartido
                </button>
              )}
            </div>
          </div>
          {visibleOrders.length === 0 ? (
            <p className="text-sm text-[#8a7a68]">
              No hay pedidos para este filtro.
            </p>
          ) : (
            visibleOrders.map((o) => (
              <div
                key={o.id}
                className="rounded-2xl border border-[#eadfce] bg-white p-4"
              >
                <div className="mb-2 flex items-center justify-between text-sm text-[#8a7a68]">
                  <span>
                    {o.id} · {formatTime(o.createdAt)}
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
                        <span className="text-[#8a7a68]">
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
                                : "bg-[#f7e7dc] text-[#8a7a68]"
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
        <section className="flex flex-col gap-3 rounded-2xl border border-[#eadfce] bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#292016]">Cuenta</h2>
            <span className="text-sm text-[#8a7a68]">
              {orders.length} pedido(s)
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-[#8a7a68]">Personas en la mesa</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => changePeopleCount(-1)}
                className="h-7 w-7 rounded-full border border-[#eadfce] text-[#292016]"
                aria-label="Menos personas"
              >
                −
              </button>
              <span className="w-6 text-center text-sm font-semibold">
                {peopleCount}
              </span>
              <button
                onClick={() => changePeopleCount(1)}
                className="h-7 w-7 rounded-full border border-[#eadfce] text-[#292016]"
                aria-label="Más personas"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm text-[#8a7a68]">Dividir en</span>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: peopleCount }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setSplitCount(n)}
                  className={`rounded-full px-3 py-1 text-sm ${
                    split === n
                      ? "bg-[#292016] text-white"
                      : "border border-[#eadfce] text-[#7a4b33]"
                  }`}
                >
                  {n === 1 ? "1 (paga 1)" : `${n} personas`}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2 flex flex-col gap-1 border-t border-[#f7e7dc] pt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#8a7a68]">Total de la mesa</span>
              <span className="font-semibold">{formatPrice(tableTotal)}</span>
            </div>
            {split > 1 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#8a7a68]">
                  Por persona (dividido en {split})
                </span>
                <span className="font-semibold">
                  {formatPrice(Math.round(tableTotal / split))}
                </span>
              </div>
            )}
            <p className="text-xs text-[#b09a86]">
              El pago final se procesa en el POS del local.
            </p>
          </div>
        </section>
      )}

      {cartCount > 0 && (
        <button
          onClick={openCart}
          className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full bg-[#292016] px-5 py-3 text-sm font-semibold text-white shadow-lg"
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-[#c2562e] text-xs font-bold">
            {cartCount}
          </span>
          Ver pedido
          <span className="text-[#f0c9b0]">{formatPrice(cartTotal)}</span>
        </button>
      )}

      {showCart && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="flex max-h-[85vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#292016]">
                {reviewing ? "Confirmar pedido" : "Tu pedido"}
              </h2>
              <button
                onClick={() => setShowCart(false)}
                className="text-[#8a7a68]"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {cart.length === 0 ? (
              <p className="text-sm text-[#8a7a68]">El carrito está vacío.</p>
            ) : reviewing ? (
              <>
                <ul className="flex flex-col gap-2">
                  {cart.map((l) => {
                    const product = menu?.products.find(
                      (p) => p.id === l.productId
                    );
                    if (!product) return null;
                    const memberName =
                      l.memberId === SHARED_MEMBER_ID
                        ? "Compartido"
                        : session?.members.find((m) => m.id === l.memberId)
                              ?.name ?? "Compartido";
                    return (
                      <li
                        key={l.productId}
                        className="flex items-start justify-between gap-2 text-sm"
                      >
                        <span>
                          {l.quantity} × {product.name}
                          <span className="text-[#8a7a68]">
                            {" "}
                            · {memberName}
                            {l.notes ? ` — ${l.notes}` : ""}
                          </span>
                        </span>
                        <span className="text-[#8a7a68]">
                          {formatPrice(product.priceCents * l.quantity)}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-auto flex flex-col gap-2 border-t border-[#f7e7dc] pt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#8a7a68]">Personas en la mesa</span>
                    <span className="font-semibold">{peopleCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#8a7a68]">Total</span>
                    <span className="font-semibold">{formatPrice(cartTotal)}</span>
                  </div>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setReviewing(false)}
                      className="w-1/3 rounded-full border border-[#eadfce] py-3 text-sm font-medium text-[#7a4b33]"
                    >
                      ← Volver
                    </button>
                    <button
                      onClick={submitOrder}
                      disabled={submitting}
                      className="w-2/3 rounded-full bg-[#c2562e] py-3 text-sm font-medium text-white disabled:opacity-40"
                    >
                      {submitting ? "Enviando…" : "Confirmar y enviar"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <ul className="flex flex-col gap-4">
                  {cart.map((l) => {
                    const product = menu?.products.find(
                      (p) => p.id === l.productId
                    );
                    if (!product) return null;
                    return (
                      <li key={l.productId} className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-[#292016]">
                            {product.name}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-[#8a7a68]">
                              {formatPrice(product.priceCents * l.quantity)}
                            </span>
                            <button
                              onClick={() => removeLine(l.productId)}
                              aria-label={`Quitar ${product.name}`}
                              className="text-sm text-red-500 hover:underline"
                            >
                              Quitar
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => changeQuantity(l.productId, -1)}
                            className="h-7 w-7 rounded-full border border-[#eadfce] text-[#292016]"
                            aria-label="Restar"
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-sm">
                            {l.quantity}
                          </span>
                          <button
                            onClick={() => changeQuantity(l.productId, 1)}
                            className="h-7 w-7 rounded-full border border-[#eadfce] text-[#292016]"
                            aria-label="Sumar"
                          >
                            +
                          </button>
                          <select
                            value={l.memberId}
                            onChange={(e) =>
                              changeMember(l.productId, e.target.value)
                            }
                            className="ml-auto rounded-lg border border-[#eadfce] px-2 py-1 text-sm"
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
                          className="w-full rounded-lg border border-[#eadfce] px-2 py-1 text-sm outline-none focus:border-[#c2562e]"
                        />
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-auto flex flex-col gap-2 border-t border-[#f7e7dc] pt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#8a7a68]">Total</span>
                    <span className="font-semibold">{formatPrice(cartTotal)}</span>
                  </div>
                  <button
                    onClick={() => setReviewing(true)}
                    disabled={cart.length === 0}
                    className="w-full rounded-full bg-[#c2562e] py-3 text-sm font-medium text-white disabled:opacity-40"
                  >
                    Revisar pedido
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
