import { NextRequest, NextResponse } from "next/server";
import { addRequest, getAllRequests, getRequestsByTable } from "@/lib/store";
import type { RequestKind } from "@/lib/types";

export const dynamic = "force-dynamic";

const KINDS: RequestKind[] = [
  "mozo",
  "cubiertos",
  "servilletas",
  "cuenta",
  "sal",
  "agua",
  "otro",
];

export async function GET(request: NextRequest) {
  const tableId = request.nextUrl.searchParams.get("tableId");
  if (tableId) {
    return NextResponse.json(getRequestsByTable(tableId));
  }
  return NextResponse.json(getAllRequests());
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const tableId = typeof body.tableId === "string" ? body.tableId : "";
  const kind = typeof body.kind === "string" ? body.kind : "";
  if (!KINDS.includes(kind as RequestKind)) {
    return NextResponse.json({ error: "Tipo de solicitud inválido" }, { status: 400 });
  }
  const result = addRequest(tableId, kind as RequestKind);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result.request, { status: 201 });
}
