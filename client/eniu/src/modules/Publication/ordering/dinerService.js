/**
 * API del comensal (`server/eniu-backend/docs/ORDERING.md`). Sin sesión: el
 * teléfono se identifica con el token de `dinerIdentity`, que viaja en
 * `X-Eniu-Diner`. Cada función devuelve `{ ok, status, data }`, como
 * `publicMenuService`, y nunca lanza.
 */
const API_BASE_URL = import.meta.env.VITE_API_URL.replace(/\/$/, "");

async function call(path, { method = "GET", token, body, signal } = {}) {
  try {
    const headers = { Accept: "application/json" };
    if (token) headers["X-Eniu-Diner"] = token;
    if (body) headers["Content-Type"] = "application/json";
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    if (error.name === "AbortError") return { ok: false, aborted: true, status: 0, data: null };
    return { ok: false, status: 0, data: null };
  }
}

const tablePath = (qrToken) => `/public/tables/${encodeURIComponent(qrToken)}`;

export function getTable(qrToken, { token, signal } = {}) {
  return call(tablePath(qrToken), { token, signal });
}

export function sendOrder(qrToken, { token, dinerName, idempotencyKey, items }) {
  return call(`${tablePath(qrToken)}/orders`, {
    method: "POST",
    token,
    body: { diner_name: dinerName, idempotency_key: idempotencyKey, items },
  });
}

export function getMyOrders(qrToken, { token, version, signal } = {}) {
  const query = version === null || version === undefined ? "" : `?version=${version}`;
  return call(`${tablePath(qrToken)}/orders${query}`, { token, signal });
}

export function getTableAccount(qrToken, { token, signal } = {}) {
  return call(`${tablePath(qrToken)}/account`, { token, signal });
}
