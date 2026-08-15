import { NextRequest, NextResponse } from "next/server";
import { markRequestAttended } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const { requestId } = await params;
  const ok = await markRequestAttended(requestId);
  if (!ok) {
    return NextResponse.json({ error: "No se pudo atender la solicitud" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
