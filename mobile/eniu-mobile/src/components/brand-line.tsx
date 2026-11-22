import { useEffect } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

/** La mano que sostiene el menú, tal como la dibuja el ícono de la app. */
const HAND = 'M34 26 L77 29.5 C83 30 83 41 77 41 L40.5 41 C34.5 41 34.5 50.5 40.5 50.5 L77 50.5 C83 50.5 83 60.5 77 60.5 L40.5 60.5 C34.5 60.5 34.5 70.5 40.5 70.5 L77 70.5 C83 70.5 83 81 77 81.5 L35 84.5';
/** Cola que se pierde bajo la hoja del formulario. Sale del viewBox a propósito. */
const TAIL = ' C29 85 25 86.5 21 89 L-40 118';

type Props = {
  color: string;
  width: number;
  height: number;
  strokeWidth?: number;
  withTail?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Trazo decorativo de la marca. El SVG deja que el trazo se desborde
 * (`overflow: 'visible'`): quien lo coloca es quien lo recorta, con
 * `overflow: 'hidden'` en su contenedor.
 */
export function BrandLine({ color, width, height, strokeWidth = 3.4, withTail = true, style }: Props) {
  // Las props de accesibilidad van en un View y no en el Svg: en web el Svg
  // las pasaría tal cual al DOM.
  return (
    <View accessible={false} aria-hidden style={[{ width, height, pointerEvents: 'none', overflow: 'visible' }, style]}>
      <Svg width={width} height={height} viewBox="0 22 86 80" fill="none" style={{ overflow: 'visible' }}>
        <Path d={withTail ? HAND + TAIL : HAND} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
/** Largo aproximado del trazo de la mano, en unidades del viewBox. */
const HAND_LENGTH = 340;

/**
 * La línea de la marca dibujándose en bucle: se usa mientras se crea el menú.
 * Si el sistema pide reducir el movimiento se muestra completa y quieta.
 */
export function DrawingBrandLine({ color, width, height, strokeWidth = 3.4, style }: Omit<Props, 'withTail'>) {
  const reduceMotion = useReducedMotion();
  const offset = useSharedValue(reduceMotion ? 0 : HAND_LENGTH);

  useEffect(() => {
    if (reduceMotion) { offset.value = 0; return; }
    offset.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0, { duration: 500 }),
        withTiming(-HAND_LENGTH, { duration: 900, easing: Easing.in(Easing.cubic) }),
      ),
      -1,
    );
  }, [offset, reduceMotion]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: offset.value }));

  return (
    <View accessible={false} aria-hidden style={[{ width, height, pointerEvents: 'none' }, style]}>
      <Svg width={width} height={height} viewBox="0 22 86 80" fill="none">
        <AnimatedPath
          d={HAND}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={`${HAND_LENGTH} ${HAND_LENGTH}`}
          animatedProps={animatedProps}
        />
      </Svg>
    </View>
  );
}
