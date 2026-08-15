import { NextRequest, NextResponse } from "next/server";
import { closeSession, getSessionByTable, joinSession } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const tableId = request.nextUrl.searchParams.get("tableId");
  if (!tableId) {
    return NextResponse.json({ error: "tableId requerido" }, { status: 400 });
  }
  const session = await getSessionByTable(tableId);
  return NextResponse.json(session ?? null);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const member = await joinSession(
    typeof body.tableId === "string" ? body.tableId : "",
    typeof body.name === "string" ? body.name : ""
  );
  if (!member) {
    return NextResponse.json({ error: "No se pudo unir a la mesa" }, { status: 400 });
  }
  return NextResponse.json({ member }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  if (
    body.action === "close" &&
    typeof body.tableId === "string" &&
    body.tableId
  ) {
    const ok = await closeSession(body.tableId);
    if (!ok) {
      return NextResponse.json({ error: "No se pudo cerrar la sesión" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
}
