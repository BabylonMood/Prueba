import { NextResponse } from "next/server";
import { getTables } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getTables());
}
