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
    return NextResponse.json(await getRequestsByTable(tableId));
  }
  return NextResponse.json(await getAllRequests());
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const tableId = typeof body.tableId === "string" ? body.tableId : "";
  const kind = typeof body.kind === "string" ? body.kind : "";
  if (!KINDS.includes(kind as RequestKind)) {
    return NextResponse.json({ error: "Tipo de solicitud inválido" }, { status: 400 });
  }
  const created = await addRequest(tableId, kind as RequestKind);
  if (!created) {
    return NextResponse.json({ error: "No se pudo crear la solicitud" }, { status: 400 });
  }
  return NextResponse.json(created, { status: 201 });
}
