import i18n from "../../../i18n";
import { formatCurrency, formatDate } from "../../../i18n/formats";
import { escapeHtml } from "../../Ordering/printing/ticket";

export const METHOD_LABELS = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  other: "Otro",
};

function when(iso) {
  return iso ? formatDate(new Date(iso), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
}

/**
 * El corte de caja en papel térmico de 80 o 58 mm: ventas por método,
 * propinas, movimientos y el efectivo esperado contra el contado. Se guarda
 * con el dinero, así que lleva todo lo que se revisa al día siguiente.
 */
export function buildCashReportHtml({ report, businessName, currency, paper = "80" }) {
  const t = i18n.t.bind(i18n);
  const money = (amount) => escapeHtml(formatCurrency(Number(amount || 0), currency));
  const width = paper === "58" ? 58 : 80;
  const row = (label, value, strong = false) => `<tr${strong ? ' class="strong"' : ""}><td>${escapeHtml(label)}</td><td>${value}</td></tr>`;
  const methods = report.by_method.filter((entry) => entry.payments > 0);
  const movements = report.movements.map((movement) => row(
    `${movement.kind === "in" ? "+" : "-"} ${movement.reason}`,
    money(movement.amount),
  )).join("");
  const difference = Number(report.difference || 0);
  const differenceLabel = report.difference === null
    ? ""
    : difference === 0 ? t("Cuadra") : difference > 0 ? t("Sobrante") : t("Faltante");

  return `<!doctype html>
<html lang="${escapeHtml(i18n.language)}"><head><meta charset="utf-8" />
<title>${escapeHtml(t("Corte de caja"))}</title>
<style>
  @page { size: ${width}mm 200mm; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; }
  body { width: ${width}mm; padding: 3mm ${width === 58 ? 2 : 4}mm 6mm; font-family: "Courier New", ui-monospace, monospace; font-size: ${width === 58 ? 9 : 11}pt; line-height: 1.3; }
  .center { text-align: center; }
  h1 { margin: 0; font-size: 1.3em; }
  p { margin: 0.5mm 0; }
  h2 { margin: 2mm 0 1mm; font-size: 1em; text-transform: uppercase; letter-spacing: 1px; }
  .rule { border: 0; border-top: 1px dashed #000; margin: 2mm 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 0.3mm 0; vertical-align: top; overflow-wrap: anywhere; }
  td:last-child { text-align: right; white-space: nowrap; padding-left: 2mm; }
  .strong td { font-weight: 900; }
</style></head>
<body data-paper-mm="${width}">
  <p class="center"><strong>${escapeHtml(businessName)}</strong></p>
  <h1 class="center">${escapeHtml(t("CORTE DE CAJA"))}</h1>
  <p class="center">${escapeHtml(t("Abrió {{time}}", { time: when(report.opened_at) }))}</p>
  ${report.closed_at ? `<p class="center">${escapeHtml(t("Cerró {{time}}", { time: when(report.closed_at) }))}</p>` : ""}
  <hr class="rule" />
  <h2>${escapeHtml(t("Ventas"))}</h2>
  <table>
    ${methods.map((entry) => row(t(METHOD_LABELS[entry.method]), money(entry.amount))).join("") || row(t("Sin cobros"), money(0))}
    ${row(t("Total vendido"), money(report.sales_total), true)}
    ${row(t("Cuentas cobradas"), escapeHtml(report.accounts_paid))}
    ${row(t("Ticket promedio"), money(report.average_ticket))}
  </table>
  <h2>${escapeHtml(t("Propinas"))}</h2>
  <table>
    ${methods.filter((entry) => Number(entry.tips) > 0).map((entry) => row(t(METHOD_LABELS[entry.method]), money(entry.tips))).join("")}
    ${row(t("Total de propinas"), money(report.tips_total), true)}
  </table>
  <hr class="rule" />
  <h2>${escapeHtml(t("Efectivo"))}</h2>
  <table>
    ${row(t("Fondo inicial"), money(report.opening_float))}
    ${row(t("Ventas en efectivo"), money(report.by_method.find((entry) => entry.method === "cash")?.amount))}
    ${row(t("Propinas en efectivo"), money(report.by_method.find((entry) => entry.method === "cash")?.tips))}
    ${row(t("Entradas"), money(report.cash_in))}
    ${row(t("Retiros"), money(report.cash_out))}
    ${movements}
    ${row(t("Esperado en caja"), money(report.expected_cash), true)}
    ${report.counted_cash !== null ? row(t("Contado"), money(report.counted_cash), true) : ""}
    ${report.difference !== null ? row(`${t("Diferencia")} (${differenceLabel})`, money(report.difference), true) : ""}
  </table>
  ${report.accounts_unpaid.length || report.accounts_cancelled ? `<hr class="rule" /><table>
    ${report.accounts_unpaid.length ? row(t("Cerradas sin cobrar"), escapeHtml(report.accounts_unpaid.length)) : ""}
    ${report.accounts_cancelled ? row(t("Canceladas"), escapeHtml(report.accounts_cancelled)) : ""}
  </table>` : ""}
  ${report.notes ? `<hr class="rule" /><p>${escapeHtml(report.notes)}</p>` : ""}
</body></html>`;
}

export async function printCashReport({ report, businessName, currency }) {
  const [{ printHtml }, { loadPrintSettings }] = await Promise.all([
    import("../../Ordering/printing/printTicket"),
    import("../../Ordering/printing/printSettings"),
  ]);
  return printHtml(buildCashReportHtml({ report, businessName, currency, paper: loadPrintSettings().paper }));
}
