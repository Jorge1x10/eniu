import { useColorScheme } from 'react-native';

type CardShadow = { shadowColor?: string; shadowOffset?: { width: number; height: number }; shadowOpacity?: number; shadowRadius?: number; elevation?: number };

const shared = {
  yellow: '#FFE05A',
  yellowPressed: '#E8C93D',
  cream: '#F8E8AE',
  sand: '#E9DDB7',
  /** Text/icon color for anything sitting on yellow, cream or sand — always dark, in both schemes. */
  onYellow: '#111111',
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
  success: '#16803A',
  danger: '#C62828',
  /** Bloque oscuro de cabecera: contra la crema es el plano más contrastado. */
  hero: '#141210',
  heroMuted: '#8C8578',
  /** Elevated cards use a soft warm shadow instead of a border. */
  cardBorderWidth: 0,
  cardShadow: {
    shadowColor: '#54460F',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 5,
  } as CardShadow,
  heroShadow: {
    shadowColor: '#141210',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 8,
  } as CardShadow,
};

/**
 * En oscuro el relieve no lo dan las sombras —sobre un fondo casi negro no se
 * ven— sino una escala de superficies: cada plano que "sube" es más claro que
 * el anterior. Los valores están medidos en luminosidad perceptual (L*), con
 * saltos de 3 a 6 puntos, que es lo que el ojo distingue como un escalón:
 *
 *   background 2.8 → field 5.6 → surface 9.0 → surfaceAlt 15.4 → hero 18.4
 *
 * `hero` deja de ser compartido: antes valía #141210 en los dos modos, y contra
 * el fondo oscuro de #111111 la cabecera negra desaparecía. En claro es el
 * plano más oscuro y en oscuro el más claro; en los dos es el más destacado,
 * que es lo que significa.
 *
 * `success` y `danger` también dejan de ser compartidos: los tonos calibrados
 * para fondo claro se quedaban en 3.1 y 3.5 sobre estas superficies, por debajo
 * del 4.5 que hace falta para leerlos.
 */
export const eniuDark = {
  ...shared,
  background: '#0B0A08',
  surface: '#1C1916',
  surfaceAlt: '#2B261D',
  text: '#FBF7EC',
  muted: '#A8A093',
  /** Filo apenas visible en vez del gris duro de antes (#555555). */
  border: 'rgba(251,247,236,0.10)',
  field: '#141210',
  success: '#3DBF6B',
  danger: '#F0736B',
  hero: '#332C21',
  heroMuted: '#A39B8C',
  cardBorderWidth: 1,
  cardShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 4,
  } as CardShadow,
  /** Sin sombra: aquí la cabecera destaca por ser el plano más claro. */
  heroShadow: {} as CardShadow,
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
