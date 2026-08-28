import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { ImageField } from '@/components/ui/image-field';
import { useEniuTheme } from '@/constants/eniu-theme';
import { useBusiness } from '@/features/business/business-context';
import { api, resolveMediaUrl } from '@/lib/api';
import { appendImage, type ImageQuality, type PickedPicture } from '@/lib/image-file';
import type { Business } from '@/types/models';

/**
 * Foto del negocio: la misma que se sube desde la web. Guarda al instante en
 * lugar de esperar a un botón, porque es un solo campo y el usuario espera ver
 * el cambio en cuanto elige la imagen.
 */
export function BusinessPhotoField({ quality = 'alta', onError }: { quality?: ImageQuality; onError?: (message: string) => void }) {
  const theme = useEniuTheme();
  const { selectedBusiness, updateBusiness } = useBusiness();
  // La URL de la foto no cambia al reemplazarla, así que sin esto expo-image
  // seguiría mostrando la anterior desde su caché.
  const [version, setVersion] = useState(0);

  function fail(message: string) {
    if (onError) onError(message);
    else Alert.alert('No se pudo guardar la foto', message);
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
      fail(error instanceof Error ? error.message : 'Intenta nuevamente.');
    }
  }

  function upload(picture: PickedPicture) {
    return send((form) => appendImage(form, 'photo', picture));
  }

  function remove() {
    Alert.alert('Quitar foto', '¿Quieres quitar la foto de tu negocio?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: () => send((form) => form.append('remove_photo', 'true')) },
    ]);
  }

  if (!selectedBusiness) return null;
  const url = resolveMediaUrl(selectedBusiness.photo_url);

  return (
    <View style={{ gap: 9 }}>
      <Text style={{ color: theme.text, fontSize: 13, fontWeight: '700' }}>Foto del negocio</Text>
      <ImageField
        title="foto"
        emptyText="Sin foto del negocio"
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
