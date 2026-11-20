/**
 * Renovación del access token, compartida por las dos capas de red del panel:
 * `useApi` (fetch) y el cliente axios de `services/api.js`.
 *
 * Antes sólo `useApi` sabía renovar. La comprobación de sesión al abrir el
 * panel (`GET /auth/me`) pasa por axios, así que recargar la página con el
 * access token vencido cerraba la sesión aunque el refresh siguiera vigente.
 */

const BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

let pending = null;

/**
 * Pide un access token nuevo con el refresh guardado y lo deja en
 * `localStorage`. Devuelve el token, o `null` si no se pudo.
 *
 * Varias peticiones que reciben 401 a la vez comparten una sola renovación:
 * sin esto cada una pediría la suya.
 */
export function refreshAccessToken() {
  if (pending) return pending;

  pending = (async () => {
    const refresh = localStorage.getItem("refresh_token");
    if (!refresh) return null;

    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { Authorization: `Bearer ${refresh}` },
      });
      if (!response.ok) return null;

      const data = await response.json().catch(() => null);
      if (!data?.access_token) return null;

      localStorage.setItem("access_token", data.access_token);
      return data.access_token;
    } catch {
      return null;
    }
  })().finally(() => {
    pending = null;
  });

  return pending;
}
