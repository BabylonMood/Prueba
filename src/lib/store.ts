import type {
  CreateOrderLine,
  ItemStatus,
  MenuData,
  Order,
  OrderItem,
  Product,
  StationId,
  Table,
} from "./types";
import { getServiceClient } from "./supabase/server";

const RESTAURANT_ID = "11111111-1111-4111-8111-111111111111";

interface ItemRow {
  id: string;
  product_id: string | null;
  name: string;
  price_cents: number;
  quantity: number;
  notes: string;
  status: ItemStatus;
  station: { slug: string } | null;
}

interface OrderRow {
  id: string;
  created_at: string;
  table_id: string;
  member_id: string | null;
  notes: string;
  table: { label: string } | null;
  member: { name: string } | null;
  items: ItemRow[] | null;
}

const ORDER_SELECT = `
  id, created_at, table_id, member_id, notes,
  table:tables(label),
  member:table_session_members(name),
  items:order_items(id, product_id, name, price_cents, quantity, notes, status, station:stations(slug))
`;

function shortOrderId(uuid: string): string {
  return `#${uuid.slice(0, 6).toUpperCase()}`;
}

function toProduct(row: {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  station: { slug: string } | null;
  category_id: string;
}): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    station: (row.station?.slug ?? "cocina") as StationId,
    categoryId: row.category_id,
  };
}

function toTable(row: {
  id: string;
  label: string;
  status: Table["status"];
  sector: { name: string } | null;
}): Table {
  return {
    id: row.id,
    label: row.label,
    sector: row.sector?.name ?? "",
    status: row.status as Table["status"],
  };
}

function toItem(row: ItemRow): OrderItem {
  return {
    id: row.id,
    productId: row.product_id ?? "",
    name: row.name,
    priceCents: row.price_cents,
    quantity: row.quantity,
    notes: row.notes || undefined,
    station: (row.station?.slug ?? "cocina") as StationId,
    status: row.status,
  };
}

function toOrder(row: OrderRow): Order {
  return {
    id: shortOrderId(row.id),
    tableId: row.table_id,
    tableLabel: row.table?.label ?? "",
    memberName: row.member?.name ?? "Anónimo",
    createdAt: new Date(row.created_at).getTime(),
    items: (row.items ?? []).map(toItem),
  };
}

export async function getMenu(): Promise<MenuData> {
  const db = getServiceClient();
  const [categoriesRes, productsRes] = await Promise.all([
    db.from("categories").select("*").order("sort_order"),
    db
      .from("products")
      .select("id, name, description, price_cents, category_id, station:stations(slug)")
      .eq("active", true)
      .order("sort_order"),
  ]);

  return {
    categories: (categoriesRes.data ?? []).map((c) => ({ id: c.id, name: c.name })),
    products: (productsRes.data ?? []).map(toProduct),
  };
}

export async function getTables(): Promise<Table[]> {
  const db = getServiceClient();
  const { data } = await db
    .from("tables")
    .select("id, label, status, sector:sectors(name)")
    .order("label");

  return (data ?? []).map(toTable);
}

export async function getTable(tableId: string): Promise<Table | undefined> {
  const db = getServiceClient();
  const { data } = await db
    .from("tables")
    .select("id, label, status, sector:sectors(name)")
    .eq("id", tableId)
    .maybeSingle();

  return data ? toTable(data) : undefined;
}

async function getActiveSession(
  tableId: string
): Promise<{ id: string } | undefined> {
  const db = getServiceClient();
  const { data } = await db
    .from("table_sessions")
    .select("id")
    .eq("table_id", tableId)
    .eq("status", "activa")
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? undefined;
}

async function openSession(tableId: string): Promise<{ id: string } | undefined> {
  const db = getServiceClient();
  const { data, error } = await db
    .from("table_sessions")
    .insert({ restaurant_id: RESTAURANT_ID, table_id: tableId })
    .select("id")
    .single();
  if (error) return undefined;
  await db.from("tables").update({ status: "ocupada" }).eq("id", tableId);
  return data;
}

