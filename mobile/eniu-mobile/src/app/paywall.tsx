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
import { CheckIcon, CloseIcon } from '@/components/ui/icons';
import { useEniuTheme } from '@/constants/eniu-theme';
import { PRIVACY_URL, TERMS_URL } from '@/constants/legal';
import { useAuth } from '@/features/auth/auth-context';
import { usePlan } from '@/features/auth/use-plan';
import { currentPackage, purchase, purchasesAvailable, restore } from '@/features/billing/purchases';
import { api } from '@/lib/api';
import type { User } from '@/types/models';

/** Lo que el plan de pago desbloquea, en lo que le cambia el día a quien lo usa. */
const BENEFITS = [
  'Las 13 plantillas y todas las tipografías',
  'Portada, fondos y pantalla de bienvenida',
  'Promociones para resaltar productos',
  'Productos ilimitados en cada menú',
  'Analíticas de visitas y escaneos',
  'Sin la marca de Eniu en tu menú',
];

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

  const item = offering.data ?? null;
  // Quien ya paga por la web no debe poder comprar aquí: se le cobraría dos
  // veces, y la suscripción de Stripe no se puede cancelar desde la tienda.
  const paysOnWeb = !isFree && plan?.provider === 'stripe';

  return (
    <ScrollView contentContainerStyle={{ padding: 22, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40, gap: 20, backgroundColor: theme.background, flexGrow: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Cerrar")}
          onPress={() => router.back()}
          style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, opacity: pressed ? 0.7 : 1 })}
        >
          <CloseIcon color={theme.text} size={16} />
        </Pressable>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ color: theme.text, fontSize: 27, fontWeight: '900', lineHeight: 33 }}>{t("Lleva tu menú más lejos")}</Text>
        <Text style={{ color: theme.muted, fontSize: 14, lineHeight: 21 }}>{t("Desbloquea el diseño completo y quita los límites del plan gratuito.")}</Text>
      </View>

      <View style={{ gap: 11, padding: 18, borderRadius: 20, borderCurve: 'continuous', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}>
        {BENEFITS.map((benefit) => (
          <View key={benefit} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <CheckIcon color={theme.yellowPressed} size={15} />
            <Text style={{ color: theme.text, fontSize: 14, lineHeight: 20, flex: 1 }}>{t(benefit)}</Text>
          </View>
        ))}
      </View>

      <Feedback message={error} />

      {paysOnWeb ? (
        <View style={{ padding: 16, borderRadius: 16, borderCurve: 'continuous', backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border, gap: 6 }}>
          <Text style={{ color: theme.text, fontSize: 14, fontWeight: '800' }}>{t("Ya tienes una suscripción activa")}</Text>
          <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 19 }}>{t("La contrataste desde la web. Adminístrala desde ahí para no pagar dos veces.")}</Text>
        </View>
      ) : !purchasesAvailable() ? (
        <View style={{ padding: 16, borderRadius: 16, borderCurve: 'continuous', backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border }}>
          <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 19 }}>{t("Las compras dentro de la app todavía no están disponibles. Puedes contratar tu plan desde la web.")}</Text>
        </View>
      ) : offering.isLoading ? (
        <Text style={{ color: theme.muted, fontSize: 13 }}>{t("Cargando el precio…")}</Text>
      ) : item ? (
        <View style={{ gap: 12 }}>
          {/* El precio y el periodo se toman de la tienda, nunca escritos a
              mano: es lo que de verdad se le va a cobrar y en su moneda. */}
          <View style={{ alignItems: 'center', gap: 3 }}>
            <Text style={{ color: theme.text, fontSize: 25, fontWeight: '900' }}>{item.product.priceString}</Text>
            <Text style={{ color: theme.muted, fontSize: 13 }}>{item.product.subscriptionPeriod === 'P1Y' ? t("por año") : t("por mes")}</Text>
          </View>
          <Button loading={busy} onPress={() => buy(item)}>{t("Suscribirme")}</Button>
          <Text style={{ color: theme.muted, fontSize: 11.5, lineHeight: 17, textAlign: 'center' }}>
            {t("La suscripción se renueva sola hasta que la canceles desde los ajustes de tu tienda.")}
          </Text>
        </View>
      ) : (
        <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 19 }}>{t("No hay ningún plan disponible en este momento. Inténtalo más tarde.")}</Text>
      )}

      <View style={{ flex: 1 }} />

      {/* Apple exige las tres cosas visibles: restaurar compras, términos y
          privacidad. Sin ellas la revisión rechaza la app. */}
      <View style={{ gap: 14, alignItems: 'center' }}>
        <Pressable accessibilityRole="button" disabled={busy || !purchasesAvailable()} onPress={restorePurchases} hitSlop={8}>
          <Text style={{ color: theme.yellowPressed, fontSize: 13.5, fontWeight: '800', opacity: purchasesAvailable() ? 1 : 0.5 }}>{t("Restaurar compras")}</Text>
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 18 }}>
          <Pressable accessibilityRole="link" onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)} hitSlop={8}>
            <Text style={{ color: theme.muted, fontSize: 12, textDecorationLine: 'underline' }}>{t("Términos de uso")}</Text>
          </Pressable>
          <Pressable accessibilityRole="link" onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)} hitSlop={8}>
            <Text style={{ color: theme.muted, fontSize: 12, textDecorationLine: 'underline' }}>{t("Aviso de privacidad")}</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
