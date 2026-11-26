/**
 * Quién pide, sin cuentas ni contraseñas.
 *
 * - El **token** lo genera este navegador una vez y lo guarda: el servidor solo
 *   conserva su HMAC y con él reconoce "tus pedidos" y deja ver la cuenta de la
 *   mesa sólo a quien pidió en ella.
 * - El **nombre** ("David", "Familia López") se recuerda para no preguntarlo
 *   en cada visita.
 * - El **carrito** se guarda por mesa: recargar la página no lo vacía.
 *
 * Todo pasa por `try/catch`: en una ventana privada o con el almacenamiento
 * bloqueado, el token vive en memoria y la página sigue funcionando.
 */
const TOKEN_KEY = "eniu.diner.token";
const NAME_KEY = "eniu.diner.name";
const cartKey = (qrToken) => `eniu.diner.cart.${qrToken}`;

let memoryToken = null;

function read(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function write(key, value) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* sin almacenamiento: sólo no se recuerda */ }
}

/** 32 caracteres `A-Z a-z 0-9 _ -`, el formato que acepta el servidor. */
export function randomToken(length = 32) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

const VALID_TOKEN = /^[A-Za-z0-9_-]{16,128}$/;

export function dinerToken() {
  const saved = read(TOKEN_KEY);
  if (saved && VALID_TOKEN.test(saved)) return saved;
  if (memoryToken) return memoryToken;
  memoryToken = randomToken();
  write(TOKEN_KEY, memoryToken);
  return memoryToken;
}

export function savedDinerName() {
  return (read(NAME_KEY) || "").slice(0, 40);
}

export function rememberDinerName(name) {
  write(NAME_KEY, name ? name.trim().slice(0, 40) : null);
}

export function savedCart(qrToken) {
  try {
    const lines = JSON.parse(read(cartKey(qrToken)) || "[]");
    return Array.isArray(lines)
      ? lines.filter((line) => line && typeof line.key === "string" && Number.isInteger(line.quantity) && line.quantity > 0)
      : [];
  } catch {
    return [];
  }
}

export function rememberCart(qrToken, lines) {
  write(cartKey(qrToken), lines.length ? JSON.stringify(lines) : null);
}
