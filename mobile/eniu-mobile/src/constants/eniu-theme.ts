import { useColorScheme } from 'react-native';

const shared = {
  yellow: '#FFE05A',
  yellowPressed: '#E8C93D',
  cream: '#F8E8AE',
  sand: '#E9DDB7',
  success: '#16803A',
  danger: '#C62828',
};

export const eniuLight = {
  ...shared,
  background: '#FFFDF5',
  surface: '#FFFFFF',
  surfaceAlt: '#FFF8DE',
  text: '#111111',
  muted: '#666666',
  border: '#E9DDB7',
  field: '#FFFFFF',
  eyebrow: '#8A7420',
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
  eyebrow: '#D9C36A',
};

export function useEniuTheme() {
  return useColorScheme() === 'dark' ? eniuDark : eniuLight;
}
