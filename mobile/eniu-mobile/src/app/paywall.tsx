import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PurchasesPackage } from 'react-native-purchases';
import { useTranslation } from 'react-i18next';

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
import { useEniuTheme } from '@/constants/eniu-theme';
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

export default function PaywallScreen() {
  const { t } = useTranslation();

  const theme = useEniuTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { setUser } = useAuth();
  const { plan, isFree } = usePlan();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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

  /**
   * Un fallo de red y una oferta mal configurada no son lo mismo, pero para
   * quien mira la pantalla acaban en el mismo sitio: no hay precio. Se
   * distinguen en el texto y ambos ofrecen reintentar, que es lo único que
   * esta pantalla puede hacer al respecto.
   */
  function renderOfferingProblem() {
    const message = offering.isError
      ? t("No pudimos cargar el precio. Revisa tu conexión.")
      : t(PROBLEM_MESSAGE[offering.data?.problem ?? 'sin-ofertas']);
    return (
      <View style={{ padding: 18, borderRadius: 18, borderCurve: 'continuous', backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border, gap: 12 }}>
        <Text style={{ color: theme.muted, fontSize: 13.5, lineHeight: 20 }}>{message}</Text>
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
        <View style={{ padding: 22, borderRadius: 24, borderCurve: 'continuous', backgroundColor: theme.yellow, gap: 10 }}>
          <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: theme.onYellow }}>
            <StarIcon color={theme.yellow} size={12} />
            <Text style={{ color: theme.yellow, fontSize: 11, fontWeight: '900', letterSpacing: 0.8 }}>{t("PLAN COMPLETO")}</Text>
          </View>
          <Text style={{ color: theme.onYellow, fontSize: 30, fontWeight: '900', lineHeight: 35, letterSpacing: -0.5 }}>{t("Lleva tu menú más lejos")}</Text>
          <Text style={{ color: theme.onYellow, fontSize: 14.5, lineHeight: 21, opacity: 0.72 }}>{t("Desbloquea el diseño completo y quita los límites del plan gratuito.")}</Text>
        </View>

        <View style={{ gap: 10 }}>
          <Text style={{ color: theme.muted, fontSize: 11.5, fontWeight: '800', letterSpacing: 0.9 }}>{t("TODO LO QUE INCLUYE")}</Text>
          <View style={{ borderRadius: 20, borderCurve: 'continuous', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' }}>
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
          <View style={{ padding: 18, borderRadius: 18, borderCurve: 'continuous', backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border, gap: 6 }}>
            <Text style={{ color: theme.text, fontSize: 14.5, fontWeight: '800' }}>{t("Ya tienes una suscripción activa")}</Text>
            <Text style={{ color: theme.muted, fontSize: 13.5, lineHeight: 20 }}>{t("La contrataste desde la web. Adminístrala desde ahí para no pagar dos veces.")}</Text>
          </View>
        ) : !purchasesAvailable() ? (
          <View style={{ padding: 18, borderRadius: 18, borderCurve: 'continuous', backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border }}>
            <Text style={{ color: theme.muted, fontSize: 13.5, lineHeight: 20 }}>{t("Las compras dentro de la app todavía no están disponibles. Puedes contratar tu plan desde la web.")}</Text>
          </View>
        ) : offering.isLoading ? (
          <View style={{ padding: 18, borderRadius: 18, borderCurve: 'continuous', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}>
            <Text style={{ color: theme.muted, fontSize: 13.5 }}>{t("Cargando el precio…")}</Text>
          </View>
        ) : item ? (
          /* El precio y el periodo se toman de la tienda, nunca escritos a
             mano: es lo que de verdad se le va a cobrar y en su moneda. */
          <View style={{ padding: 18, borderRadius: 20, borderCurve: 'continuous', backgroundColor: theme.surface, borderWidth: 2, borderColor: theme.yellow, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 7 }}>
              <Text style={{ color: theme.text, fontSize: 32, fontWeight: '900', letterSpacing: -0.8 }}>{item.product.priceString}</Text>
              <Text style={{ color: theme.muted, fontSize: 14, fontWeight: '700', paddingBottom: 5 }}>
                {item.product.subscriptionPeriod === 'P1Y' ? t("por año") : t("por mes")}
              </Text>
            </View>
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
