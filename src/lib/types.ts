export type StationId = "cocina" | "bar";

export type ItemStatus = "pendiente" | "preparando" | "listo" | "entregado";

export type TableStatus = "libre" | "ocupada";

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  station: StationId;
  categoryId: string;
}

export interface Table {
  id: string;
  label: string;
  sector: string;
  status: TableStatus;
}

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  priceCents: number;
  quantity: number;
  notes?: string;
  station: StationId;
  status: ItemStatus;
}

export interface Order {
  id: string;
  tableId: string;
  tableLabel: string;
  memberName: string;
  createdAt: number;
  items: OrderItem[];
}

export interface MenuData {
  categories: Category[];
  products: Product[];
}

export interface CreateOrderLine {
  productId: string;
  quantity: number;
  notes?: string;
}

export const ITEM_STATUSES: ItemStatus[] = [
  "pendiente",
  "preparando",
  "listo",
  "entregado",
];

export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  pendiente: "Pendiente",
  preparando: "En preparación",
  listo: "Listo",
  entregado: "Entregado",
};
