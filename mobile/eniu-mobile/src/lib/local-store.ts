import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

async function getItem(key: string) {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string) {
  if (Platform.OS === 'web') { globalThis.localStorage?.setItem(key, value); return; }
  await SecureStore.setItemAsync(key, value);
}

export const localStore = { getItem, setItem };
