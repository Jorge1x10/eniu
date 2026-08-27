import { fetch as expoFetch } from 'expo/fetch';

import { sessionStore } from '@/lib/session-store';

// expo/fetch no acepta el archivo con la forma `{ uri, name, type }` de React
// Native, así que las subidas multipart van por el fetch nativo de RN.
const pickFetch = (body: BodyInit | null | undefined) =>
  (body instanceof FormData ? globalThis.fetch : expoFetch) as typeof globalThis.fetch;

const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000/api').replace(/\/$/, '');
const PUBLIC_ROUTES = new Set(['auth/login', 'auth/register', 'auth/forgot-password', 'auth/reset-password']);

export class ApiError extends Error {
  constructor(message: string, public status: number, public data?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
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
    response = await pickFetch(options.body)(`${API_URL}/${normalizedPath}`, { ...options, headers });
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : 'No hay conexión con el servidor.', 0);
  }

  if (response.status === 401 && allowRefresh && !PUBLIC_ROUTES.has(normalizedPath)) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return apiRequest<T>(path, options, false);
    await sessionStore.clear();
  }

  const data = await parseResponse(response);
  if (!response.ok) {
    throw new ApiError(extractErrorMessage(data) || 'No fue posible completar la solicitud.', response.status, data);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => apiRequest<T>(path, { signal }),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => apiRequest<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
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
