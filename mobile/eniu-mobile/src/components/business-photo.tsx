import { useState } from 'react';
import { Image } from 'expo-image';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { ImageField } from '@/components/ui/image-field';
import { useEniuTheme } from '@/constants/eniu-theme';
import { useBusiness } from '@/features/business/business-context';
import { api, resolveMediaUrl } from '@/lib/api';
import { appendImage, pickImages, type ImageQuality, type PickedPicture } from '@/lib/image-file';
import { ImageIcon } from '@/components/ui/icons';
import type { Business } from '@/types/models';
import { useTranslation } from 'react-i18next';

/**
 * Foto del negocio: la misma que se sube desde la web. Guarda al instante en
 * lugar de esperar a un botón, porque es un solo campo y el usuario espera ver
 * el cambio en cuanto elige la imagen.
 */
export function BusinessPhotoField({ quality = 'alta', onError, compact = false }: { quality?: ImageQuality; onError?: (message: string) => void; /** Cuadro de 76 con el botón al lado, para Mi negocio. */ compact?: boolean }) {
  const { t } = useTranslation();

  const theme = useEniuTheme();
  const { selectedBusiness, updateBusiness } = useBusiness();
  // La URL de la foto no cambia al reemplazarla, así que sin esto expo-image
  // seguiría mostrando la anterior desde su caché.
  const [version, setVersion] = useState(0);
  const [working, setWorking] = useState(false);

  function fail(message: string) {
    if (onError) onError(message);
    else Alert.alert(t("No se pudo guardar la foto"), message);
  }

  async function send(fill: (form: FormData) => void) {
    if (!selectedBusiness) return;
    const form = new FormData();
    try {
      fill(form);
      const data = await api.patchForm<{ business: Business }>(`businesses/${selectedBusiness.id}`, form);
      updateBusiness(data.business);
      setVersion(Date.now());
    } catch (error) {
      fail(error instanceof Error ? error.message : t("Intenta nuevamente."));
    }
  }

  function upload(picture: PickedPicture) {
    return send((form) => appendImage(form, 'photo', picture));
  }

  function remove() {
    Alert.alert(t("Quitar foto"), t("¿Quieres quitar la foto de tu negocio?"), [
      { text: t("Cancelar"), style: 'cancel' },
      { text: t("Quitar"), style: 'destructive', onPress: () => send((form) => form.append('remove_photo', 'true')) },
    ]);
  }

  if (!selectedBusiness) return null;
  const url = resolveMediaUrl(selectedBusiness.photo_url);

  if (compact) {
    async function choose() {
      setWorking(true);
      try {
        const pictures = await pickImages({ limit: 1, quality });
        if (pictures?.[0]) await upload(pictures[0]);
      } catch (error) {
        fail(error instanceof Error ? error.message : t("Intenta nuevamente."));
      } finally {
        setWorking(false);
      }
    }
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <View style={{ width: 76, height: 76, borderRadius: 18, borderCurve: 'continuous', overflow: 'hidden', borderWidth: url ? 0 : 1.5, borderStyle: 'dashed', borderColor: theme.yellowPressed, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          {url ? <Image source={{ uri: version ? `${url}?v=${version}` : url }} style={{ width: '100%', height: '100%' }} contentFit="cover" accessibilityLabel={t("Foto del negocio")} /> : <ImageIcon color={theme.muted} size={22} />}
        </View>
        <View style={{ flex: 1, gap: 6, alignItems: 'flex-start' }}>
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <Pressable accessibilityRole="button" onPress={choose} disabled={working} style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, flexDirection: 'row', alignItems: 'center', gap: 8, opacity: working ? 0.6 : pressed ? 0.7 : 1 })}>
              {working ? <ActivityIndicator size="small" color={theme.text} /> : null}
              <Text style={{ color: theme.text, fontSize: 15, fontWeight: '700' }}>{url ? t("Cambiar foto") : t("Agregar foto")}</Text>
            </Pressable>
            {url ? (
              <Pressable accessibilityRole="button" onPress={remove} hitSlop={10}>
                <Text style={{ color: theme.danger, fontSize: 14, fontWeight: '700' }}>{t("Quitar")}</Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 18 }}>{t("Tu logo o la fachada. Se guarda al elegirla.")}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: 9 }}>
      <Text style={{ color: theme.text, fontSize: 13, fontWeight: '700' }}>{t("Foto del negocio")}</Text>
      <ImageField
        title="foto"
        emptyText={t("Sin foto del negocio")}
        source={url ? { uri: version ? `${url}?v=${version}` : url } : null}
        quality={quality}
        height={150}
        onPicked={upload}
        onRemove={remove}
        onError={fail}
        note="Es el logo o la fachada que identifica tu negocio. Se guarda al elegirla."
      />
    </View>
  );
}
