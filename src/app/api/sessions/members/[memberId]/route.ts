import { NextRequest, NextResponse } from "next/server";
import { removeMember } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await params;
  const tableId = request.nextUrl.searchParams.get("tableId") ?? "";
  const ok = await removeMember(tableId, memberId);

  if (!ok) {
    return NextResponse.json({ error: "No se pudo borrar el miembro" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
