import { NextResponse } from "next/server";
import { getAllOrders, getAllRequests, getTables } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const [tables, orders, requests] = await Promise.all([
    getTables(),
    getAllOrders(),
    getAllRequests(),
  ]);
  return NextResponse.json({ tables, orders, requests });
}