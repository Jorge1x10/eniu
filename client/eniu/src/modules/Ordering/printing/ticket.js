import i18n from "../../../i18n";
import { formatDate } from "../../../i18n/formats";

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function time(iso) {
  return iso ? formatDate(new Date(iso), { hour: "2-digit", minute: "2-digit" }) : "";
}

/**
 * La comanda para cocina, como página HTML lista para imprimir en papel
 * térmico de 80 o 58 mm.
 *
 * Sin precios: es para preparar, no para cobrar. La mesa va enorme, porque es
 * lo primero que se busca al sacar el papel; las notas van resaltadas; lo que
 * el restaurante quitó no se imprime. Todo texto que viene del comensal pasa
 * por `escapeHtml`: la página se dibuja en un iframe del mismo origen.
 */
export function buildTicketHtml({ order, table, businessName, paper = "80", reprint = false }) {
  const t = i18n.t.bind(i18n);
  const width = paper === "58" ? 58 : 80;
  const items = (order.items || []).filter((item) => !item.is_cancelled);
  const lines = items.map((item) => `
    <li>
      <span class="qty">${escapeHtml(item.quantity)}&times;</span>
      <span class="name">${escapeHtml(item.name)}</span>
      ${item.notes ? `<span class="note">&gt; ${escapeHtml(item.notes)}</span>` : ""}
    </li>`).join("");
  const units = items.reduce((sum, item) => sum + item.quantity, 0);
  return `<!doctype html>
<html lang="${escapeHtml(i18n.language)}"><head><meta charset="utf-8" />
<title>${escapeHtml(table.takeaway ? t("Comanda · Para llevar") : t("Comanda · Mesa {{number}}", { number: table.number }))}</title>
<style>
  /* El alto exacto lo fija \`printTicket\` al medir el contenido: \`auto\` no es
     un tamaño de página válido y el navegador caería a carta o A4. */
  @page { size: ${width}mm 200mm; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; }
  body { width: ${width}mm; padding: 3mm ${width === 58 ? 2 : 4}mm 6mm; font-family: "Courier New", ui-monospace, monospace; font-size: ${width === 58 ? 11 : 13}pt; line-height: 1.25; }
  .center { text-align: center; }
  .business { margin: 0; font-size: 0.85em; font-weight: 700; }
  .kind { margin: 1mm 0 0; font-size: 0.8em; letter-spacing: 2px; }
  .table { margin: 2mm 0 0; font-size: ${width === 58 ? 26 : 34}pt; font-weight: 900; line-height: 1; }
  .meta { margin: 1.5mm 0 0; font-weight: 700; }
  .rule { border: 0; border-top: 1px dashed #000; margin: 2.5mm 0; }
  ul { list-style: none; margin: 0; padding: 0; }
  li { margin: 0 0 2mm; display: grid; grid-template-columns: auto 1fr; column-gap: 2mm; }
  .qty { font-weight: 900; }
  .name { font-weight: 700; overflow-wrap: anywhere; }
  .note { grid-column: 2; font-weight: 900; text-transform: uppercase; overflow-wrap: anywhere; }
  .foot { margin: 0; font-size: 0.85em; }
  .reprint { margin: 0 0 1.5mm; font-weight: 900; }
</style></head>
<body data-paper-mm="${width}">
  ${reprint ? `<p class="center reprint">*** ${escapeHtml(t("REIMPRESIÓN"))} ***</p>` : ""}
  <p class="center business">${escapeHtml(businessName)}</p>
  <p class="center kind">${escapeHtml(t("COMANDA"))}</p>
  <p class="center table">${escapeHtml(table.takeaway ? t("PARA LLEVAR") : t("MESA {{number}}", { number: table.number }))}</p>
  ${!table.takeaway && table.name ? `<p class="center meta">${escapeHtml(table.name)}</p>` : ""}
  ${table.takeaway && table.phone ? `<p class="center meta">${escapeHtml(t("Tel. {{phone}}", { phone: table.phone }))}</p>` : ""}
  <p class="center meta">${escapeHtml(order.diner_name)} · ${escapeHtml(time(order.created_at))}</p>
  <hr class="rule" />
  <ul>${lines}</ul>
  <hr class="rule" />
  <p class="foot">${escapeHtml(units === 1 ? t("1 producto") : t("{{count}} productos", { count: units }))}</p>
  <p class="foot">${escapeHtml(t("Aceptado {{time}}", { time: time(order.received_at || new Date().toISOString()) }))}</p>
</body></html>`;
}
