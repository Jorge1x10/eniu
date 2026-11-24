/**
 * Ajustes de impresión de comandas, **por dispositivo** (localStorage).
 *
 * Es por dispositivo a propósito: si el panel está abierto en la caja, en la
 * tableta del mesero y en la cocina, sólo el que tiene la impresora debe
 * imprimir. Si fuera un ajuste del negocio, cada panel abierto imprimiría la
 * misma comanda.
 */
const KEY = "eniu.print.settings";
export const PAPER_WIDTHS = ["80", "58"];
const DEFAULTS = { autoPrint: false, paper: "80" };

export function loadPrintSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
    return {
      autoPrint: saved.autoPrint === true,
      paper: PAPER_WIDTHS.includes(saved.paper) ? saved.paper : DEFAULTS.paper,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function savePrintSettings(settings) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...loadPrintSettings(), ...settings })); } catch { /* sólo no se recuerda */ }
}

const CLAIM_PREFIX = "eniu.print.claimed.";
const CLAIM_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * Reserva la impresión automática de un pedido en este navegador.
 *
 * Si hay dos pestañas del panel abiertas en el mismo equipo, las dos ven el
 * pedido aceptado; la primera que lo reserva lo imprime y la otra lo salta.
 */
export function wasAutoPrinted(orderId) {
  try { return Boolean(localStorage.getItem(CLAIM_PREFIX + orderId)); } catch { return false; }
}

export function claimAutoPrint(orderId) {
  try {
    const key = CLAIM_PREFIX + orderId;
    if (localStorage.getItem(key)) return false;
    localStorage.setItem(key, String(Date.now()));
    // Limpieza de reservas viejas, para no acumular claves.
    const now = Date.now();
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const name = localStorage.key(index);
      if (name?.startsWith(CLAIM_PREFIX) && now - Number(localStorage.getItem(name)) > CLAIM_TTL_MS) localStorage.removeItem(name);
    }
    return true;
  } catch {
    return true;
  }
}
