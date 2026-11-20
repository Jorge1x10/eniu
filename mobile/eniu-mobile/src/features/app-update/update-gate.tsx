import { PropsWithChildren, useEffect, useState } from 'react';
import { Alert, AppState, Linking, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { useEniuTheme } from '@/constants/eniu-theme';
import { api } from '@/lib/api';
import { localStore } from '@/lib/local-store';

import { APP_VERSION, RequiredUpdate, STORE_PLATFORM, updateStore } from './update-store';

type VersionStatus = {
  status: 'ok' | 'update_available' | 'update_required';
  min_version: string | null;
  latest_version: string | null;
  store_url: string | null;
};

/** Última versión por la que ya se sugirió actualizar, para no repetirlo en cada arranque. */
const PROMPTED_KEY = 'eniu_update_prompted_version';

/**
 * Pregunta a la API si esta versión sigue admitida, al abrir la app y cada
 * vez que vuelve del segundo plano.
 *
 * - `update_required`: tapa la app con una pantalla que sólo lleva a la
 *   tienda. Lo mismo pasa si cualquier petición responde 426 (`api.ts`).
 * - `update_available`: lo sugiere una vez por versión, sin bloquear.
 *
 * Si la consulta falla (sin red, servidor caído) no se hace nada: no se le
 * cierra la app a nadie por no haber podido preguntar.
 */
export function UpdateGate({ children }: PropsWithChildren) {
  const { t } = useTranslation();
  const [required, setRequired] = useState<RequiredUpdate | null>(updateStore.get());

  useEffect(() => updateStore.subscribe(setRequired), []);

  useEffect(() => {
    if (!STORE_PLATFORM) return;
    let checking = false;

    async function check() {
      if (checking || updateStore.get()) return;
      checking = true;
      try {
        const query = `platform=${STORE_PLATFORM}&version=${encodeURIComponent(APP_VERSION)}`;
        const data = await api.get<VersionStatus>(`app/version?${query}`);
        if (data.status === 'update_required') {
          updateStore.require({ minVersion: data.min_version, storeUrl: data.store_url });
        } else if (data.status === 'update_available' && data.latest_version) {
          await suggestUpdate(data.latest_version, data.store_url);
        }
      } catch {
        // Sin respuesta no se decide nada.
      } finally {
        checking = false;
      }
    }

    async function suggestUpdate(latest: string, storeUrl: string | null) {
      const prompted = await localStore.getItem(PROMPTED_KEY).catch(() => null);
      if (prompted === latest) return;
      await localStore.setItem(PROMPTED_KEY, latest).catch(() => undefined);
      Alert.alert(
        t("Hay una versión nueva de Eniu"),
        t("La versión {{version}} ya está disponible.", { version: latest }),
        [
          { text: t("Ahora no"), style: 'cancel' },
          ...(storeUrl ? [{ text: t("Actualizar"), onPress: () => Linking.openURL(storeUrl) }] : []),
        ],
      );
    }

    check();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => subscription.remove();
  }, [t]);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {required ? <UpdateRequiredScreen update={required} /> : null}
    </View>
  );
}

function UpdateRequiredScreen({ update }: { update: RequiredUpdate }) {
  const { t } = useTranslation();
  const theme = useEniuTheme();
  const insets = useSafeAreaInsets();
  const storeUrl = update.storeUrl;

  return (
    <View
      accessibilityViewIsModal
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: theme.background,
          justifyContent: 'center',
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
          gap: 16,
        },
      ]}
    >
      <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 28, fontWeight: '800', textAlign: 'center' }}>
        {t("Actualiza Eniu")}
      </Text>
      <Text selectable style={{ color: theme.muted, fontSize: 16, lineHeight: 23, textAlign: 'center' }}>
        {update.message || t("Hay una versión nueva de Eniu. Actualiza la app para seguir usándola.")}
      </Text>
      <Text selectable style={{ color: theme.muted, fontSize: 13, textAlign: 'center' }}>
        {update.minVersion
          ? t("Tienes la versión {{current}}. Se necesita la {{minimum}} o posterior.", { current: APP_VERSION, minimum: update.minVersion })
          : t("Tienes la versión {{current}}.", { current: APP_VERSION })}
      </Text>
      {storeUrl ? (
        <Button size="lg" onPress={() => Linking.openURL(storeUrl)} style={{ marginTop: 8 }}>
          {t("Actualizar ahora")}
        </Button>
      ) : null}
    </View>
  );
}
