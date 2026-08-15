"use client";

import { useMemo, useState } from "react";
import type {
  CreateOrderLine,
  MenuData,
  Order,
  Product,
  RequestKind,
  TableMember,
  TableSession,
} from "@/lib/types";
import { SHARED_MEMBER_ID } from "@/lib/types";
import { formatPrice, formatTime } from "@/lib/format";
import { usePolling } from "@/lib/use-polling";
import { useI18n, LanguageSelect } from "@/lib/i18n";

interface CartLine extends CreateOrderLine {
  memberId: string;
}

const EXTRAS_KINDS: RequestKind[] = [
  "cubiertos",
  "servilletas",
  "cuenta",
  "sal",
  "agua",
  "otro",
];

const EXTRAS_ID = "__extras__";

export function MenuClient({
  tableId,
  tableLabel,
}: {
  tableId: string;
  tableLabel?: string;
}) {
  const { t } = useI18n();
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
  const [notice, setNotice] = useState<string | null>(null);
  const [showPay, setShowPay] = useState(false);
  const [joinName, setJoinName] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | string>("all");
  const [split, setSplit] = useState(1);

  const storageKey = `resto.member.${tableId}`;
  const [myMemberId, setMyMemberId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(storageKey);
  });

  const me: TableMember | null =
    session?.members.find((m) => m.id === myMemberId) ?? null;

  const categories = menu?.categories ?? [];
  const active = activeCategory || categories[0]?.id || "";
  const isExtras = activeCategory === EXTRAS_ID;
  const products = useMemo(
    () => (isExtras ? [] : menu?.products.filter((p) => p.categoryId === active) ?? []),
    [menu, active, isExtras]
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

  const divisor = Math.max(split, 1);
  const allDelivered =
    orders.length > 0 &&
    orders.every((o) => o.items.every((i) => i.status === "entregado"));

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

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2600);
  }

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

  function changeSplit(value: string) {
    const n = Number.parseInt(value, 10);
    setSplit(value === "" || Number.isNaN(n) ? 0 : Math.max(1, Math.min(n, 30)));
  }

  function changeSplitBy(delta: number) {
    setSplit((prev) => Math.max(1, Math.min(prev + delta, 30)));
  }

  async function joinTable(e: React.FormEvent) {
    e.preventDefault();
    setJoinError(null);
    if (!joinName.trim()) {
      setJoinError(t("tuNombre"));
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
        setJoinError(data.error ?? t("sinConexion"));
        return;
      }
      setMyMemberId(data.member.id);
      window.localStorage.setItem(storageKey, data.member.id);
      setJoinName("");
      refreshSession();
    } catch {
      setJoinError(t("sinConexion"));
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

  async function requestKind(kind: RequestKind) {
    try {
      await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId, kind }),
      });
      flash(
        kind === "mozo" ? t("mozoAvisado") : t("solicitudEnviada")
      );
    } catch {
      flash(t("sinConexion"));
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
        setError(data.error ?? t("sinConexion"));
        return;
      }
      setCart([]);
      setReviewing(false);
      setShowCart(false);
      refreshOrders();
      flash(t("comandaEnviada"));
    } catch {
      setError(t("sinConexion"));
    } finally {
      setSubmitting(false);
    }
  }

  function openConfirm() {
    setReviewing(true);
    setShowCart(true);
  }

  function downloadTicket() {
    const items = orders.flatMap((o) => o.items);
    const rows = items
      .map((i) => {
        const who =
          i.memberName && i.memberName !== "Compartido"
            ? ` <span style="color:#888;font-size:11px">(${i.memberName})</span>`
            : "";
        return `<tr><td style="padding:3px 0">${i.quantity} × ${i.name}${who}</td><td align="right" style="padding:3px 0">${formatPrice(i.priceCents * i.quantity)}</td></tr>`;
      })
      .join("");
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${menu?.name ?? ""} · ${t("ticketPdf")}</title><style>
      body{font-family:Arial,Helvetica,sans-serif;width:300px;margin:24px auto;color:#111;font-size:13px}
      h1{font-size:18px;margin:0 0 2px} .muted{color:#666;font-size:11px}
      table{width:100%;border-collapse:collapse;margin:12px 0}
      .tot td{padding-top:6px;font-size:14px;font-weight:bold;border-top:1px dashed #999}
    </style></head><body>
      <h1>${menu?.name ?? ""}</h1>
      <div class="muted">${t("mesa")} ${tableId.replace("t", "")}</div>
      <div class="muted">${new Date().toLocaleString("es-AR")}</div>
      <table><tbody>${rows}
      <tr class="tot"><td>${t("total")}</td><td align="right">${formatPrice(tableTotal)}</td></tr>
      <tr class="tot"><td>${t("porPersona")} (${t("divididoEn")} ${divisor})</td><td align="right">${formatPrice(Math.round(tableTotal / divisor))}</td></tr>
      </tbody></table>
    </body></html>`;
    const w = window.open("", "_blank", "width=380,height=640");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pb-32 pt-6">
      <header className="flex items-start justify-between gap-4 border-b border-[#e2e8f0] pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#0f5132]">
            {t("mesa")} {tableLabel?.replace("t", "") ?? tableId.replace("t", "")}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#0f172a]">
            {menu?.name ?? "Nuestra carta"}
          </h1>
          <p className="mt-0.5 text-sm text-[#64748b]">{menu?.tagline}</p>
        </div>
        <LanguageSelect />
      </header>

      <p className="rounded-xl bg-[#f1f5f9] px-4 py-3 text-sm leading-relaxed text-[#475569]">
        {t("intro")}
      </p>

      <section className="flex flex-wrap items-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-3 py-2.5">
        <span className="text-sm font-semibold text-[#0f172a]">
          {t("nombres")}
        </span>
        <span className="text-xs text-[#64748b]">{t("opcional")}</span>
        {session?.members.map((m) => (
          <span
            key={m.id}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm ${
              me?.id === m.id
                ? "bg-[#0f172a] text-white"
                : "bg-[#f1f5f9] text-[#334155]"
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
              placeholder={t("tuNombre")}
              className="w-36 rounded-md border border-[#e2e8f0] px-3 py-1 text-sm outline-none focus:border-[#0f5132]"
            />
            <button
              type="submit"
              className="rounded-md bg-[#0f172a] px-3 py-1 text-sm text-white"
            >
              {t("sumarme")}
            </button>
            {joinError && (
              <span className="text-xs text-red-600">{joinError}</span>
            )}
          </form>
        )}
      </section>

      {notice && (
        <div className="rounded-xl bg-[#ecfdf3] px-4 py-2.5 text-sm text-[#166534]">
          {notice}
        </div>
      )}

      <div>
        <h2 className="mb-3 text-xl font-bold text-[#0f172a]">
          {t("nuestraCarta")}
        </h2>
        <nav className="flex gap-1.5 overflow-x-auto pb-1">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`shrink-0 rounded-md px-4 py-1.5 text-sm font-medium ${
                active === c.id
                  ? "bg-[#0f5132] text-white"
                  : "border border-[#e2e8f0] text-[#334155] hover:border-[#0f5132] hover:text-[#0f5132]"
              }`}
            >
              {c.i18nKey ? t(`cat.${c.i18nKey}`) : c.name}
            </button>
          ))}
          <span className="mx-1 shrink-0 border-l border-[#e2e8f0]" />
          <button
            onClick={() => setActiveCategory(EXTRAS_ID)}
            className={`shrink-0 rounded-md px-4 py-1.5 text-sm font-medium ${
              isExtras
                ? "bg-[#0f5132] text-white"
                : "border border-[#e2e8f0] text-[#334155] hover:border-[#0f5132] hover:text-[#0f5132]"
            }`}
          >
            {t("extras")}
          </button>
          <button
            onClick={() => requestKind("mozo")}
            className="shrink-0 rounded-md border border-[#0f5132] px-4 py-1.5 text-sm font-semibold text-[#0f5132] hover:bg-[#f1f5f9]"
          >
            {t("llamarMozo")}
          </button>
        </nav>
      </div>

      {isExtras ? (
        <section className="grid gap-3 sm:grid-cols-2">
          {EXTRAS_KINDS.map((k) => (
            <button
              key={k}
              onClick={() => requestKind(k)}
              className="flex items-center justify-between gap-2 rounded-xl border border-[#e2e8f0] bg-white p-4 text-left hover:border-[#0f5132]"
            >
              <span className="font-semibold text-[#0f172a]">
                {t(`kind.${k}`)}
              </span>
              <span className="rounded-md border border-[#e2e8f0] px-3 py-1 text-xs font-medium text-[#0f5132]">
                {t("pedir")}
              </span>
            </button>
          ))}
        </section>
      ) : (
        <section className="grid gap-3 sm:grid-cols-2">
          {products.map((p) => (
            <div
              key={p.id}
              className="flex flex-col gap-2 rounded-xl border border-[#e2e8f0] bg-white p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-[#0f172a]">{p.name}</h3>
                <span className="shrink-0 font-semibold text-[#0f5132]">
                  {formatPrice(p.priceCents)}
                </span>
              </div>
              <p className="text-sm text-[#64748b]">{p.description}</p>
              <button
                onClick={() => addToCart(p)}
                className="mt-auto self-start rounded-md border border-[#e2e8f0] px-4 py-1.5 text-sm font-medium text-[#0f172a] hover:border-[#0f5132] hover:text-[#0f5132]"
              >
                {t("agregar")}
              </button>
            </div>
          ))}
        </section>
      )}

      {orders.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-[#0f172a]">
              {t("pedidosMesa")}
            </h2>
            <div className="flex gap-1">
              <button
                onClick={() => setFilter("all")}
                className={`rounded-md px-3 py-1 text-sm ${
                  activeFilter === "all"
                    ? "bg-[#0f172a] text-white"
                    : "border border-[#e2e8f0] text-[#334155]"
                }`}
              >
                {t("todos")}
              </button>
              {showMemberChips &&
                attributedMembers.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setFilter(m.id)}
                    className={`rounded-md px-3 py-1 text-sm ${
                      activeFilter === m.id
                        ? "bg-[#0f172a] text-white"
                        : "border border-[#e2e8f0] text-[#334155]"
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              {hasShared && (
                <button
                  onClick={() => setFilter(SHARED_MEMBER_ID)}
                  className={`rounded-md px-3 py-1 text-sm ${
                    activeFilter === SHARED_MEMBER_ID
                      ? "bg-[#0f172a] text-white"
                      : "border border-[#e2e8f0] text-[#334155]"
                  }`}
                >
                  {t("compartido")}
                </button>
              )}
            </div>
          </div>
          {visibleOrders.length === 0 ? (
            <p className="text-sm text-[#64748b]">
              {t("noPedidosFiltro")}
            </p>
          ) : (
            visibleOrders.map((o) => (
              <div
                key={o.id}
                className="rounded-xl border border-[#e2e8f0] bg-white p-4"
              >
                <div className="mb-2 flex items-center justify-between text-sm text-[#64748b]">
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
                        <span className="text-[#64748b]">
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
                                : "bg-[#f1f5f9] text-[#64748b]"
                        }`}
                      >
                        {t(i.status)}
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
        <section className="flex flex-col gap-3 rounded-xl border border-[#e2e8f0] bg-white p-4">
          <h2 className="text-lg font-bold text-[#0f172a]">{t("cuenta")}</h2>

          <div className="flex items-center justify-between text-sm">
            <span className="text-[#64748b]">{t("total")}</span>
            <span className="font-semibold">{formatPrice(tableTotal)}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-[#64748b]">{t("dividirEn")}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => changeSplitBy(-1)}
                className="h-7 w-7 rounded-md border border-[#e2e8f0] text-[#0f172a]"
                aria-label="Menos"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                max={30}
                inputMode="numeric"
                value={split === 0 ? "" : split}
                onChange={(e) => changeSplit(e.target.value)}
                onBlur={() => setSplit((s) => (s >= 1 ? s : 1))}
                className="w-16 rounded-md border border-[#e2e8f0] px-2 py-1 text-center text-sm font-semibold outline-none focus:border-[#0f5132]"
              />
              <button
                onClick={() => changeSplitBy(1)}
                className="h-7 w-7 rounded-md border border-[#e2e8f0] text-[#0f172a]"
                aria-label="Más"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[#f1f5f9] pt-3 text-sm">
            <span className="text-[#64748b]">
              {t("porPersona")}
              {divisor > 1 ? ` · ${t("divididoEn")} ${divisor}` : ""}
            </span>
            <span className="font-semibold">
              {formatPrice(Math.round(tableTotal / divisor))}
            </span>
          </div>
        </section>
      )}

      {(cartCount > 0 || allDelivered) && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e2e8f0] bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
            {cartCount > 0 ? (
              <>
                <button
                  onClick={openConfirm}
                  className="flex flex-1 items-center gap-3 rounded-lg bg-[#0f172a] px-4 py-3 text-sm font-semibold text-white"
                >
                  <span>{t("verPedido")} ({cartCount})</span>
                  <span className="ml-auto">{formatPrice(cartTotal)}</span>
                  <span className="rounded-md bg-[#0f5132] px-3 py-1.5">
                    {t("confirmarPedido")}
                  </span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowPay(true)}
                className="flex flex-1 items-center gap-3 rounded-lg bg-[#0f5132] px-4 py-3 text-sm font-semibold text-white"
              >
                <span>{t("pagar")}</span>
                <span className="ml-auto">{formatPrice(tableTotal)}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {showCart && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="flex max-h-[85vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0f172a]">
                {reviewing ? t("confirmarPedido") : t("tuPedido")}
              </h2>
              <button
                onClick={() => setShowCart(false)}
                className="text-[#64748b]"
                aria-label={t("cerrar")}
              >
                ✕
              </button>
            </div>

            {cart.length === 0 ? (
              <p className="text-sm text-[#64748b]">{t("carritoVacio")}</p>
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
                        ? t("compartido")
                        : session?.members.find((m) => m.id === l.memberId)
                              ?.name ?? t("compartido");
                    return (
                      <li
                        key={l.productId}
                        className="flex items-start justify-between gap-2 text-sm"
                      >
                        <span>
                          {l.quantity} × {product.name}
                          <span className="text-[#64748b]">
                            {" "}
                            · {memberName}
                            {l.notes ? ` — ${l.notes}` : ""}
                          </span>
                        </span>
                        <span className="text-[#64748b]">
                          {formatPrice(product.priceCents * l.quantity)}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-auto flex flex-col gap-2 border-t border-[#f1f5f9] pt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#64748b]">{t("total")}</span>
                    <span className="font-semibold">{formatPrice(cartTotal)}</span>
                  </div>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setReviewing(false)}
                      className="w-1/3 rounded-lg border border-[#e2e8f0] py-3 text-sm font-medium text-[#334155]"
                    >
                      {t("volver")}
                    </button>
                    <button
                      onClick={submitOrder}
                      disabled={submitting}
                      className="w-2/3 rounded-lg bg-[#0f5132] py-3 text-sm font-medium text-white disabled:opacity-40"
                    >
                      {submitting ? t("enviando") : t("confirmarEnviar")}
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
                          <span className="font-medium text-[#0f172a]">
                            {product.name}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-[#64748b]">
                              {formatPrice(product.priceCents * l.quantity)}
                            </span>
                            <button
                              onClick={() => removeLine(l.productId)}
                              aria-label={`${t("quitar")} ${product.name}`}
                              className="text-sm text-red-500 hover:underline"
                            >
                              {t("quitar")}
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => changeQuantity(l.productId, -1)}
                            className="h-7 w-7 rounded-md border border-[#e2e8f0] text-[#0f172a]"
                            aria-label="Restar"
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-sm">
                            {l.quantity}
                          </span>
                          <button
                            onClick={() => changeQuantity(l.productId, 1)}
                            className="h-7 w-7 rounded-md border border-[#e2e8f0] text-[#0f172a]"
                            aria-label="Sumar"
                          >
                            +
                          </button>
                        </div>
                        <input
                          value={l.notes ?? ""}
                          onChange={(e) =>
                            changeNotes(l.productId, e.target.value)
                          }
                          placeholder={t("nota")}
                          className="w-full rounded-md border border-[#e2e8f0] px-2 py-1 text-sm outline-none focus:border-[#0f5132]"
                        />
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-auto flex flex-col gap-2 border-t border-[#f1f5f9] pt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#64748b]">{t("total")}</span>
                    <span className="font-semibold">{formatPrice(cartTotal)}</span>
                  </div>
                  <button
                    onClick={() => setReviewing(true)}
                    disabled={cart.length === 0}
                    className="w-full rounded-lg bg-[#0f5132] py-3 text-sm font-medium text-white disabled:opacity-40"
                  >
                    {t("confirmarPedido")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showPay && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="flex w-full max-w-md flex-col gap-4 rounded-t-2xl bg-white p-5 sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0f172a]">
                {t("tuCuenta")}
              </h2>
              <button
                onClick={() => setShowPay(false)}
                className="text-[#64748b]"
                aria-label={t("cerrar")}
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-[#64748b]">{t("total")}</span>
              <span className="font-semibold">{formatPrice(tableTotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#64748b]">
                {t("porPersona")}
                {divisor > 1 ? ` · ${t("divididoEn")} ${divisor}` : ""}
              </span>
              <span className="font-semibold">
                {formatPrice(Math.round(tableTotal / divisor))}
              </span>
            </div>

            <div className="flex flex-col gap-2 border-t border-[#f1f5f9] pt-3">
              <button
                onClick={() => requestKind("mozo")}
                className="rounded-lg border border-[#0f5132] py-3 text-sm font-medium text-[#0f5132]"
              >
                {t("llamarMozo")}
              </button>
              <button
                onClick={downloadTicket}
                className="rounded-lg bg-[#0f5132] py-3 text-sm font-medium text-white"
              >
                {t("ticketPdf")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
