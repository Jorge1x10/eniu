import { useColorScheme } from 'react-native';

type CardShadow = { shadowColor?: string; shadowOffset?: { width: number; height: number }; shadowOpacity?: number; shadowRadius?: number; elevation?: number };

const shared = {
  yellow: '#FFE05A',
  yellowPressed: '#E8C93D',
  cream: '#F8E8AE',
  sand: '#E9DDB7',
  success: '#16803A',
  danger: '#C62828',
  /** Text/icon color for anything sitting on yellow, cream or sand — always dark, in both schemes. */
  onYellow: '#111111',
  /** Near-black used by hero cards (menu en vivo, analíticas, detalle de menú) in both schemes. */
  hero: '#141210',
  heroMuted: '#8C8578',
  heroSurface: 'rgba(255,255,255,0.06)',
};

export const eniuLight = {
  ...shared,
  background: '#FBF7EC',
  surface: '#FFFFFF',
  surfaceAlt: '#F2EBD8',
  text: '#111111',
  muted: '#7A736A',
  border: 'rgba(17,17,17,0.07)',
  field: '#FFFFFF',
  /** Elevated cards use a soft warm shadow instead of a border. */
  cardBorderWidth: 0,
  cardShadow: {
    shadowColor: '#54460F',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 5,
  } as CardShadow,
};

export const eniuDark = {
  ...shared,
  background: '#111111',
  surface: '#242424',
  surfaceAlt: '#363224',
  text: '#FFFDF5',
  muted: '#C7C7C7',
  border: '#555555',
  field: '#1B1B1B',
  /**
   * El rediseño con sombras y fondo cálido se dejó sólo para el modo claro; en
   * oscuro se mantiene el look plano con borde de antes de tocar esta pantalla.
   */
  cardBorderWidth: 1,
  cardShadow: {} as CardShadow,
};

export type EniuTheme = typeof eniuLight;

export function useEniuTheme(): EniuTheme {
  return useColorScheme() === 'dark' ? eniuDark : eniuLight;
}

/** Estilo base para tarjetas elevadas: sombra cálida en claro, borde plano en oscuro. */
export function cardStyle(theme: EniuTheme, radius = 22) {
  return {
    backgroundColor: theme.surface,
    borderRadius: radius,
    borderCurve: 'continuous' as const,
    borderWidth: theme.cardBorderWidth,
    borderColor: theme.border,
    ...theme.cardShadow,
  };
}
