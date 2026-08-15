import { dataCategories, dataProducts, dataTables, RESTAURANT_NAME, RESTAURANT_TAGLINE } from "./data";
import type {
  CreateOrderLine,
  ItemStatus,
  MenuData,
  Order,
  OrderItem,
  Product,
  RequestKind,
  StationId,
  Table,
  TableMember,
  TableRequest,
  TableSession,
} from "./types";
import { SHARED_MEMBER_ID } from "./types";

const categories = dataCategories;
const products: Product[] = dataProducts;
const tables: Table[] = dataTables;
const orders: Order[] = [];
const sessions: TableSession[] = [];
const requests: TableRequest[] = [];

let orderCounter = 0;
let itemCounter = 0;
let sessionCounter = 0;
let memberCounter = 0;
let requestCounter = 0;

const nextOrderId = (): string => `#${++orderCounter}`;
const nextItemId = (): string => `item_${++itemCounter}`;
const nextSessionId = (): string => `s${++sessionCounter}`;
const nextMemberId = (): string => `m${++memberCounter}`;
const nextRequestId = (): string => `r${++requestCounter}`;

export function getMenu(): MenuData {
  return { name: RESTAURANT_NAME, tagline: RESTAURANT_TAGLINE, categories, products };
}

export function getTables(): Table[] {
  return tables;
}

export function getTable(tableId: string): Table | undefined {
  return tables.find((t) => t.id === tableId);
}

export function getAllOrders(): Order[] {
  return orders;
}

export function getOrdersByTable(tableId: string): Order[] {
  return orders.filter((o) => o.tableId === tableId);
}

export function getOrdersByStation(station: StationId): Order[] {
  return orders
    .filter((o) => o.items.some((i) => i.station === station))
    .map((o) => ({
      ...o,
      items: o.items.filter((i) => i.station === station),
    }));
}

export function getSessionByTable(tableId: string): TableSession | undefined {
  return sessions.find((s) => s.tableId === tableId);
}

export function getOrCreateSession(tableId: string): TableSession {
  const existing = getSessionByTable(tableId);
  if (existing) return existing;
  const session: TableSession = {
    id: nextSessionId(),
    tableId,
    status: "activa",
    createdAt: Date.now(),
    members: [],
  };
  sessions.push(session);
  return session;
}

export function joinSession(
  tableId: string,
  name: string
): {
  ok: boolean;
  session?: TableSession;
  member?: TableMember;
  error?: string;
} {
  const session = getOrCreateSession(tableId);
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Ingresá tu nombre" };

  const existing = session.members.find(
    (m) => m.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (existing) return { ok: true, session, member: existing };

  const member: TableMember = { id: nextMemberId(), name: trimmed };
  session.members.push(member);
  return { ok: true, session, member };
}

export function removeMember(
  tableId: string,
  memberId: string
): { ok: boolean; error?: string } {
  const session = getSessionByTable(tableId);
  if (!session) return { ok: false, error: "Sesión no encontrada" };
  const index = session.members.findIndex((m) => m.id === memberId);
  if (index === -1) return { ok: false, error: "Participante no encontrado" };
  session.members.splice(index, 1);
  return { ok: true };
}

export function createOrder(input: {
  tableId: string;
  lines: CreateOrderLine[];
}): { ok: boolean; order?: Order; error?: string } {
  const table = getTable(input.tableId);
  if (!table) return { ok: false, error: "Mesa no encontrada" };
  if (!Array.isArray(input.lines) || input.lines.length === 0) {
    return { ok: false, error: "El pedido está vacío" };
  }

  const session = getOrCreateSession(input.tableId);
  const items: OrderItem[] = [];
  const memberNames = new Set<string>();

  for (const line of input.lines) {
    const product = products.find((p) => p.id === line.productId);
    if (!product) {
      return { ok: false, error: `Producto no encontrado: ${line.productId}` };
    }
    const quantity = Number(line.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      return { ok: false, error: "Cantidad inválida" };
    }

    let memberId = line.memberId;
    let memberName = "Compartido";
    if (memberId && memberId !== SHARED_MEMBER_ID) {
      const member = session.members.find((m) => m.id === memberId);
      if (!member) return { ok: false, error: "Participante no encontrado" };
      memberName = member.name;
    } else {
      memberId = SHARED_MEMBER_ID;
    }
    memberNames.add(memberName);

    items.push({
      id: nextItemId(),
      productId: product.id,
      name: product.name,
      priceCents: product.priceCents,
      quantity,
      notes:
        typeof line.notes === "string" ? line.notes.trim() || undefined : undefined,
      station: product.station,
      status: "pendiente",
      memberId,
      memberName,
    });
  }

  const order: Order = {
    id: nextOrderId(),
    tableId: table.id,
    tableLabel: table.label,
    sessionId: session.id,
    memberName: memberNames.size === 1 ? [...memberNames][0] : "Compartido",
    createdAt: Date.now(),
    items,
  };

  orders.push(order);
  table.status = "ocupada";
  return { ok: true, order };
}

export function updateItemStatus(
  itemId: string,
  status: ItemStatus
): { ok: boolean; item?: OrderItem; error?: string } {
  const valid: ItemStatus[] = ["pendiente", "preparando", "listo", "entregado"];
  if (!valid.includes(status)) {
    return { ok: false, error: "Estado inválido" };
  }
  for (const order of orders) {
    const item = order.items.find((i) => i.id === itemId);
    if (item) {
      item.status = status;
      return { ok: true, item };
    }
  }
  return { ok: false, error: "Ítem no encontrado" };
}

export function addRequest(
  tableId: string,
  kind: RequestKind
): { ok: boolean; request?: TableRequest; error?: string } {
  const table = getTable(tableId);
  if (!table) return { ok: false, error: "Mesa no encontrada" };
  const request: TableRequest = {
    id: nextRequestId(),
    tableId,
    tableLabel: table.label,
    kind,
    status: "pendiente",
    createdAt: Date.now(),
  };
  requests.push(request);
  return { ok: true, request };
}

export function getAllRequests(): TableRequest[] {
  return requests;
}

export function getRequestsByTable(tableId: string): TableRequest[] {
  return requests.filter((r) => r.tableId === tableId);
}

export function markRequestAtendido(
  requestId: string
): { ok: boolean; error?: string } {
  const request = requests.find((r) => r.id === requestId);
  if (!request) return { ok: false, error: "Solicitud no encontrada" };
  request.status = "atendido";
  return { ok: true };
}

export function closeSession(
  tableId: string
): { ok: boolean; error?: string } {
  const session = getSessionByTable(tableId);
  if (session) session.status = "cerrada";
  const table = getTable(tableId);
  if (table) table.status = "libre";
  return { ok: true };
}
