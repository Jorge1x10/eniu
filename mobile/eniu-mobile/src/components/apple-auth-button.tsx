import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, useColorScheme, View } from 'react-native';

import { Feedback } from '@/components/ui/feedback';
import { useAuth } from '@/features/auth/auth-context';
import { useTranslation } from 'react-i18next';

/** Une nombre y apellido de la primera autorización; Apple no los vuelve a mandar. */
function joinName(fullName: AppleAuthentication.AppleAuthenticationCredential['fullName']) {
  const parts = [fullName?.givenName, fullName?.familyName].filter(Boolean);
  return parts.length ? parts.join(' ') : null;
}

export function AppleAuthButton({ mode }: { mode: 'login' | 'register' }) {
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
    <View style={{ gap: 12 }}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={mode === 'register' ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={scheme === 'dark' ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={14}
        style={{ height: 50 }}
        onPress={authenticate}
      />
      <Feedback message={error} />
    </View>
  );
}
