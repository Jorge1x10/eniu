import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PurchasesPackage } from 'react-native-purchases';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { Button } from '@/components/ui/button';
import { Feedback } from '@/components/ui/feedback';
import {
  CloseIcon,
  EyeIcon,
  ImageIcon,
  PaletteIcon,
  PlusIcon,
  StarIcon,
  TagIcon,
} from '@/components/ui/icons';
import { cardStyle, useEniuTheme } from '@/constants/eniu-theme';
import { PRIVACY_URL, TERMS_URL } from '@/constants/legal';
import { useAuth } from '@/features/auth/auth-context';
import { usePlan } from '@/features/auth/use-plan';
import {
  currentPackage,
  purchase,
  purchasesAvailable,
  restore,
  type OfferingProblem,
} from '@/features/billing/purchases';
import { api } from '@/lib/api';
import type { User } from '@/types/models';

/**
 * Lo que el plan de pago desbloquea, en lo que le cambia el día a quien lo
 * usa. Cada uno lleva su icono: una lista de seis palomitas idénticas se lee
 * como letra chica, y esto es lo único que sostiene la decisión de pagar.
 */
const BENEFITS = [
  { icon: PaletteIcon, label: 'Las 13 plantillas y todas las tipografías' },
  { icon: ImageIcon, label: 'Portada, fondos y pantalla de bienvenida' },
  { icon: TagIcon, label: 'Promociones para resaltar productos' },
  { icon: PlusIcon, label: 'Productos ilimitados en cada menú' },
  { icon: EyeIcon, label: 'Analíticas de visitas y escaneos' },
  { icon: StarIcon, label: 'Sin la marca de Eniu en tu menú' },
] as const;

/**
 * Qué decirle a quien abre el paywall y no hay nada que venderle. Son fallas
 * de configuración distintas, y mientras no se resuelvan nadie puede pagar,
 * así que el texto dice qué pasa en vez de un "inténtalo más tarde" que no
 * lleva a ningún lado.
 */
const PROBLEM_MESSAGE: Record<OfferingProblem, string> = {
  'sin-ofertas': 'Todavía no podemos mostrarte el precio. La tienda no está devolviendo el plan.',
  'sin-oferta-actual': 'Todavía no podemos mostrarte el precio. No hay ninguna oferta activa.',
  'oferta-vacia': 'Todavía no podemos mostrarte el precio. El plan aún no está disponible en la tienda.',
};

/**
 * Textura del bloque de promesa: dos círculos claros y muy transparentes en la
 * esquina, que le dan profundidad sin competir con el texto.
 *
 * La primera versión usaba un degradado en SVG con `width="100%"`, y no llenaba
 * la tarjeta: el porcentaje se resolvía contra un lienzo que no coincidía con
 * la caja, y quedaba amarillo en una parte y crema en el resto. Vistas normales
 * con `position: absolute` no tienen ese problema — el fondo plano lo pinta la
 * tarjeta y estos círculos sólo lo matizan.
 */
function HeroBackdrop() {
  return (
    <>
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: -46, right: -30, width: 150, height: 150, borderRadius: 999, backgroundColor: '#FFFFFF', opacity: 0.24 }}
      />
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: 74, right: -54, width: 104, height: 104, borderRadius: 999, backgroundColor: '#FFFFFF', opacity: 0.14 }}
      />
    </>
  );
}

/**
 * Lo que la tienda ofrece de entrada, si ofrece algo. Nunca se escribe a mano:
 * prometer una prueba que Apple no va a dar es la clase de cosa por la que
 * rebotan una app, y además se le estaría mintiendo a quien va a pagar. Si el
 * producto no trae `introPrice`, no se dice nada.
 */
function introLabel(item: PurchasesPackage, t: TFunction): string | null {
  const intro = item.product.introPrice;
  if (!intro) return null;
  // Sin `count`: pasarlo activaría la pluralización de i18next, que este
  // proyecto no usa en ninguna clave. El singular se elige aquí y a la vista.
  const n = intro.periodNumberOfUnits;
  const unit = {
    DAY: n === 1 ? t("día") : t("días"),
    WEEK: n === 1 ? t("semana") : t("semanas"),
    MONTH: n === 1 ? t("mes") : t("meses"),
    YEAR: n === 1 ? t("año") : t("años"),
  }[intro.periodUnit];
  if (!unit) return null;
  return intro.price === 0
    ? t("{{n}} {{unit}} gratis", { n, unit })
    : t("{{price}} los primeros {{n}} {{unit}}", { price: intro.priceString, n, unit });
}

