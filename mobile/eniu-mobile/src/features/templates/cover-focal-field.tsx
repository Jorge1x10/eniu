import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useEniuTheme } from '@/constants/eniu-theme';
import type { PreviewImage } from '@/features/templates/menu-preview';

const clamp = (value: number) => Math.min(1, Math.max(0, value));

/**
 * Encuadre de la portada: se toca o arrastra sobre la propia foto para elegir
 * qué parte queda visible dentro del recuadro fijo del menú.
 *
 * Nunca recorta el archivo: sólo guarda dos números (0-1) que el menú usa como
 * `object-position`, así que cambiar de opinión no pierde nada de la foto
 * original.
 */
export function CoverFocalField({ source, focalX, focalY, disabled = false, onChange }: {
  source: PreviewImage;
  focalX: number;
  focalY: number;
  disabled?: boolean;
  onChange: (x: number, y: number) => void;
}) {
  const { t } = useTranslation();
  const appTheme = useEniuTheme();
  const size = useRef({ width: 0, height: 0 });
  const [ready, setReady] = useState(false);

  if (!source) return null;

  function handleLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    size.current = { width, height };
    setReady(width > 0);
  }

  function handleTouch(event: GestureResponderEvent) {
    const { width, height } = size.current;
    if (!width || !height) return;
    const { locationX, locationY } = event.nativeEvent;
    onChange(Number(clamp(locationX / width).toFixed(3)), Number(clamp(locationY / height).toFixed(3)));
  }

  return (
    <View style={{ gap: 7 }}>
      <Text style={{ color: appTheme.text, fontSize: 13, fontWeight: '700' }}>{t("Encuadre de la portada")}</Text>
      <Text style={{ color: appTheme.muted, fontSize: 11.5, lineHeight: 16 }}>{t("Toca o arrastra sobre la foto para elegir qué parte se ve.")}</Text>
      <View
        onLayout={handleLayout}
        // El sistema de responder de React Native da `locationX/locationY`
        // relativos a esta vista; los hijos van con `pointerEvents="none"` para
        // que las coordenadas no lleguen medidas contra la imagen.
        onStartShouldSetResponder={() => !disabled}
        onMoveShouldSetResponder={() => !disabled}
        onResponderGrant={handleTouch}
        onResponderMove={handleTouch}
        style={{ height: 120, borderRadius: 14, borderCurve: 'continuous', overflow: 'hidden', borderWidth: 1, borderColor: appTheme.border, opacity: disabled ? 0.5 : 1 }}
      >
        <Image
          source={source}
          pointerEvents="none"
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          contentPosition={{ left: `${focalX * 100}%`, top: `${focalY * 100}%` }}
          transition={120}
        />
        {ready ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: `${focalX * 100}%`,
              top: `${focalY * 100}%`,
              width: 22, height: 22, marginLeft: -11, marginTop: -11,
              borderRadius: 999, borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: 'rgba(0,0,0,0.35)',
            }}
          />
        ) : null}
      </View>
    </View>
  );
}
