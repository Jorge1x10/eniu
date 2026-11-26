import QRCode from "qrcode";

import i18n from "../../../i18n";
import { tableLabel } from "./labels";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

/** Descarga el QR de una mesa como PNG. */
export async function downloadTableQr(table) {
  const dataUrl = await QRCode.toDataURL(table.qr_url, { width: 1024, margin: 2 });
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `mesa-${table.number}.png`;
  link.click();
}

/**
 * Abre una hoja lista para imprimir con el QR de cada mesa.
 *
 * Va en una ventana aparte para imprimir sólo las tarjetas, sin el panel
 * alrededor. Devuelve false si el navegador bloqueó la ventana.
 */
export async function printTableQrs(tables, businessName) {
  const sheet = window.open("", "_blank");
  if (!sheet) return false;
  const cards = await Promise.all(tables.map(async (table) => {
    const dataUrl = await QRCode.toDataURL(table.qr_url, { width: 600, margin: 1 });
    return `<figure class="card">
      <p class="business">${escapeHtml(businessName)}</p>
      <img src="${dataUrl}" alt="" />
      <figcaption>${escapeHtml(tableLabel(table))}</figcaption>
      <p class="hint">${escapeHtml(i18n.t("Escanea para ver el menú y pedir"))}</p>
    </figure>`;
  }));
  sheet.document.write(`<!doctype html>
<html lang="${escapeHtml(i18n.language)}"><head><meta charset="utf-8" />
<title>${escapeHtml(i18n.t("QR de las mesas"))}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #111; }
  main { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10mm; }
  .card { margin: 0; border: 1px dashed #bbb; border-radius: 6mm; padding: 8mm; text-align: center; break-inside: avoid; }
  .card img { width: 62mm; height: 62mm; }
  .business { margin: 0 0 4mm; font-size: 11pt; font-weight: 600; color: #555; }
  figcaption { margin-top: 3mm; font-size: 22pt; font-weight: 800; }
  .hint { margin: 2mm 0 0; font-size: 10pt; color: #555; }
</style></head>
<body><main>${cards.join("")}</main></body></html>`);
  sheet.document.close();
  const images = [...sheet.document.images];
  await Promise.all(images.map((image) => (image.complete ? null : new Promise((resolve) => { image.onload = resolve; image.onerror = resolve; }))));
  sheet.focus();
  sheet.print();
  return true;
}
