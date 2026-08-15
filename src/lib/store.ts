import { dataCategories, dataProducts, dataTables } from "./data";
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

const categories = dataCategories;
const products: Product[] = dataProducts;
const tables: Table[] = dataTables;
const orders: Order[] = [];

let orderCounter = 0;
let itemCounter = 0;

const nextOrderId = (): string => `#${++orderCounter}`;
const nextItemId = (): string => `item_${++itemCounter}`;

export function getMenu(): MenuData {
  return { categories, products };
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

export function createOrder(input: {
  tableId: string;
  memberName: string;
  lines: CreateOrderLine[];
}): { ok: boolean; order?: Order; error?: string } {
  const table = getTable(input.tableId);
  if (!table) return { ok: false, error: "Mesa no encontrada" };
  if (!Array.isArray(input.lines) || input.lines.length === 0) {
    return { ok: false, error: "El pedido está vacío" };
  }

  const items: OrderItem[] = [];
  for (const line of input.lines) {
    const product = products.find((p) => p.id === line.productId);
    if (!product) {
      return { ok: false, error: `Producto no encontrado: ${line.productId}` };
    }
    const quantity = Number(line.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      return { ok: false, error: "Cantidad inválida" };
    }
    items.push({
      id: nextItemId(),
      productId: product.id,
      name: product.name,
      priceCents: product.priceCents,
      quantity,
      notes: typeof line.notes === "string" ? line.notes.trim() || undefined : undefined,
      station: product.station,
      status: "pendiente",
    });
  }

  const order: Order = {
    id: nextOrderId(),
    tableId: table.id,
    tableLabel: table.label,
    memberName: input.memberName.trim() || "Anónimo",
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
