import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, PURCHASES_ERROR_CODE, type PurchasesPackage } from 'react-native-purchases';

/**
 * Compras dentro de la app (App Store / Google Play) vía RevenueCat.
 *
 * El servidor sigue siendo la fuente de verdad del plan: RevenueCat le avisa
 * por webhook (`/api/billing/revenuecat/webhook`) y la app vuelve a leer
 * `/auth/me`. Aquí sólo se cobra y se sincroniza la identidad; nada de lo que
 * esta capa decida desbloquea funciones por su cuenta.
 */
const API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  default: undefined,
});

/**
 * Sin llave configurada la app funciona igual, sólo que sin ruta de compra.
 * Es el estado normal mientras la cuenta de RevenueCat no está lista, y
 * también el de la versión web, donde no hay tienda que cobre.
 */
export function purchasesAvailable() {
  return Boolean(API_KEY) && Platform.OS !== 'web';
}

let configured = false;

function ensureConfigured() {
  if (configured || !purchasesAvailable()) return configured;
  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);
  Purchases.configure({ apiKey: API_KEY! });
  configured = true;
  return true;
}

/**
 * Ata las compras a la cuenta de Eniu.
 *
 * El `appUserID` **tiene** que ser el id de usuario del backend: es lo único
 * con lo que el webhook sabe a quién aplicarle la compra. Si aquí se mandara
 * otra cosa, el cobro ocurriría y el plan no se activaría nunca.
 */
export async function identifyPurchases(userId: string) {
  if (!ensureConfigured()) return;
  try {
    await Purchases.logIn(userId);
  } catch (error) {
    // Que falle la identificación no debe tumbar la sesión: la app sigue
    // funcionando, sólo que sin poder comprar hasta el próximo intento.
    console.warn('RevenueCat logIn failed', error);
  }
}

/** Desata la compra de la cuenta al cerrar sesión, para no dejarla en la siguiente. */
export async function forgetPurchases() {
  if (!ensureConfigured()) return;
  try {
    await Purchases.logOut();
  } catch (error) {
    console.warn('RevenueCat logOut failed', error);
  }
}

/**
 * Por qué no hay nada que ofrecer. Cada valor es un error de configuración
 * distinto en el panel de RevenueCat, y se distinguen a propósito: sin esto,
 * "no hay oferta", "la oferta está vacía" y "la llamada falló" se ven todos
 * igual en pantalla y no hay forma de saber qué arreglar.
 */
export type OfferingProblem =
  /** El proyecto no tiene ninguna oferta, o la tienda no devolvió los productos. */
  | 'sin-ofertas'
  /** Hay ofertas, pero ninguna marcada como "Current" en RevenueCat. */
  | 'sin-oferta-actual'
  /** La oferta actual existe pero no tiene ningún paquete con producto. */
  | 'oferta-vacia';

export type OfferingResult =
  | { item: PurchasesPackage; problem: null }
  | { item: null; problem: OfferingProblem };

/**
 * El paquete que se ofrece hoy. Se toma de la oferta activa del panel de
 * RevenueCat, no de una lista escrita aquí: así cambiar de producto o de
 * precio no obliga a publicar una versión nueva en las tiendas.
 *
 * Un producto sólo llega hasta aquí si App Store Connect lo devuelve, y eso
 * exige el Contrato de Apps de Pago activo y el producto al menos en "Listo
 * para enviar". Mientras falte cualquiera de las dos, la oferta viaja sin
 * paquetes y el resultado es `oferta-vacia`, no un error.
 */
export async function currentPackage(): Promise<OfferingResult> {
  if (!ensureConfigured()) return { item: null, problem: 'sin-ofertas' };
  let offerings;
  try {
    offerings = await Purchases.getOfferings();
  } catch (error) {
    // El SDK trae `code` y `underlyingErrorMessage`, que es donde viene lo que
    // de verdad falló (llave inválida, producto que la tienda no devuelve, la
    // cuenta sin configurar). Sin registrarlo, la pantalla sólo puede decir
    // "no se pudo" y no hay nada que investigar.
    const detail = error as { code?: string; message?: string; underlyingErrorMessage?: string };
    console.warn('RevenueCat: getOfferings falló', {
      code: detail?.code,
      message: detail?.message,
      underlying: detail?.underlyingErrorMessage,
    });
    throw error;
  }
  const current = offerings.current;
  if (!current) {
    const problem = Object.keys(offerings.all).length ? 'sin-oferta-actual' : 'sin-ofertas';
    console.warn('RevenueCat: sin oferta utilizable', { problem, ofertas: Object.keys(offerings.all) });
    return { item: null, problem };
  }
  const item = current.availablePackages[0];
  if (!item) {
    console.warn('RevenueCat: la oferta actual no trae paquetes', { oferta: current.identifier });
    return { item: null, problem: 'oferta-vacia' };
  }
  return { item, problem: null };
}

export type PurchaseOutcome = 'purchased' | 'cancelled';

/**
 * Lanza la compra. Devuelve `cancelled` cuando la persona cierra la hoja de
 * pago, que no es un error y no debe mostrarse como tal.
 */
export async function purchase(item: PurchasesPackage): Promise<PurchaseOutcome> {
  ensureConfigured();
  try {
    await Purchases.purchasePackage(item);
    return 'purchased';
  } catch (error) {
    const code = (error as { code?: string }).code;
    if ((error as { userCancelled?: boolean }).userCancelled || code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return 'cancelled';
    }
    throw error;
  }
}

/**
 * Restaurar compras. Apple lo exige visible en cualquier app con suscripción:
 * quien cambia de teléfono o reinstala tiene que poder recuperar lo que pagó
 * sin volver a pagarlo.
 */
export async function restore() {
  ensureConfigured();
  const info = await Purchases.restorePurchases();
  return Object.keys(info.entitlements.active).length > 0;
}
