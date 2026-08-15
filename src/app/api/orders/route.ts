import { NextRequest, NextResponse } from "next/server";
import {
  createOrder,
  getAllOrders,
  getOrdersByStation,
  getOrdersByTable,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const station = request.nextUrl.searchParams.get("station");
  const tableId = request.nextUrl.searchParams.get("tableId");

  if (station === "cocina" || station === "bar") {
    return NextResponse.json(await getOrdersByStation(station));
  }
  if (tableId) {
    return NextResponse.json(await getOrdersByTable(tableId));
  }
  return NextResponse.json(await getAllOrders());
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const tableId = typeof raw.tableId === "string" ? raw.tableId : "";
  const lines = Array.isArray(raw.lines) ? raw.lines : [];

  const result = await createOrder({ tableId, lines });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ order: result.order }, { status: 201 });
}
