import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { CloseIcon, ImageIcon, StarIcon } from '@/components/ui/icons';
import { ImageQualitySelector } from '@/components/ui/image-field';
import { useEniuTheme } from '@/constants/eniu-theme';
import { resolveMediaUrl } from '@/lib/api';
import { pickImages, type ImageQuality, type PickedPicture } from '@/lib/image-file';
import type { ProductPicture } from '@/types/models';
import { useTranslation } from 'react-i18next';

export const MAX_PICTURES = 5;

export type { PickedPicture };

/** Clave de la foto principal: el id de una existente, o `new:<índice>`. */
export type DefaultKey = string | null;

function Thumb({ uri, isDefault, onMakeDefault, onRemove }: { uri: string; isDefault: boolean; onMakeDefault: () => void; onRemove: () => void }) {
  const { t } = useTranslation();

  const theme = useEniuTheme();
  return (
    <View style={{ width: 92, height: 92, borderRadius: 16, borderCurve: 'continuous', overflow: 'hidden', borderWidth: isDefault ? 2 : 1, borderColor: isDefault ? theme.yellow : theme.border, backgroundColor: theme.surfaceAlt }}>
      <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} />
      <View style={{ position: 'absolute', top: 4, left: 4, right: 4, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isDefault ? t("Imagen principal") : t("Usar como imagen principal")}
          onPress={onMakeDefault}
          hitSlop={6}
          style={({ pressed }) => ({ width: 26, height: 26, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: isDefault ? theme.yellow : 'rgba(17,17,17,0.55)', opacity: pressed ? 0.7 : 1 })}
        >
          <StarIcon color={isDefault ? theme.onYellow : '#FFFFFF'} size={13} filled={isDefault} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quitar imagen"
          onPress={onRemove}
          hitSlop={6}
          style={({ pressed }) => ({ width: 26, height: 26, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,17,17,0.55)', opacity: pressed ? 0.7 : 1 })}
        >
          <CloseIcon color="#FFFFFF" size={13} />
        </Pressable>
      </View>
      {isDefault ? <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: theme.yellow, paddingVertical: 2, alignItems: 'center' }}><Text style={{ color: theme.onYellow, fontSize: 9, fontWeight: '800', letterSpacing: 0.4 }}>PRINCIPAL</Text></View> : null}
    </View>
  );
}

type Props = {
  existing: ProductPicture[];
  picked: PickedPicture[];
  defaultKey: DefaultKey;
  onChangeExisting: (pictures: ProductPicture[]) => void;
  onChangePicked: (pictures: PickedPicture[]) => void;
  onChangeDefault: (key: DefaultKey) => void;
  onError: (message: string) => void;
  disabled?: boolean;
};

export function ProductImagePicker({ existing, picked, defaultKey, onChangeExisting, onChangePicked, onChangeDefault, onError, disabled }: Props) {
  const { t } = useTranslation();

  const theme = useEniuTheme();
  const [quality, setQuality] = useState<ImageQuality>('alta');
  const [working, setWorking] = useState(false);
  const total = existing.length + picked.length;

  async function add() {
    const remaining = MAX_PICTURES - total;
    if (remaining <= 0) { Alert.alert(t("Límite de fotos"), `Puedes agregar máximo ${MAX_PICTURES} imágenes por producto.`); return; }
    setWorking(true);
    try {
      // `pickImages` ya convierte cada foto a un formato que la API acepta: la
      // galería entrega HEIC en iOS y archivos de más de 5 MB en los dos.
      const pictures = await pickImages({ limit: remaining, quality });
      if (!pictures?.length) return;
      onChangePicked([...picked, ...pictures]);
      if (!defaultKey && !existing.length) onChangeDefault('new:0');
    } catch (error) {
      onError(error instanceof Error ? error.message : t("No fue posible preparar las imágenes."));
    } finally {
      setWorking(false);
    }
  }

  function removeExisting(id: string) {
    const next = existing.filter((picture) => picture.id !== id);
    onChangeExisting(next);
    if (defaultKey === id) onChangeDefault(next[0]?.id ?? (picked.length ? 'new:0' : null));
  }

  function removePicked(index: number) {
    const next = picked.filter((_, position) => position !== index);
    onChangePicked(next);
    if (defaultKey === `new:${index}`) onChangeDefault(existing[0]?.id ?? (next.length ? 'new:0' : null));
    else if (defaultKey?.startsWith('new:')) {
      const current = Number(defaultKey.slice(4));
      if (current > index) onChangeDefault(`new:${current - 1}`);
    }
  }

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: theme.text, fontSize: 13, fontWeight: '800' }}>{t("Fotos")}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 4 }}>
        {existing.map((picture) => (
          <Thumb key={picture.id} uri={resolveMediaUrl(picture.url) || picture.url} isDefault={defaultKey === picture.id} onMakeDefault={() => onChangeDefault(picture.id)} onRemove={() => removeExisting(picture.id)} />
        ))}
        {picked.map((picture, index) => (
          <Thumb key={picture.uri} uri={picture.uri} isDefault={defaultKey === `new:${index}`} onMakeDefault={() => onChangeDefault(`new:${index}`)} onRemove={() => removePicked(index)} />
        ))}
        {total < MAX_PICTURES ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Agregar fotos"
            disabled={disabled || working}
            onPress={add}
            style={({ pressed }) => ({ width: 92, height: 92, borderRadius: 16, borderCurve: 'continuous', borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.yellowPressed, alignItems: 'center', justifyContent: 'center', gap: 6, opacity: disabled || working ? 0.5 : pressed ? 0.7 : 1 })}
          >
            {working ? <ActivityIndicator color={theme.yellowPressed} /> : <>
              <ImageIcon color={theme.yellowPressed} size={22} />
              <Text style={{ color: theme.yellowPressed, fontSize: 11, fontWeight: '800' }}>{t("Agregar")}</Text>
            </>}
          </Pressable>
        ) : null}
      </ScrollView>
      <ImageQualitySelector value={quality} onChange={setQuality} />
      <Text style={{ color: theme.muted, fontSize: 11.5, lineHeight: 17 }}>{t("Se convierten solas al formato que acepta el menú. Máximo")} {MAX_PICTURES} {t("por producto. Toca la estrella para elegir la principal.")}</Text>
    </View>
  );
}
