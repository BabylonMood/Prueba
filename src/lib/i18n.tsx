"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type Lang = "es" | "en" | "pt";

const LANG_KEY = "resto.lang";

const es = {
  mesa: "Mesa",
  intro:
    "Armá el pedido desde acá: elegí lo que quieran y envialo. Cada uno puede sumar su nombre para que su pedido quede a su cuenta — o uno solo pide por todos.",
  nombres: "Nombres",
  opcional: "(Opcional)",
  tuNombre: "Tu nombre",
  sumarme: "Sumarme",
  nuestraCarta: "Nuestra carta",
  agregar: "Agregar",
  verPedido: "Ver pedido",
  confirmarPedido: "Confirmar pedido",
  tuPedido: "Tu pedido",
  confirmarEnviar: "Confirmar y enviar",
  enviando: "Enviando…",
  volver: "← Volver",
  quitar: "Quitar",
  nota: "Nota (ej: sin cebolla)",
  total: "Total",
  cuenta: "Cuenta",
  dividirEn: "Dividir la cuenta en",
  porPersona: "Por persona",
  divididoEn: "Dividido en",
  pedidosMesa: "Pedidos de la mesa",
  todos: "Todos",
  compartido: "Compartido",
  noPedidosFiltro: "No hay pedidos para este filtro.",
  carritoVacio: "El pedido está vacío.",
  sinConexion: "Error de conexión",
  comandaEnviada: "¡Comanda enviada!",
  pendiente: "Pendiente",
  preparando: "En preparación",
  listo: "Listo",
  entregado: "Entregado",
  extras: "Extras",
  llamarMozo: "Llamar al mozo",
  pedir: "Pedir",
  mozoAvisado: "Mozo avisado. Enseguida van.",
  solicitudEnviada: "Solicitud enviada.",
  pagar: "Pagar",
  tuCuenta: "Tu cuenta",
  personas: "Personas",
  ticketPdf: "Descargar ticket en PDF",
  cerrar: "Cerrar",
  cat: {
    entradas: "Entradas",
    principales: "Platos principales",
    postres: "Postres",
    bebidas: "Bebidas",
  },
  kind: {
    cubiertos: "Cubiertos",
    servilletas: "Servilletas",
    cuenta: "La cuenta",
    sal: "Sal",
    agua: "Agua",
    otro: "Otro",
    mozo: "Llamar al mozo",
  },
};

const en: typeof es = {
  mesa: "Table",
  intro:
    "Order from here: pick what you want and send it. Each person can add their name so their order goes on their own bill — or one person can order for everyone.",
  nombres: "Names",
  opcional: "(Optional)",
  tuNombre: "Your name",
  sumarme: "Add me",
  nuestraCarta: "Our menu",
  agregar: "Add",
  verPedido: "View order",
  confirmarPedido: "Confirm order",
  tuPedido: "Your order",
  confirmarEnviar: "Confirm & send",
  enviando: "Sending…",
  volver: "← Back",
  quitar: "Remove",
  nota: "Note (e.g. no onions)",
  total: "Total",
  cuenta: "Bill",
  dividirEn: "Split the bill by",
  porPersona: "Per person",
  divididoEn: "Split into",
  pedidosMesa: "Table orders",
  todos: "All",
  compartido: "Shared",
  noPedidosFiltro: "No orders for this filter.",
  carritoVacio: "Your order is empty.",
  sinConexion: "Connection error",
  comandaEnviada: "Order sent!",
  pendiente: "Pending",
  preparando: "In progress",
  listo: "Ready",
  entregado: "Delivered",
  extras: "Extras",
  llamarMozo: "Call the waiter",
  pedir: "Request",
  mozoAvisado: "Waiter notified. They'll be right there.",
  solicitudEnviada: "Request sent.",
  pagar: "Pay",
  tuCuenta: "Your bill",
  personas: "People",
  ticketPdf: "Download PDF ticket",
  cerrar: "Close",
  cat: {
    entradas: "Starters",
    principales: "Main dishes",
    postres: "Desserts",
    bebidas: "Drinks",
  },
  kind: {
    cubiertos: "Cutlery",
    servilletas: "Napkins",
    cuenta: "The bill",
    sal: "Salt",
    agua: "Water",
    otro: "Other",
    mozo: "Call the waiter",
  },
};

