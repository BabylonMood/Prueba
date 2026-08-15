import { NextRequest, NextResponse } from "next/server";
import type { ItemStatus } from "@/lib/types";
import { updateItemStatus } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const status = typeof raw.status === "string" ? raw.status : "";

  const result = await updateItemStatus(itemId, status as ItemStatus);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ item: result.item });
}
