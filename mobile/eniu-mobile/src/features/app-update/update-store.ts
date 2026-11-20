import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Versión de esta app y aviso de "actualiza para seguir".
 *
 * La API conoce la versión por dos cabeceras que `@/lib/api` pone en cada
 * petición. Cuando la versión queda por debajo de la mínima, cualquier llamada
 * responde 426 y aquí se avisa a `UpdateGate`, que tapa la app con la pantalla
 * de actualizar. Vive fuera de React para que `api.ts` pueda avisar sin
 * depender de ningún contexto.
 */

export const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';

/** Sólo las tiendas tienen versión que controlar; la build web va siempre al día. */
export const STORE_PLATFORM = Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : null;

/** Cabeceras que identifican a la app ante la API (`client_version.py`). */
export function versionHeaders(): Record<string, string> {
  if (!STORE_PLATFORM) return {};
  return { 'X-Eniu-Platform': STORE_PLATFORM, 'X-Eniu-App-Version': APP_VERSION };
}

export type RequiredUpdate = {
  message?: string;
  minVersion?: string | null;
  storeUrl?: string | null;
};

type Listener = (update: RequiredUpdate) => void;

let required: RequiredUpdate | null = null;
const listeners = new Set<Listener>();

export const updateStore = {
  get: () => required,
  /** La API dijo que esta versión ya no se admite. */
  require(update: RequiredUpdate) {
    required = update;
    listeners.forEach((listener) => listener(update));
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};

/** Lee el cuerpo de un 426 de la API. */
export function requiredUpdateFrom(payload: unknown): RequiredUpdate {
  const data = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  const text = (value: unknown) => (typeof value === 'string' && value ? value : null);
  return {
    message: text(data.message) ?? undefined,
    minVersion: text(data.min_version),
    storeUrl: text(data.store_url),
  };
}