const pt: typeof es = {
  mesa: "Mesa",
  intro:
    "Faça seu pedido daqui: escolha o que quiser e envie. Cada um pode adicionar seu nome para que seu pedido fique em sua conta — ou um só faz o pedido para todos.",
  nombres: "Nomes",
  opcional: "(Opcional)",
  tuNombre: "Seu nome",
  sumarme: "Me adicionar",
  nuestraCarta: "Nosso cardápio",
  agregar: "Adicionar",
  verPedido: "Ver pedido",
  confirmarPedido: "Confirmar pedido",
  tuPedido: "Seu pedido",
  confirmarEnviar: "Confirmar e enviar",
  enviando: "Enviando…",
  volver: "← Voltar",
  quitar: "Remover",
  nota: "Observação (ex: sem cebola)",
  total: "Total",
  cuenta: "Conta",
  dividirEn: "Dividir a conta por",
  porPersona: "Por pessoa",
  divididoEn: "Dividido em",
  pedidosMesa: "Pedidos da mesa",
  todos: "Todos",
  compartido: "Compartilhado",
  noPedidosFiltro: "Não há pedidos para este filtro.",
  carritoVacio: "Seu pedido está vazio.",
  sinConexion: "Erro de conexão",
  comandaEnviada: "Pedido enviado!",
  pendiente: "Pendente",
  preparando: "Em preparo",
  listo: "Pronto",
  entregado: "Entregue",
  extras: "Extras",
  llamarMozo: "Chamar o garçom",
  pedir: "Pedir",
  mozoAvisado: "Garçom avisado. Já vão aí.",
  solicitudEnviada: "Solicitação enviada.",
  pagar: "Pagar",
  tuCuenta: "Sua conta",
  personas: "Pessoas",
  ticketPdf: "Baixar ticket em PDF",
  cerrar: "Fechar",
  cat: {
    entradas: "Entradas",
    principales: "Pratos principais",
    postres: "Sobremesas",
    bebidas: "Bebidas",
  },
  kind: {
    cubiertos: "Talheres",
    servilletas: "Guardanapos",
    cuenta: "A conta",
    sal: "Sal",
    agua: "Água",
    otro: "Outro",
    mozo: "Chamar o garçom",
  },
};

const dict: Record<Lang, typeof es> = { es, en, pt };

type Dict = typeof es;

function resolve(d: Dict, path: string): string {
  const parts = path.split(".");
  let value: unknown = d;
  for (const part of parts) {
    if (typeof value !== "object" || value === null) return path;
    value = (value as Record<string, unknown>)[part];
  }
  return typeof value === "string" ? value : path;
}

interface I18nValue {
  t: (key: string) => string;
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const I18nContext = createContext<I18nValue>({
  t: (k: string) => k,
  lang: "es",
  setLang: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "es";
    const stored = window.localStorage.getItem(LANG_KEY);
    return stored === "en" || stored === "pt" || stored === "es"
      ? stored
      : "es";
  });

  const setLang = (next: Lang) => {
    setLangState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANG_KEY, next);
    }
  };

  const t = (key: string) => resolve(dict[lang], key);

  return (
    <I18nContext.Provider value={{ t, lang, setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

const LANG_LABELS: Record<Lang, string> = {
  es: "Español",
  en: "English",
  pt: "Português",
};

export function LanguageSelect() {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocumentClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-md border border-[#0f5132] bg-white px-3 py-1.5 text-xs font-semibold text-[#0f5132] transition-colors hover:bg-[#f1f5f9]"
      >
        {LANG_LABELS[lang]}
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-50 mt-1 w-36 overflow-hidden rounded-lg border border-[#e2e8f0] bg-white shadow-lg"
        >
          {(Object.keys(LANG_LABELS) as Lang[]).map((l) => (
            <li key={l} role="option" aria-selected={l === lang}>
              <button
                type="button"
                onClick={() => {
                  setLang(l);
                  setOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm ${
                  l === lang
                    ? "bg-[#0f5132] font-semibold text-white"
                    : "text-[#334155] hover:bg-[#f1f5f9]"
                }`}
              >
                {LANG_LABELS[l]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
