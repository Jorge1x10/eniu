import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { ActivityIndicator, Linking, Pressable, ScrollView, Share, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DrawingBrandLine } from '@/components/brand-line';
import { Button } from '@/components/ui/button';
import { CheckIcon, CopyIcon, ExternalIcon, PrinterIcon, ShareIcon } from '@/components/ui/icons';
import { useEniuTheme } from '@/constants/eniu-theme';
import { useBusiness } from '@/features/business/business-context';
import { catalogueKeys } from '@/features/catalogues/catalogue-api';
import { useOnboarding } from '@/features/onboarding/onboarding-context';
import { getStarterMenu } from '@/features/onboarding/starter-menus';
import { deviceTimezone } from '@/lib/analytics-range';
import { ApiError, api } from '@/lib/api';
import { deviceCurrency } from '@/lib/regions';
import type { Business, Catalogue, Category, Product } from '@/types/models';
import { useTranslation } from 'react-i18next';

type Publication = { is_published: boolean; public_url?: string | null };

const STEP_LABELS = ['Creando tu negocio…', 'Armando tu menú…', 'Publicándolo…'];
const CATALOGUE_NAME = 'Menú principal';

/**
 * Crea el recurso reutilizando el que ya exista si el nombre choca.
 *
 * Un intento anterior pudo haber creado el menú o la categoría y fallado
 * después (una respuesta perdida, por ejemplo). Sin esto, "Reintentar" chocaba
 * para siempre contra el nombre único y no había forma de avanzar.
 */
async function createOrReuse<T extends { name: string }>(
  create: () => Promise<T>,
  list: () => Promise<T[]>,
  name: string,
): Promise<T> {
  try {
    return await create();
  } catch (requestError) {
    if (requestError instanceof ApiError && requestError.status === 409) {
      const existing = await list();
      const match = existing.find((item) => item.name === name) ?? existing[0];
      if (match) return match;
    }
    throw requestError;
  }
}

