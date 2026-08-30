import { fetch as expoFetch } from 'expo/fetch';
import * as Network from 'expo-network';

import { sessionStore } from '@/lib/session-store';
import i18n from '@/i18n';

// Desde SDK 54 `expo/fetch` es también el `fetch` global en Android e iOS, así
// que no queda un fetch de React Native al que caer para las subidas: la forma
// `{ uri, name, type }` falla con «Invalid FormData» en los dos. Las imágenes
// se adjuntan como Blob estándar desde `@/lib/image-file`.
const request = expoFetch as unknown as typeof globalThis.fetch;

const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000/api').replace(/\/$/, '');
const PUBLIC_ROUTES = new Set(['auth/login', 'auth/register', 'auth/forgot-password', 'auth/reset-password']);

export class ApiError extends Error {
  constructor(message: string, public status: number, public data?: unknown) {
    super(message);
    this.name = 'ApiError';
  }

  /** La petición no llegó a salir: sin red o sin servidor al otro lado. */
  get isOffline() {
    return this.status === 0;
  }
}

/**
 * Explica por qué no se pudo llegar al servidor, en términos que ayuden.
 *
 * "Sin internet" y "el servidor no responde" piden cosas distintas de quien
 * lee: en el primer caso conviene revisar la conexión, en el segundo lo único
 * que queda es reintentar. `fetch` no distingue —lanza el mismo error—, así
 * que se le pregunta al sistema.
 */
async function connectionErrorMessage() {
  try {
    const state = await Network.getNetworkStateAsync();
    // En Android `isInternetReachable` se comprueba de verdad; en iOS
    // coincide con `isConnected`. Si viene indefinido no se supone nada.
    const offline = state.isInternetReachable === false || state.isConnected === false;
    if (offline) return i18n.t(i18n.t(i18n.t("Sin conexión a internet. Revisa tu red e inténtalo de nuevo.")));
  } catch {
    // Si no se puede consultar el estado de la red, queda el mensaje genérico.
  }
  return i18n.t(i18n.t(i18n.t("No hay conexión con el servidor.")));
}

async function parseResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const message = (payload as { message?: unknown }).message ?? (payload as { error?: unknown }).error;
  if (typeof message === 'string' && message.trim()) return message;
  if (message && typeof message === 'object') {
    const nested = (message as { message?: unknown }).message;
    if (typeof nested === 'string' && nested.trim()) return nested;
  }
  return null;
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const refreshToken = await sessionStore.getRefreshToken();
    if (!refreshToken) return null;
    const response = await expoFetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${refreshToken}` },
    });
    if (!response.ok) return null;
    const data = await parseResponse(response) as { access_token?: string } | null;
    if (!data?.access_token) return null;
    await sessionStore.save(data.access_token);
    return data.access_token;
  })().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, allowRefresh = true): Promise<T> {
  const normalizedPath = path.replace(/^\//, '');
  const token = await sessionStore.getAccessToken();
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await request(`${API_URL}/${normalizedPath}`, { ...options, headers });
  } catch (error) {
    // El mensaje de `fetch` ("Network request failed") no le dice nada a quien
    // usa la app, así que se sustituye por uno que sí explica qué pasó. El
    // original se conserva en `data` para poder diagnosticarlo.
    throw new ApiError(await connectionErrorMessage(), 0, {
      cause: error instanceof Error ? error.message : String(error),
    });
  }

  if (response.status === 401 && allowRefresh && !PUBLIC_ROUTES.has(normalizedPath)) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return apiRequest<T>(path, options, false);
    await sessionStore.clear();
  }

  const data = await parseResponse(response);
  if (!response.ok) {
    throw new ApiError(extractErrorMessage(data) || i18n.t(i18n.t(i18n.t("No fue posible completar la solicitud."))), response.status, data);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => apiRequest<T>(path, { signal }),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => apiRequest<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'DELETE', body: body === undefined ? undefined : JSON.stringify(body) }),
  postForm: <T>(path: string, body: FormData) => apiRequest<T>(path, { method: 'POST', body }),
  patchForm: <T>(path: string, body: FormData) => apiRequest<T>(path, { method: 'PATCH', body }),
};

/** La API sirve las imágenes con rutas relativas (`/api/products/…`); las vuelve absolutas. */
export function resolveMediaUrl(url?: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//.test(url) || url.startsWith('file:') || url.startsWith('data:')) return url;
  try { return `${new URL(API_URL).origin}${url.startsWith('/') ? '' : '/'}${url}`; }
  catch { return url; }
}

export { API_URL };
