import { useState } from "react";
import { Printer, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { formatCurrency, formatDate } from "../../../i18n/formats";
import MesaBadge from "./MesaBadge";
import StatusChip from "./StatusChip";

const NEXT = {
  received: { status: "preparing", label: "Empezar a preparar" },
  preparing: { status: "ready", label: "Marcar listo" },
};

// Lo aceptado ya está en cocina: es lo que tiene comanda impresa.
const PRINTABLE = new Set(["received", "preparing", "ready"]);

const MONO = "font-['ui-monospace','SFMono-Regular','Menlo','Consolas',monospace]";

function time(iso) {
  return iso ? formatDate(new Date(iso), { hour: "2-digit", minute: "2-digit" }) : "";
}

/**
 * La comanda: papel crema con orillas recortadas, productos en monoespaciada y
 * las notas de cocina resaltadas. Quitar un producto se confirma en el mismo
 * renglón; rechazar el pedido abre un diálogo (lo decide quien la usa).
 *
 * `variant="table"`: encabezado "DAVID · 13:40" (dentro de la tarjeta de su
 * mesa). `variant="status"`: con la insignia de la mesa, para la vista por
 * estado.
 */
export default function OrderTicket({ order, table, currency, variant = "status", onAdvance, onReject, onRemoveItem, onPrint }) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(null);
  const [busy, setBusy] = useState(null);
  const canRemove = order.status !== "ready" && order.status !== "cancelled";
  const count = order.items.filter((item) => !item.is_cancelled).reduce((sum, item) => sum + item.quantity, 0);
  const next = NEXT[order.status];
  const printButton = onPrint && PRINTABLE.has(order.status) ? (
    <button
      type="button"
      onClick={onPrint}
      aria-label={t("Imprimir la comanda de {{name}}", { name: order.diner_name })}
      title={t("Imprimir comanda")}
      className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-eniu-ticket-muted hover:bg-black/5 hover:text-eniu-ink"
    >
      <Printer size={18} aria-hidden="true" />
    </button>
  ) : null;

  async function run(key, action) {
    setBusy(key);
    try { await action(); } finally { setBusy(null); }
  }

  return (
    // La sombra va en un contenedor aparte: la máscara de las orillas recorta
    // todo lo que pinta el propio elemento, filtros incluidos.
    <div className="drop-shadow-[0_4px_10px_rgba(84,70,15,0.16)]">
    <article className="ticket-edges bg-eniu-paper px-4 py-4 text-eniu-ink">
      {variant === "table" ? (
        <header className="flex items-center justify-between gap-3">
          <p className={`${MONO} min-w-0 truncate text-[13px] font-bold tracking-[0.5px]`}>{order.diner_name.toUpperCase()} · {time(order.created_at)}</p>
          <div className="flex shrink-0 items-center gap-1">{printButton}<StatusChip status={order.status} /></div>
        </header>
      ) : (
        <header className="flex items-center gap-3">
          <MesaBadge number={table.number} takeaway={table.takeaway} tone="paper" />
          <div className="min-w-0 flex-1">
            <p className={`${MONO} truncate text-[15px] font-extrabold`}>{order.diner_name.toUpperCase()}</p>
            <p className={`${MONO} text-[13px] text-eniu-ticket-muted`}>{time(order.created_at)}{table.takeaway ? (table.phone ? ` · ${table.phone}` : "") : table.name ? ` · ${table.name}` : ""}</p>
          </div>
          {printButton}
          <StatusChip status={order.status} />
        </header>
      )}

      <hr className="my-3 border-0 border-t-[1.5px] border-dashed border-eniu-rule" />

      <ul className="space-y-1.5">
        {order.items.map((item) => (
          <li key={item.id}>
            {confirming === item.id ? (
              <div className="flex min-h-11 items-center gap-2">
                <p className="flex-1 text-[15px] font-bold">{t("¿Quitarlo del pedido?")}</p>
                <button type="button" onClick={() => setConfirming(null)} className="min-h-10 cursor-pointer rounded-lg px-3 font-bold hover:bg-black/5">{t("No")}</button>
                <button
                  type="button"
                  disabled={busy === item.id}
                  onClick={() => run(item.id, async () => { await onRemoveItem(item); setConfirming(null); })}
                  className="min-h-10 cursor-pointer rounded-xl bg-eniu-ticket-danger px-3.5 font-extrabold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {t("Sí, quitar")}
                </button>
              </div>
            ) : (
              <>
                <div className={`${MONO} flex min-h-10 items-center gap-2 ${item.is_cancelled ? "text-eniu-ticket-muted line-through" : ""}`}>
                  <span className="w-7 text-base font-extrabold">{item.quantity}×</span>
                  <span className="flex-1 text-base font-semibold">{item.name}</span>
                  <span className="text-sm tabular-nums">{formatCurrency(Number(item.line_total), currency)}</span>
                  {canRemove && !item.is_cancelled && (
                    <button
                      type="button"
                      onClick={() => setConfirming(item.id)}
                      aria-label={t("Quitar {{name}} del pedido", { name: item.name })}
                      title={t("Quitar {{name}} del pedido", { name: item.name })}
                      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-eniu-ticket-muted no-underline hover:bg-black/5 hover:text-eniu-ticket-danger"
                    >
                      <Trash2 size={18} aria-hidden="true" />
                    </button>
                  )}
                </div>
                {item.notes && !item.is_cancelled && (
                  <p className={`${MONO} ml-9 inline-block rounded-md bg-eniu-note px-2 py-1 text-[15px] font-extrabold text-eniu-ink`}>↳ {item.notes}</p>
                )}
                {item.is_cancelled && <p className="ml-9 text-[13px] text-eniu-ticket-muted">{t("Quitado por el restaurante")}</p>}
              </>
            )}
          </li>
        ))}
      </ul>

      <hr className="my-3 border-0 border-t-[1.5px] border-dashed border-eniu-rule" />

      <footer className={`${MONO} flex items-center justify-between`}>
        <span className="text-sm text-eniu-ticket-muted">{count === 1 ? t("1 producto") : t("{{count}} productos", { count })}</span>
        <span className="text-base font-extrabold tabular-nums">{formatCurrency(Number(order.total), currency)}</span>
      </footer>

      {order.status === "pending" ? (
        <div className="mt-3 flex gap-2.5">
          <button type="button" onClick={onReject} className="min-h-12 cursor-pointer rounded-xl border-[1.5px] border-eniu-ticket-danger/40 px-4 font-extrabold text-eniu-ticket-danger hover:bg-eniu-ticket-danger/10">{t("Rechazar")}</button>
          <button type="button" disabled={busy === "advance"} onClick={() => run("advance", () => onAdvance("received"))} className="min-h-12 flex-1 cursor-pointer rounded-xl bg-eniu-yellow font-extrabold hover:bg-eniu-yellow-pressed disabled:opacity-60">{t("Aceptar")}</button>
        </div>
      ) : next ? (
        <button type="button" disabled={busy === "advance"} onClick={() => run("advance", () => onAdvance(next.status))} className="mt-3 min-h-12 w-full cursor-pointer rounded-xl bg-eniu-ink font-extrabold text-eniu-cream hover:bg-eniu-ink-soft disabled:opacity-60">{t(next.label)}</button>
      ) : null}
    </article>
    </div>
  );
}
