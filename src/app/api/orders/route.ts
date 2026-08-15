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
    return NextResponse.json(getOrdersByStation(station));
  }
  if (tableId) {
    return NextResponse.json(getOrdersByTable(tableId));
  }
  return NextResponse.json(getAllOrders());
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = createOrder({
    tableId: typeof body.tableId === "string" ? body.tableId : "",
    memberName: typeof body.memberName === "string" ? body.memberName : "",
    lines: Array.isArray(body.lines) ? body.lines : [],
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ order: result.order }, { status: 201 });
}