export default function OnboardingReadyScreen() {
  const { t } = useTranslation();

  const theme = useEniuTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { addBusiness } = useBusiness();
  const { draft, business, catalogue, setProvisioned } = useOnboarding();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  // Evita que StrictMode o un re-render dispare el alta dos veces.
  const startedRef = useRef(false);
  // Si el alta falla a la mitad, el reintento reutiliza el negocio ya creado en
  // lugar de dejar uno duplicado por cada intento.
  const businessRef = useRef<Business | null>(null);

  const provision = useCallback(async () => {
    setError('');
    try {
      setStep(0);
      let createdBusiness = businessRef.current;
      if (!createdBusiness) {
        // Moneda y zona salen del teléfono: sin esto todo negocio nace en
        // pesos mexicanos y en el huso de Ciudad de México, que sólo acierta
        // donde nació Eniu. Ambas se cambian después en Ajustes.
        createdBusiness = (await api.post<{ business: Business }>('businesses', {
          name: draft.businessName,
          currency: deviceCurrency(),
          timezone: deviceTimezone(),
        })).business;
        businessRef.current = createdBusiness;
        addBusiness(createdBusiness);
      }

      setStep(1);
      const cataloguesPath = `businesses/${createdBusiness.id}/catalogues`;
      const createdCatalogue = await createOrReuse<Catalogue>(
        async () => (await api.post<{ catalogue: Catalogue }>(cataloguesPath, { name: CATALOGUE_NAME })).catalogue,
        async () => (await api.get<{ catalogues: Catalogue[] }>(cataloguesPath)).catalogues,
        CATALOGUE_NAME,
      );

      if (draft.menuChoice === 'starter') {
        const starter = getStarterMenu(draft.businessType);
        const categoriesPath = `${cataloguesPath}/${createdCatalogue.id}/categories`;
        const productsPath = `${cataloguesPath}/${createdCatalogue.id}/products`;
        const category = await createOrReuse<Category>(
          async () => (await api.post<{ category: Category }>(categoriesPath, { name: starter.category })).category,
          async () => (await api.get<{ categories: Category[] }>(categoriesPath)).categories,
          starter.category,
        );
        // Un reintento no debe duplicar los productos que ya se sembraron.
        const existing = await api.get<{ products: Product[] }>(productsPath);
        const alreadyCreated = new Set(existing.products.map((product) => product.name));
        for (const product of starter.products) {
          if (alreadyCreated.has(product.name)) continue;
          await api.post<{ product: Product }>(productsPath, {
            name: product.name, description: product.description, price: product.price, category_id: category.id,
          });
        }
      }

      setStep(2);
      const published = await api.post<{ catalogue: Catalogue }>(`businesses/${createdBusiness.id}/catalogues/${createdCatalogue.id}/publish`);
      queryClient.setQueryData<{ catalogues: Catalogue[] }>(catalogueKeys.all(createdBusiness.id), { catalogues: [published.catalogue] });
      setProvisioned(createdBusiness, published.catalogue);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("No fue posible terminar la configuración."));
    }
  }, [addBusiness, draft.businessName, draft.businessType, draft.menuChoice, queryClient, setProvisioned]);

  useEffect(() => {
    if (startedRef.current || business) return;
    startedRef.current = true;
    provision();
  }, [business, provision]);

  const query = useQuery({
    queryKey: ['onboarding-publication', business?.id, catalogue?.id],
    queryFn: () => api.get<{ publication: Publication }>(`businesses/${business!.id}/catalogues/${catalogue!.id}/publication`),
    enabled: Boolean(business && catalogue),
  });
  const publicUrl = query.data?.publication.public_url;

  if (!draft.businessName || !draft.menuChoice) return <Redirect href="/(onboarding)/business" />;

  function retry() {
    startedRef.current = true;
    provision();
  }

  async function copyLink() {
    if (!publicUrl) return;
    setCopied(await Clipboard.setStringAsync(`${publicUrl}?src=copy`));
  }
  async function share() {
    if (publicUrl) await Share.share({ title: t("Mi menú digital"), message: publicUrl, url: publicUrl });
  }
  // TODO(diseño): la app no tiene una función de imprimir. Mientras tanto lleva
  // a "Publicar y compartir", donde el QR se descarga para imprimirlo.
  function printQr() {
    if (business && catalogue) router.replace({ pathname: '/(tabs)/(menus)/[catalogueId]/publication', params: { catalogueId: catalogue.id } });
  }

  const ON_DARK = theme.heroText;
  const ON_DARK_MUTED = theme.heroMuted;
  const darkButton = ({ pressed }: { pressed: boolean }) => ({
    flex: 1, minHeight: 50, borderRadius: 14, borderCurve: 'continuous' as const, flexDirection: 'row' as const, alignItems: 'center' as const,
    justifyContent: 'center' as const, gap: 8, backgroundColor: 'rgba(251,247,236,0.08)', borderWidth: 1, borderColor: 'rgba(251,247,236,0.14)',
    opacity: pressed ? 0.7 : 1,
  });

  return (
    <ScrollView contentInsetAdjustmentBehavior="never" contentContainerStyle={{ paddingHorizontal: 24, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 16, gap: 22, flexGrow: 1, backgroundColor: theme.authHero }}>
      {error ? (
        <>
          <Text accessibilityRole="header" style={{ color: ON_DARK, fontSize: 32, lineHeight: 35, fontWeight: '900', letterSpacing: -1.1, marginTop: 24 }}>{t("No pudimos terminar")}</Text>
          <Animated.View entering={FadeIn.duration(240)} style={{ borderRadius: 18, borderCurve: 'continuous', backgroundColor: 'rgba(251,247,236,0.06)', borderWidth: 1, borderColor: 'rgba(251,247,236,0.14)', padding: 18, gap: 14 }}>
            <Text style={{ color: ON_DARK, fontSize: 15, lineHeight: 22 }}>{error}</Text>
            <Button onPress={retry}>{t("Reintentar")}</Button>
          </Animated.View>
        </>
      ) : !publicUrl ? (
        <>
          <View style={{ alignItems: 'center', marginTop: 32 }}>
            <DrawingBrandLine color={theme.yellow} width={150} height={140} />
          </View>
          <Animated.View entering={FadeInDown.duration(320)} style={{ gap: 8 }}>
            <Text accessibilityRole="header" style={{ color: ON_DARK, fontSize: 32, lineHeight: 35, fontWeight: '900', letterSpacing: -1.1 }}>{t("Dejando todo listo")}</Text>
            <Text style={{ color: ON_DARK_MUTED, fontSize: 15, lineHeight: 22 }}>{t("Estamos creando tu negocio y tu primer menú. Tarda unos segundos.")}</Text>
          </Animated.View>
          <View accessibilityRole="list" style={{ gap: 14, marginTop: 8 }}>
            {STEP_LABELS.map((label, index) => {
              const done = index < step;
              const current = index === step;
              return (
                <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }} accessibilityLabel={`${t(label)} ${done ? t("Hecho") : current ? t("En curso") : t("Pendiente")}`}>
                  <View style={{ width: 28, height: 28, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? theme.yellow : 'transparent', borderWidth: done ? 0 : 2, borderColor: current ? theme.yellow : 'rgba(251,247,236,0.24)' }}>
                    {done ? <CheckIcon color={theme.onYellow} size={13} /> : current ? <ActivityIndicator size="small" color={theme.yellow} /> : null}
                  </View>
                  <Text style={{ color: done || current ? ON_DARK : ON_DARK_MUTED, fontSize: 16, fontWeight: current ? '800' : '600' }}>{t(label)}</Text>
                </View>
              );
            })}
          </View>
        </>
      ) : (
        <>
          <Animated.View entering={FadeInDown.duration(320)} style={{ gap: 12 }}>
            <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(61,191,107,0.16)' }}>
              <View style={{ width: 7, height: 7, borderRadius: 99, backgroundColor: '#3DBF6B' }} />
              <Text style={{ color: '#3DBF6B', fontSize: 13, fontWeight: '800' }}>{t("Publicado")}</Text>
            </View>
            <Text accessibilityRole="header" style={{ color: ON_DARK, fontSize: 32, lineHeight: 35, fontWeight: '900', letterSpacing: -1.1 }}>
              {t("Tu menú ya está")} <Text style={{ color: theme.yellow }}>{t("en línea")}</Text>
            </Text>
            <Text style={{ color: ON_DARK_MUTED, fontSize: 15, lineHeight: 22 }}>{t("Imprime este código, pégalo en la mesa y tus clientes lo abren desde su teléfono.")}</Text>
          </Animated.View>

          {/* TODO(diseño): el diseño pone el ícono del negocio al centro del QR; un
              negocio recién creado todavía no tiene foto. */}
          <Animated.View entering={FadeInDown.duration(380).delay(80)} style={{ borderRadius: 24, borderCurve: 'continuous', backgroundColor: theme.ticketPaper, padding: 20, alignItems: 'center', gap: 14 }}>
            <View accessible accessibilityRole="image" accessibilityLabel={t("Código QR de tu menú")} style={{ backgroundColor: '#FFFFFF', borderRadius: 18, borderCurve: 'continuous', padding: 14 }}>
              <QRCode value={`${publicUrl}?src=qr`} size={184} color="#111111" backgroundColor="#FFFFFF" />
            </View>
            <View style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, backgroundColor: '#F2EBD8', paddingLeft: 14 }}>
              <Text selectable numberOfLines={1} style={{ flex: 1, color: theme.ticketInk, fontSize: 13, fontWeight: '600' }}>{publicUrl.replace(/^https?:\/\//, '')}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={copied ? t("Enlace copiado") : t("Copiar enlace")} onPress={copyLink} style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
                {copied ? <CheckIcon color={theme.ticketInk} size={15} /> : <CopyIcon color={theme.ticketInk} size={18} />}
              </Pressable>
            </View>
          </Animated.View>

          <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(255,224,90,0.14)' }}>
            <Text style={{ color: theme.yellow, fontSize: 13, fontWeight: '700' }}>{t("Primer logro desbloqueado: menú publicado")}</Text>
          </View>
        </>
      )}

      <View style={{ flex: 1, minHeight: 12 }} />
      {publicUrl ? (
        <View style={{ gap: 10 }}>
          <Button size="lg" onPress={() => Linking.openURL(publicUrl)} trailingIcon={<ExternalIcon color={theme.onYellow} size={17} />}>{t("Ver mi menú")}</Button>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable accessibilityRole="button" onPress={share} style={darkButton}><ShareIcon color={ON_DARK} size={16} /><Text style={{ color: ON_DARK, fontSize: 15, fontWeight: '700' }}>{t("Compartir")}</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={printQr} style={darkButton}><PrinterIcon color={ON_DARK} size={18} /><Text style={{ color: ON_DARK, fontSize: 15, fontWeight: '700' }}>{t("Imprimir QR")}</Text></Pressable>
          </View>
          <Pressable accessibilityRole="link" onPress={() => router.replace('/(tabs)/(home)')} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: ON_DARK_MUTED, fontSize: 15, fontWeight: '700' }}>{t("Ir a mi panel")}</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}
