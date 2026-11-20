import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';

import { Feedback } from '@/components/ui/feedback';
import { useEniuTheme } from '@/constants/eniu-theme';
import { useAuth } from '@/features/auth/auth-context';
import { useTranslation } from 'react-i18next';

/**
 * `compact` es para ir en fila junto al botón de Apple (etiqueta corta). El
 * separador "o con tu correo" ya no vive aquí: lo pinta cada pantalla.
 */
export function GoogleAuthButton({ mode, compact, style }: { mode: 'login' | 'register'; compact?: boolean; style?: StyleProp<ViewStyle> }) {
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

  const label = loading ? t("Conectando…") : compact ? t("Con Google") : t("Continuar con Google");
  return (
    <View style={[{ gap: 12 }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={compact ? t("Continuar con Google") : undefined}
        accessibilityState={{ disabled: loading, busy: loading }}
        onPress={authenticate}
        disabled={loading}
        style={({ pressed }) => ({ height: 50, borderRadius: 14, borderCurve: 'continuous', borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 12, opacity: loading ? 0.55 : pressed ? 0.72 : 1 })}
      >
        <View style={{ width: 25, height: 25, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}><Text style={{ color: '#4285F4', fontWeight: '900', fontSize: 17 }}>G</Text></View>
        <Text numberOfLines={1} style={{ flexShrink: 1, color: theme.text, fontSize: 15, fontWeight: '700' }}>{label}</Text>
      </Pressable>
      <Feedback message={error} />
    </View>
  );
}