export default function PaywallScreen() {
  const { t } = useTranslation();

  const theme = useEniuTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { setUser } = useAuth();
  const { plan, isFree } = usePlan();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showDetail, setShowDetail] = useState(false);

  const offering = useQuery({
    queryKey: ['revenuecat-package'],
    queryFn: () => currentPackage(),
    enabled: purchasesAvailable(),
    retry: 0,
  });

  /**
   * El plan lo dicta el backend, no el SDK: tras comprar hay que volver a
   * leerlo. RevenueCat avisa al servidor por webhook, así que puede tardar un
   * instante en reflejarse.
   */
  async function refreshPlan() {
    const data = await api.get<{ user: User }>('auth/me');
    setUser(data.user);
    await queryClient.invalidateQueries();
  }

  async function buy(item: PurchasesPackage) {
    setBusy(true); setError('');
    try {
      const outcome = await purchase(item);
      if (outcome === 'cancelled') return;
      await refreshPlan();
      Alert.alert(t("¡Listo!"), t("Tu plan está activo. Ya puedes usar todo lo que incluye."), [{ text: t("Entendido"), onPress: () => router.back() }]);
    } catch (purchaseError) {
      setError(purchaseError instanceof Error ? purchaseError.message : t("No fue posible completar la compra."));
    } finally {
      setBusy(false);
    }
  }

  async function restorePurchases() {
    setBusy(true); setError('');
    try {
      const recovered = await restore();
      await refreshPlan();
      Alert.alert(
        recovered ? t("Compras restauradas") : t("No encontramos compras"),
        recovered ? t("Recuperamos tu suscripción en esta cuenta.") : t("No hay ninguna suscripción anterior con esta cuenta de la tienda."),
      );
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : t("No fue posible restaurar tus compras."));
    } finally {
      setBusy(false);
    }
  }

  const item = offering.data?.item ?? null;
  // Quien ya paga por la web no debe poder comprar aquí: se le cobraría dos
  // veces, y la suscripción de Stripe no se puede cancelar desde la tienda.
  const paysOnWeb = !isFree && plan?.provider === 'stripe';
  const canBuy = Boolean(item) && !paysOnWeb;
  const intro = item ? introLabel(item, t) : null;

  /**
   * Un fallo de red y una oferta mal configurada no son lo mismo, pero para
   * quien mira la pantalla acaban en el mismo sitio: no hay precio. Se
   * distinguen en el texto y ambos ofrecen reintentar, que es lo único que
   * esta pantalla puede hacer al respecto.
   */
  function renderOfferingProblem() {
    // El texto del SDK es lo que de verdad dice qué está mal, pero viene en
    // inglés y hablando de paneles que quien usa la app no administra. Va
    // detrás de "Ver detalle técnico": arriba queda una frase que cualquiera
    // entiende, y el detalle sigue a un toque para quien lo necesite.
    const detail = offering.error instanceof Error ? offering.error.message.trim() : '';
    const message = offering.isError
      ? t("Todavía no podemos mostrarte el precio. Vuelve a intentarlo en un momento.")
      : t(PROBLEM_MESSAGE[offering.data?.problem ?? 'sin-ofertas']);
    return (
      <View style={{ ...cardStyle(theme, 18), backgroundColor: theme.surfaceAlt, padding: 18, gap: 12 }}>
        <Text style={{ color: theme.muted, fontSize: 13.5, lineHeight: 20 }}>{message}</Text>
        {detail ? (
          <>
            <Pressable accessibilityRole="button" onPress={() => setShowDetail((previous) => !previous)} hitSlop={6}>
              <Text style={{ color: theme.yellowPressed, fontSize: 12.5, fontWeight: '800' }}>
                {showDetail ? t("Ocultar detalle técnico") : t("Ver detalle técnico")}
              </Text>
            </Pressable>
            {showDetail ? (
              <Text selectable style={{ color: theme.muted, fontSize: 11.5, lineHeight: 17, opacity: 0.85 }}>{detail}</Text>
            ) : null}
          </>
        ) : null}
        <Button variant="secondary" loading={offering.isFetching} onPress={() => offering.refetch()}>{t("Reintentar")}</Button>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: insets.top + 8, paddingBottom: 28, gap: 18 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1 }} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Cerrar")}
            onPress={() => router.back()}
            style={({ pressed }) => ({ width: 38, height: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, opacity: pressed ? 0.7 : 1 })}
          >
            <CloseIcon color={theme.text} size={15} />
          </Pressable>
        </View>

        {/* El amarillo de marca sostiene la promesa. Es el único bloque de
            color saturado de la pantalla, para que la vista caiga aquí. */}
        <View style={{ padding: 24, borderRadius: 26, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: theme.yellow, gap: 10, shadowColor: '#8A6D00', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.22, shadowRadius: 22, elevation: 6 }}>
          <HeroBackdrop />
          <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: theme.onYellow }}>
            <StarIcon color={theme.yellow} size={12} />
            <Text style={{ color: theme.yellow, fontSize: 11, fontWeight: '900', letterSpacing: 0.8 }}>{t("PLAN COMPLETO")}</Text>
          </View>
          <Text style={{ color: theme.onYellow, fontSize: 32, fontWeight: '900', lineHeight: 36, letterSpacing: -0.8 }}>{t("Lleva tu menú más lejos")}</Text>
          <Text style={{ color: theme.onYellow, fontSize: 14.5, lineHeight: 21, opacity: 0.66 }}>{t("Desbloquea el diseño completo y quita los límites del plan gratuito.")}</Text>
        </View>

        <View style={{ gap: 10 }}>
          <Text style={{ color: theme.muted, fontSize: 11.5, fontWeight: '800', letterSpacing: 0.9 }}>{t("TODO LO QUE INCLUYE")}</Text>
          <View style={{ ...cardStyle(theme, 20), overflow: 'hidden' }}>
            {BENEFITS.map(({ icon: Icon, label }, index) => (
              <View
                key={label}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 16, paddingVertical: 13, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: theme.border }}
              >
                <View style={{ width: 34, height: 34, borderRadius: 11, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surfaceAlt }}>
                  <Icon color={theme.yellowPressed} size={17} />
                </View>
                <Text style={{ color: theme.text, fontSize: 14.5, lineHeight: 20, flex: 1 }}>{t(label)}</Text>
              </View>
            ))}
          </View>
        </View>

        <Feedback message={error} />

        {paysOnWeb ? (
          <View style={{ ...cardStyle(theme, 18), backgroundColor: theme.surfaceAlt, padding: 18, gap: 6 }}>
            <Text style={{ color: theme.text, fontSize: 14.5, fontWeight: '800' }}>{t("Ya tienes una suscripción activa")}</Text>
            <Text style={{ color: theme.muted, fontSize: 13.5, lineHeight: 20 }}>{t("La contrataste desde la web. Adminístrala desde ahí para no pagar dos veces.")}</Text>
          </View>
        ) : !purchasesAvailable() ? (
          <View style={{ ...cardStyle(theme, 18), backgroundColor: theme.surfaceAlt, padding: 18 }}>
            <Text style={{ color: theme.muted, fontSize: 13.5, lineHeight: 20 }}>{t("Las compras dentro de la app todavía no están disponibles. Puedes contratar tu plan desde la web.")}</Text>
          </View>
        ) : offering.isLoading ? (
          <View style={{ ...cardStyle(theme, 18), padding: 18 }}>
            <Text style={{ color: theme.muted, fontSize: 13.5 }}>{t("Cargando el precio…")}</Text>
          </View>
        ) : item ? (
          /* El precio y el periodo se toman de la tienda, nunca escritos a
             mano: es lo que de verdad se le va a cobrar y en su moneda. */
          <View style={{ ...cardStyle(theme, 20), padding: 18, borderWidth: 2, borderColor: theme.yellow, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 7 }}>
                <Text style={{ color: theme.text, fontSize: 34, fontWeight: '900', letterSpacing: -1 }}>{item.product.priceString}</Text>
                <Text style={{ color: theme.muted, fontSize: 14, fontWeight: '700', paddingBottom: 6 }}>
                  {item.product.subscriptionPeriod === 'P1Y' ? t("por año") : t("por mes")}
                </Text>
              </View>
              {/* Sólo aparece si la tienda de verdad ofrece prueba o descuento. */}
              {intro ? (
                <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: theme.yellow }}>
                  <Text style={{ color: theme.onYellow, fontSize: 11.5, fontWeight: '900' }}>{intro}</Text>
                </View>
              ) : null}
            </View>
            <View style={{ height: 1, backgroundColor: theme.border }} />
            <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 19 }}>{t("Cancela cuando quieras desde los ajustes de tu tienda.")}</Text>
          </View>
        ) : (
          renderOfferingProblem()
        )}
      </ScrollView>

      {/* El botón vive fuera del scroll: la lista de beneficios puede empujarlo
          fuera de pantalla en teléfonos chicos, y un paywall cuya única acción
          hay que ir a buscar no se usa. Apple exige además que restaurar
          compras, términos y privacidad estén visibles. */}
      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: insets.bottom + 14, gap: 12, backgroundColor: theme.background, borderTopWidth: 1, borderTopColor: theme.border }}>
        {canBuy ? (
          <>
            <Button loading={busy} onPress={() => buy(item!)}>{t("Suscribirme")}</Button>
            <Text style={{ color: theme.muted, fontSize: 11.5, lineHeight: 17, textAlign: 'center' }}>
              {t("La suscripción se renueva sola hasta que la canceles desde los ajustes de tu tienda.")}
            </Text>
          </>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Pressable accessibilityRole="button" disabled={busy || !purchasesAvailable()} onPress={restorePurchases} hitSlop={8}>
            <Text style={{ color: theme.yellowPressed, fontSize: 13, fontWeight: '800', opacity: purchasesAvailable() ? 1 : 0.5 }}>{t("Restaurar compras")}</Text>
          </Pressable>
          <Pressable accessibilityRole="link" onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)} hitSlop={8}>
            <Text style={{ color: theme.muted, fontSize: 12, textDecorationLine: 'underline' }}>{t("Términos de uso")}</Text>
          </Pressable>
          <Pressable accessibilityRole="link" onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)} hitSlop={8}>
            <Text style={{ color: theme.muted, fontSize: 12, textDecorationLine: 'underline' }}>{t("Aviso de privacidad")}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
