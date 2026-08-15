import Link from "next/link";
import { getTables } from "@/lib/store";

export const dynamic = "force-dynamic";

const INTERFACES = [
  {
    href: "/cocina",
    title: "Cocina",
    desc: "Pedidos nuevos, preparación y listos.",
    accent: "bg-red-50 text-red-700",
  },
  {
    href: "/bar",
    title: "Bar",
    desc: "Bebidas y cafés como estación propia.",
    accent: "bg-sky-50 text-sky-700",
  },
  {
    href: "/mozo",
    title: "Mozo",
    desc: "Mesas, pedidos y entregas del salón.",
    accent: "bg-green-50 text-green-700",
  },
];

export default async function Home() {
  const tables = await getTables();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Resto · Pedidos de mesa</h1>
        <p className="text-zinc-500">
          V1 — QR → carta → pedido → cocina/bar → mozo. Proyecto de prueba en
          GitHub para trabajar con Lautaro.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {INTERFACES.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className="flex flex-col gap-1 rounded-xl border border-zinc-200 p-5 transition-colors hover:border-zinc-900"
          >
            <span
              className={`self-start rounded-full px-3 py-1 text-xs font-semibold ${i.accent}`}
            >
              {i.title}
            </span>
            <p className="text-sm text-zinc-500">{i.desc}</p>
          </Link>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">
          Ingresar a una mesa{" "}
          <span className="text-sm font-normal text-zinc-500">
            (simula escanear el QR)
          </span>
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tables.map((t) => (
            <Link
              key={t.id}
              href={`/mesa/${t.id}`}
              className="flex flex-col gap-1 rounded-xl border border-zinc-200 p-4 transition-colors hover:border-zinc-900"
            >
              <span className="font-semibold">{t.label}</span>
              <span className="text-xs text-zinc-500">{t.sector}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
