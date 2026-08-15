import { notFound } from "next/navigation";
import { getTable } from "@/lib/store";
import { MenuClient } from "@/components/mesa/menu-client";

export const dynamic = "force-dynamic";

export default async function MesaPage({
  params,
}: {
  params: Promise<{ tableId: string }>;
}) {
  const { tableId } = await params;
  const table = await getTable(tableId);
  if (!table) notFound();

  return (
    <main className="flex flex-1">
      <MenuClient tableId={tableId} tableLabel={table.label} />
    </main>
  );
}
