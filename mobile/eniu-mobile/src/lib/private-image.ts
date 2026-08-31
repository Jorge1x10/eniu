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
  useEffect(() => {
    let cancelled = false;
    const readToken = () => { sessionStore.getAccessToken().then((value) => { if (!cancelled) setToken(value); }); };
    readToken();
    // El access token dura poco (ver JWT_ACCESS_TOKEN_EXPIRES en el backend) y se
    // refresca en segundo plano; sin esto la imagen se quedaba con el header
    // vencido y dejaba de cargar hasta desmontar y remontar la pantalla.
    const unsubscribe = sessionStore.subscribeToken(readToken);
    return () => { cancelled = true; unsubscribe(); };
  }, []);
  const url = resolveMediaUrl(path);
  if (!url || !token) return null;
  return { uri: version ? `${url}?v=${version}` : url, headers: { Authorization: `Bearer ${token}` } };
}
