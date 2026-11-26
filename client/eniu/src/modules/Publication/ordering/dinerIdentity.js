/**
 * Quién pide, sin cuentas ni contraseñas.
 *
 * - El **token** lo genera este navegador una vez y lo guarda: el servidor solo
 *   conserva su HMAC y con él reconoce "tus pedidos" y deja ver la cuenta de la
 *   mesa sólo a quien pidió en ella.
 * - El **nombre** ("David", "Familia López") se recuerda para no preguntarlo
 *   en cada visita.
 * - El **teléfono** sólo se pide para llevar, para avisar cuando esté listo;
 *   también se recuerda.
 * - El **carrito** se guarda por mesa (o por menú, para llevar): recargar la
 *   página no lo vacía.
 *
 * Todo pasa por `try/catch`: en una ventana privada o con el almacenamiento
 * bloqueado, el token vive en memoria y la página sigue funcionando.
 */
const TOKEN_KEY = "eniu.diner.token";
const NAME_KEY = "eniu.diner.name";
const PHONE_KEY = "eniu.diner.phone";
const DELIVERY_KEY = "eniu.diner.delivery";
const CHANNEL_KEY = "eniu.diner.channel";
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

export function savedDinerPhone() {
  return (read(PHONE_KEY) || "").slice(0, 20);
}

export function rememberDinerPhone(phone) {
  write(PHONE_KEY, phone ? phone.trim().slice(0, 20) : null);
}

/** Colonia, dirección, referencias y pago de la última entrega a domicilio. */
export function savedDelivery() {
  try {
    const data = JSON.parse(read(DELIVERY_KEY) || "{}");
    const text = (value, limit) => (typeof value === "string" ? value.slice(0, limit) : "");
    return {
      zone: text(data.zone, 60),
      address: text(data.address, 200),
      references: text(data.references, 200),
      payWith: data.payWith === "card" ? "card" : "cash",
      cashTendered: text(data.cashTendered, 12),
    };
  } catch {
    return { zone: "", address: "", references: "", payWith: "cash", cashTendered: "" };
  }
}

export function rememberDelivery(delivery) {
  write(DELIVERY_KEY, JSON.stringify(delivery));
}

/** "takeaway" o "delivery": lo que eligió la última vez. */
export function savedChannel() {
  const value = read(CHANNEL_KEY);
  return value === "delivery" || value === "takeaway" ? value : null;
}

export function rememberChannel(channel) {
  write(CHANNEL_KEY, channel);
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
