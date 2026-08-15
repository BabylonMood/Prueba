import { NextRequest, NextResponse } from "next/server";
import { closeSession, getSessionByTable, joinSession } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const tableId = request.nextUrl.searchParams.get("tableId");
  if (!tableId) {
    return NextResponse.json({ error: "tableId requerido" }, { status: 400 });
  }
  const session = getSessionByTable(tableId);
  return NextResponse.json(session ?? null);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = joinSession(
    typeof body.tableId === "string" ? body.tableId : "",
    typeof body.name === "string" ? body.name : ""
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(
    { session: result.session, member: result.member },
    { status: 201 }
  );
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  if (
    body.action === "close" &&
    typeof body.tableId === "string" &&
    body.tableId
  ) {
    const result = closeSession(body.tableId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
}
