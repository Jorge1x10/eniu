import { router } from 'expo-router';
import { createContext, PropsWithChildren, use, useCallback, useEffect, useMemo, useState } from 'react';

import { forgetPurchases, identifyPurchases } from '@/features/billing/purchases';
import { api } from '@/lib/api';
import { sessionStore } from '@/lib/session-store';
import type { User } from '@/types/models';

type SessionResponse = { access_token: string; refresh_token?: string; user: User };
type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  // `username` es opcional: el alta ya no lo pide y el backend lo deriva del correo.
  register: (payload: { username?: string; email: string; phone: string; password: string }) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  loginWithApple: (identityToken: string, fullName?: string | null, authorizationCode?: string | null) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => sessionStore.subscribe(() => setUser(null)), []);

  useEffect(() => {
    let active = true;
    (async () => {
      const token = await sessionStore.getAccessToken();
      if (!token) { if (active) setIsLoading(false); return; }
      try {
        const data = await api.get<{ user: User }>('auth/me');
        if (active) setUser(data.user);
        // También al volver con una sesión ya guardada: reinstalar la app no
        // debe dejar las compras sin dueño.
        await identifyPurchases(data.user.id);
      } catch {
        await sessionStore.clear();
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const startSession = useCallback(async (data: SessionResponse) => {
    await sessionStore.save(data.access_token, data.refresh_token);
    setUser(data.user);
    // Las compras se atan al id de usuario del backend: es lo que permite que
    // el webhook de RevenueCat sepa a quién activarle el plan.
    await identifyPurchases(data.user.id);
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const data = await api.post<SessionResponse>('auth/login', { identifier, password });
    await startSession(data);
  }, [startSession]);

  const register = useCallback(async (payload: { username?: string; email: string; phone: string; password: string }) => {
    const data = await api.post<SessionResponse>('auth/register', payload);
    await startSession(data);
  }, [startSession]);

  const loginWithGoogle = useCallback(async (credential: string) => {
    const data = await api.post<SessionResponse>('auth/google', { credential });
    await startSession(data);
  }, [startSession]);

  // Apple sólo entrega el nombre en la primera autorización y fuera del token,
  // por eso viaja aparte hacia el backend.
  // El authorization code viaja junto a la credencial: el backend lo canjea por
  // el refresh token que Apple exige para revocar la sesión al borrar la cuenta.
  const loginWithApple = useCallback(async (identityToken: string, fullName?: string | null, authorizationCode?: string | null) => {
    const data = await api.post<SessionResponse>('auth/apple', { identity_token: identityToken, full_name: fullName || undefined, authorization_code: authorizationCode || undefined });
    await startSession(data);
  }, [startSession]);

  const logout = useCallback(async () => {
    await sessionStore.clear();
    setUser(null);
    // Antes de irse: si no, la compra quedaría atada a quien use el teléfono
    // después.
    await forgetPurchases();
    router.replace('/(auth)/login');
  }, []);

  const value = useMemo(() => ({ user, isLoading, login, register, loginWithGoogle, loginWithApple, logout, setUser }), [isLoading, login, loginWithApple, loginWithGoogle, logout, register, user]);
  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const context = use(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
