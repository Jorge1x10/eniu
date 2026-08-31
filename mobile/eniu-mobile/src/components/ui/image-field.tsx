import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { ImageIcon, TrashIcon } from '@/components/ui/icons';
import { useEniuTheme } from '@/constants/eniu-theme';
import { IMAGE_QUALITIES, pickImages, type ImageQuality, type PickedPicture } from '@/lib/image-file';
import { useTranslation } from 'react-i18next';

type Source = { uri: string; headers?: Record<string, string> } | null;

/**
 * Cuánto detalle conserva la app al recomprimir. La foto siempre se convierte
 * (la galería entrega HEIC y archivos de 10 MB que la API rechaza), pero cuánto
 * se comprime lo decide el usuario.
 */
export function ImageQualitySelector({ value, onChange }: { value: ImageQuality; onChange: (value: ImageQuality) => void }) {
  const { t } = useTranslation();

  const theme = useEniuTheme();
  return (
    <View style={{ gap: 7 }}>
      <Text style={{ color: theme.text, fontSize: 13, fontWeight: '700' }}>{t("Calidad de las fotos")}</Text>
      <View style={{ flexDirection: 'row', gap: 7 }}>
        {IMAGE_QUALITIES.map((option) => {
          const on = option.key === value;
          return (
            <Pressable
              key={option.key}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => onChange(option.key)}
              style={({ pressed }) => ({ flex: 1, minHeight: 52, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: 13, borderCurve: 'continuous', backgroundColor: on ? theme.yellow : theme.surface, borderWidth: 1, borderColor: on ? theme.yellowPressed : theme.border, opacity: pressed ? 0.75 : 1 })}
            >
              <Text style={{ color: on ? theme.onYellow : theme.text, fontSize: 13, fontWeight: '800' }}>{t(option.label)}</Text>
              <Text numberOfLines={1} style={{ color: on ? theme.onYellow : theme.muted, fontSize: 10, opacity: on ? 0.75 : 1 }}>{t(option.hint)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

type Props = {
  title: string;
  emptyText: string;
  source: Source;
  quality: ImageQuality;
  onPicked: (picture: PickedPicture) => void;
  onRemove?: () => void;
  onError: (message: string) => void;
  height?: number;
  disabled?: boolean;
  note?: string;
};

/** Tarjeta de «elegir / cambiar / quitar» para la portada, el fondo y el logo. */
export function ImageField({ title, emptyText, source, quality, onPicked, onRemove, onError, height = 140, disabled, note }: Props) {
  const { t } = useTranslation();

  const theme = useEniuTheme();
  const [working, setWorking] = useState(false);
  const lower = title.toLowerCase();

  async function choose() {
    setWorking(true);
    try {
      const pictures = await pickImages({ limit: 1, quality });
      if (pictures?.[0]) onPicked(pictures[0]);
    } catch (error) {
      onError(error instanceof Error ? error.message : `No fue posible preparar ${lower}.`);
    } finally {
      setWorking(false);
    }
  }

  return (
    <View style={{ borderRadius: 18, borderCurve: 'continuous', borderWidth: 1, borderStyle: 'dashed', borderColor: theme.border, backgroundColor: theme.surface, overflow: 'hidden' }}>
      {source ? (
        <Image source={source} style={{ width: '100%', height }} contentFit="cover" transition={150} />
      ) : (
        <View style={{ height: height - 40, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.surfaceAlt }}>
          <ImageIcon color={theme.yellowPressed} size={24} />
          <Text style={{ color: theme.muted, fontSize: 12.5 }}>{emptyText}</Text>
        </View>
      )}
      <View style={{ padding: 13, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable
            accessibilityRole="button"
            disabled={disabled || working}
            onPress={choose}
            style={({ pressed }) => ({ flex: 1, minHeight: 44, borderRadius: 12, borderCurve: 'continuous', backgroundColor: theme.yellow, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: disabled || working ? 0.55 : pressed ? 0.78 : 1 })}
          >
            {working ? <ActivityIndicator color={theme.onYellow} /> : <>
              <ImageIcon color={theme.onYellow} size={16} />
              <Text style={{ color: theme.onYellow, fontSize: 13.5, fontWeight: '800' }}>{source ? `Cambiar ${lower}` : `Elegir ${lower}`}</Text>
            </>}
          </Pressable>
          {source && onRemove ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Quitar ${lower}`}
              disabled={disabled || working}
              onPress={onRemove}
              style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 12, borderCurve: 'continuous', borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}
            >
              <TrashIcon color={theme.danger} size={17} />
            </Pressable>
          ) : null}
        </View>
        <Text style={{ color: theme.muted, fontSize: 11.5, lineHeight: 17 }}>{note ?? t("Se convierte automáticamente a un formato compatible. Máximo 5 MB.")}</Text>
      </View>
    </View>
  );
}
