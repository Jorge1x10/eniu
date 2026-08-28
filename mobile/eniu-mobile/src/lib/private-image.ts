import { useEffect, useState } from 'react';

import { resolveMediaUrl } from '@/lib/api';
import { sessionStore } from '@/lib/session-store';

/**
 * Fuente para `expo-image` de un archivo que la API sirve detrás del JWT
 * (la portada y el fondo del menú). Devuelve `null` hasta tener el token, para
 * no pedir la imagen sin cabecera y quedarnos con un 401 cacheado.
 *
 * `version` invalida la caché: la URL de la portada no cambia al reemplazarla,
 * así que sin esto se seguiría viendo la anterior después de guardar.
 */
export function usePrivateImage(path?: string | null, version?: number) {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => { sessionStore.getAccessToken().then(setToken); }, []);
  const url = resolveMediaUrl(path);
  if (!url || !token) return null;
  return { uri: version ? `${url}?v=${version}` : url, headers: { Authorization: `Bearer ${token}` } };
}
