import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN = 'eniu.access_token';
const REFRESH_TOKEN = 'eniu.refresh_token';
const listeners = new Set<() => void>();

async function getItem(key: string) {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string) {
  if (Platform.OS === 'web') return globalThis.localStorage?.setItem(key, value);
  return SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string) {
  if (Platform.OS === 'web') return globalThis.localStorage?.removeItem(key);
  return SecureStore.deleteItemAsync(key);
}

export const sessionStore = {
  getAccessToken: () => getItem(ACCESS_TOKEN),
  getRefreshToken: () => getItem(REFRESH_TOKEN),
  async save(accessToken: string, refreshToken?: string | null) {
    await setItem(ACCESS_TOKEN, accessToken);
    if (refreshToken) await setItem(REFRESH_TOKEN, refreshToken);
  },
  async clear() {
    await Promise.all([deleteItem(ACCESS_TOKEN), deleteItem(REFRESH_TOKEN)]);
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};