export async function getAllOrders(): Promise<Order[]> {
  const db = getServiceClient();
  const { data } = await db
    .from("orders")
    .select(ORDER_SELECT)
    .order("created_at", { ascending: true });
  return (data ?? []).map(toOrder);
}

export async function getOrdersByTable(tableId: string): Promise<Order[]> {
  const db = getServiceClient();
  const { data } = await db
    .from("orders")
    .select(ORDER_SELECT)
    .eq("table_id", tableId)
    .order("created_at", { ascending: true });
  return (data ?? []).map(toOrder);
}

export async function getOrdersByStation(station: StationId): Promise<Order[]> {
  const orders = await getAllOrders();
  return orders
    .filter((o) => o.items.some((i) => i.station === station))
    .map((o) => ({ ...o, items: o.items.filter((i) => i.station === station) }));
}

export async function createOrder(input: {
  tableId: string;
  memberName: string;
  lines: CreateOrderLine[];
}): Promise<{ ok: boolean; order?: Order; error?: string }> {
  const table = await getTable(input.tableId);
  if (!table) return { ok: false, error: "Mesa no encontrada" };
  if (!Array.isArray(input.lines) || input.lines.length === 0) {
    return { ok: false, error: "El pedido está vacío" };
  }

  const db = getServiceClient();

  const productIds = input.lines.map((l) => l.productId);
  const { data: productRows } = await db
    .from("products")
    .select("id, name, price_cents, station_id")
    .in("id", productIds);
  const productsById = new Map((productRows ?? []).map((p) => [p.id, p]));

  const items: Array<{
    product_id: string;
    station_id: string;
    name: string;
    price_cents: number;
    quantity: number;
    notes: string;
  }> = [];
  for (const line of input.lines) {
    const product = productsById.get(line.productId);
    if (!product) {
      return { ok: false, error: `Producto no encontrado: ${line.productId}` };
    }
    const quantity = Number(line.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      return { ok: false, error: "Cantidad inválida" };
    }
    items.push({
      product_id: product.id,
      station_id: product.station_id,
      name: product.name,
      price_cents: product.price_cents,
      quantity,
      notes: typeof line.notes === "string" ? line.notes.trim() : "",
    });
  }

  const session = (await getActiveSession(input.tableId)) ?? (await openSession(input.tableId));
  if (!session) return { ok: false, error: "No se pudo abrir la sesión de la mesa" };

  let member: { id: string } | undefined;
  const memberName = input.memberName.trim();
  if (memberName) {
    const { data } = await db
      .from("table_session_members")
      .insert({ session_id: session.id, name: memberName })
      .select("id")
      .single();
    member = data ?? undefined;
  }

  const { data: orderRow, error } = await db
    .from("orders")
    .insert({
      restaurant_id: RESTAURANT_ID,
      session_id: session.id,
      table_id: input.tableId,
      member_id: member?.id ?? null,
    })
    .select("id")
    .single();
  if (error || !orderRow) return { ok: false, error: "No se pudo crear el pedido" };

  const { error: itemsError } = await db.from("order_items").insert(
    items.map((i) => ({ ...i, order_id: orderRow.id, status: "pendiente" }))
  );
  if (itemsError) return { ok: false, error: "No se pudieron guardar los ítems" };

  const { data: created } = await db
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", orderRow.id)
    .maybeSingle();

  return { ok: true, order: created ? toOrder(created) : undefined };
}

export async function updateItemStatus(
  itemId: string,
  status: ItemStatus
): Promise<{ ok: boolean; item?: OrderItem; error?: string }> {
  const valid: ItemStatus[] = ["pendiente", "preparando", "listo", "entregado"];
  if (!valid.includes(status)) {
    return { ok: false, error: "Estado inválido" };
  }

  const db = getServiceClient();
  const { error } = await db.from("order_items").update({ status }).eq("id", itemId);
  if (error) return { ok: false, error: "Ítem no encontrado" };

  const { data } = await db
    .from("order_items")
    .select("id, product_id, name, price_cents, quantity, notes, status, station:stations(slug)")
    .eq("id", itemId)
    .maybeSingle();
  return { ok: true, item: data ? toItem(data) : undefined };
}