import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { CloseIcon, ImageIcon, StarIcon } from '@/components/ui/icons';
import { useEniuTheme } from '@/constants/eniu-theme';
import { resolveMediaUrl } from '@/lib/api';
import type { ProductPicture } from '@/types/models';

export const MAX_PICTURES = 5;
const MAX_BYTES = 5 * 1024 * 1024;

/** Foto recién elegida en el teléfono, todavía no subida. */
export type PickedPicture = { uri: string; name: string; type: string };

/** Clave de la foto principal: el id de una existente, o `new:<índice>`. */
export type DefaultKey = string | null;

function extensionOf(uri: string, mimeType?: string | null) {
  const fromMime = mimeType?.split('/')[1];
  const fromUri = uri.split('?')[0].split('.').pop();
  const extension = (fromMime || fromUri || 'jpg').toLowerCase();
  return extension === 'jpeg' ? 'jpg' : extension;
}

function Thumb({ uri, isDefault, onMakeDefault, onRemove }: { uri: string; isDefault: boolean; onMakeDefault: () => void; onRemove: () => void }) {
  const theme = useEniuTheme();
  return (
    <View style={{ width: 92, height: 92, borderRadius: 16, borderCurve: 'continuous', overflow: 'hidden', borderWidth: isDefault ? 2 : 1, borderColor: isDefault ? theme.yellow : theme.border, backgroundColor: theme.surfaceAlt }}>
      <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} />
      <View style={{ position: 'absolute', top: 4, left: 4, right: 4, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isDefault ? 'Imagen principal' : 'Usar como imagen principal'}
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
  disabled?: boolean;
};

export function ProductImagePicker({ existing, picked, defaultKey, onChangeExisting, onChangePicked, onChangeDefault, disabled }: Props) {
  const theme = useEniuTheme();
  const total = existing.length + picked.length;

  async function add() {
    const remaining = MAX_PICTURES - total;
    if (remaining <= 0) { Alert.alert('Límite de fotos', `Puedes agregar máximo ${MAX_PICTURES} imágenes por producto.`); return; }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Permiso necesario', 'Permite el acceso a tus fotos para subir imágenes de los productos.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (result.canceled) return;
    const tooBig = result.assets.find((asset) => (asset.fileSize ?? 0) > MAX_BYTES);
    if (tooBig) { Alert.alert('Imagen muy pesada', 'Cada imagen debe pesar máximo 5 MB.'); return; }
    const next = result.assets.slice(0, remaining).map((asset, index) => {
      const extension = extensionOf(asset.uri, asset.mimeType);
      return { uri: asset.uri, name: asset.fileName || `foto-${Date.now()}-${index}.${extension}`, type: asset.mimeType || `image/${extension}` };
    });
    onChangePicked([...picked, ...next]);
    if (!defaultKey && !existing.length && next.length) onChangeDefault('new:0');
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
    <View style={{ gap: 10 }}>
      <Text style={{ color: theme.text, fontSize: 13, fontWeight: '800' }}>Fotos</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 4 }}>
        {existing.map((picture) => (
          <Thumb key={picture.id} uri={resolveMediaUrl(picture.url) || picture.url} isDefault={defaultKey === picture.id} onMakeDefault={() => onChangeDefault(picture.id)} onRemove={() => removeExisting(picture.id)} />
        ))}
        {picked.map((picture, index) => (
          <Thumb key={`${picture.uri}-${index}`} uri={picture.uri} isDefault={defaultKey === `new:${index}`} onMakeDefault={() => onChangeDefault(`new:${index}`)} onRemove={() => removePicked(index)} />
        ))}
        {total < MAX_PICTURES ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Agregar fotos"
            disabled={disabled}
            onPress={add}
            style={({ pressed }) => ({ width: 92, height: 92, borderRadius: 16, borderCurve: 'continuous', borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.yellowPressed, alignItems: 'center', justifyContent: 'center', gap: 6, opacity: disabled ? 0.5 : pressed ? 0.7 : 1 })}
          >
            <ImageIcon color={theme.yellowPressed} size={22} />
            <Text style={{ color: theme.yellowPressed, fontSize: 11, fontWeight: '800' }}>Agregar</Text>
          </Pressable>
        ) : null}
      </ScrollView>
      <Text style={{ color: theme.muted, fontSize: 11.5, lineHeight: 17 }}>JPG, PNG o WebP. Máximo 5 MB por imagen y {MAX_PICTURES} por producto. Toca la estrella para elegir la principal.</Text>
    </View>
  );
}
