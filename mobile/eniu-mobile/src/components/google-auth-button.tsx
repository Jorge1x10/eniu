import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Feedback } from '@/components/ui/feedback';
import { useEniuTheme } from '@/constants/eniu-theme';
import { useAuth } from '@/features/auth/auth-context';
import { useTranslation } from 'react-i18next';

export function GoogleAuthButton({ mode }: { mode: 'login' | 'register' }) {
  const { t } = useTranslation();

  const theme = useEniuTheme();
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function authenticate() {
    if (Constants.appOwnership === 'expo') {
      setError(t("Google requiere el development build de Eniu; no funciona dentro de Expo Go. Usa npm run android:dev o un build de EAS."));
      return;
    }
    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    if (!webClientId) { setError(t("Falta configurar EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.")); return; }
    setLoading(true); setError('');
    try {
      // El client id de iOS no es secreto (viaja en el Info.plist como URL
      // scheme), así que vive en app.json junto al scheme para que ambos no
      // puedan quedar desincronizados.
      const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
        || (Constants.expoConfig?.extra?.googleIosClientId as string | undefined)
        || null;
      const { GoogleOneTapSignIn } = await import('react-native-nitro-google-signin');
      GoogleOneTapSignIn.configure({
        webClientId,
        iosClientId,
        autoSelectOnSignIn: false,
      });
      await GoogleOneTapSignIn.checkPlayServices(true);
      let response = await GoogleOneTapSignIn.signIn();
      if (response.type === 'noSavedCredentialFound') response = await GoogleOneTapSignIn.createAccount();
      if (response.type === 'cancelled') return;
      if (response.type !== 'success' || !response.data?.idToken) throw new Error(t("Google no devolvió una credencial válida."));
      await loginWithGoogle(response.data.idToken);
      router.replace(mode === 'register' ? '/(onboarding)/business' : '/(tabs)/(home)');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("No fue posible continuar con Google."));
    } finally { setLoading(false); }
  }

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ flex: 1, height: 1, backgroundColor: theme.border }} /><Text style={{ color: theme.muted, fontSize: 12 }}>{t("o continúa con")}</Text><View style={{ flex: 1, height: 1, backgroundColor: theme.border }} /></View>
      <Pressable accessibilityRole="button" onPress={authenticate} disabled={loading} style={({ pressed }) => ({ minHeight: 50, borderRadius: 14, borderCurve: 'continuous', borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 11, opacity: loading ? 0.55 : pressed ? 0.72 : 1 })}><View style={{ width: 25, height: 25, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}><Text style={{ color: '#4285F4', fontWeight: '900', fontSize: 17 }}>G</Text></View><Text style={{ color: theme.text, fontWeight: '800' }}>{loading ? 'Conectando…' : mode === 'login' ? t("Iniciar sesión con Google") : t("Registrarse con Google")}</Text></Pressable>
      <Feedback message={error} />
    </View>
  );
}
