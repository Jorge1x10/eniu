import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleProp, useColorScheme, View, ViewStyle } from 'react-native';

import { Feedback } from '@/components/ui/feedback';
import { useAuth } from '@/features/auth/auth-context';
import { useTranslation } from 'react-i18next';

/** Une nombre y apellido de la primera autorización; Apple no los vuelve a mandar. */
function joinName(fullName: AppleAuthentication.AppleAuthenticationCredential['fullName']) {
  const parts = [fullName?.givenName, fullName?.familyName].filter(Boolean);
  return parts.length ? parts.join(' ') : null;
}

/**
 * Devuelve `null` en Android o si Apple no está disponible: la fila que lo
 * contiene debe verse bien sólo con Google. `compact` es para ir en fila.
 */
export function AppleAuthButton({ mode, style }: { mode: 'login' | 'register'; /** Va en fila; hoy usa el mismo tipo `CONTINUE`. */ compact?: boolean; style?: StyleProp<ViewStyle> }) {
  const { t } = useTranslation();

  const scheme = useColorScheme();
  const { loginWithApple } = useAuth();
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let active = true;
    AppleAuthentication.isAvailableAsync()
      .then((value) => { if (active) setAvailable(value); })
      .catch(() => { if (active) setAvailable(false); });
    return () => { active = false; };
  }, []);

  if (Platform.OS !== 'ios' || !available) return null;

  async function authenticate() {
    setError('');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error(t("Apple no devolvió una credencial válida."));
      await loginWithApple(credential.identityToken, joinName(credential.fullName), credential.authorizationCode);
      router.replace(mode === 'register' ? '/(onboarding)/business' : '/(tabs)/(home)');
    } catch (requestError) {
      // Cancelar no es un error que valga la pena mostrar.
      if (requestError instanceof Error && 'code' in requestError && (requestError as { code?: string }).code === 'ERR_REQUEST_CANCELED') return;
      setError(requestError instanceof Error ? requestError.message : t("No fue posible continuar con Apple."));
    }
  }

  return (
    <View style={[{ gap: 12 }, style]}>
      {/* Botón nativo: las guías de Apple no permiten sustituirlo por uno propio.
          "Continuar" sirve igual para entrar o registrarse, y cabe en media
          fila en la variante compacta. */}
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={scheme === 'dark' ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={14}
        style={{ height: 50 }}
        onPress={authenticate}
      />
      <Feedback message={error} />
    </View>
  );
}
