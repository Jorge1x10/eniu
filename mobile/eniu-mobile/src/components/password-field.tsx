import { ComponentProps, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FormField } from '@/components/ui/form-field';
import { EyeIcon, LockIcon } from '@/components/ui/icons';
import { EniuTheme, useEniuTheme } from '@/constants/eniu-theme';

type Props = Omit<ComponentProps<typeof FormField>, 'icon' | 'trailing' | 'secureTextEntry'> & {
  /** Muestra el medidor de seguridad debajo del campo. */
  showStrength?: boolean;
};

/**
 * Heurística de seguridad sólo del cliente. Es una guía visual: la regla real
 * (de 8 a 128 caracteres) la valida el backend al registrar.
 */
function passwordStrength(password: string, theme: EniuTheme) {
  const hasLetters = /[A-Za-zÀ-ÿ]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSymbols = /[^A-Za-zÀ-ÿ0-9\s]/.test(password);
  if (password.length >= 12 && hasLetters && hasNumbers && hasSymbols) return { level: 3, label: 'Muy segura', color: theme.success };
  if (password.length >= 8 && hasLetters && hasNumbers) return { level: 2, label: 'Buena', color: theme.success };
  if (password.length >= 8) return { level: 1, label: 'Aceptable', color: theme.yellowPressed };
  return { level: 0, label: 'Muy corta', color: theme.danger };
}

export function PasswordField({ showStrength, ...props }: Props) {
  const { t } = useTranslation();
  const theme = useEniuTheme();
  const [visible, setVisible] = useState(false);
  const value = props.value ?? '';
  const strength = passwordStrength(value, theme);
  // "Muy corta" ya pinta la primera barra en rojo para que se lea como aviso.
  const filled = value ? Math.max(1, strength.level) : 0;

  return (
    <View style={{ gap: 8 }}>
      <FormField
        {...props}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        icon={<LockIcon color={theme.muted} size={17} />}
        trailing={(
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? t("Ocultar contraseña") : t("Mostrar contraseña")}
            accessibilityState={{ checked: visible }}
            onPress={() => setVisible((current) => !current)}
            style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}
          >
            <EyeIcon color={visible ? theme.text : theme.muted} size={18} />
          </Pressable>
        )}
      />
      {showStrength ? (
        // Altura fija aunque el campo esté vacío: el medidor no empuja el
        // formulario al escribir el primer carácter.
        <View
          accessible
          accessibilityLiveRegion="polite"
          accessibilityLabel={value ? `${t("Seguridad de la contraseña")}: ${t(strength.label)}` : undefined}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 16 }}
        >
          <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
            {[1, 2, 3].map((bar) => (
              <View key={bar} style={{ flex: 1, height: 4, borderRadius: 99, backgroundColor: bar <= filled ? strength.color : theme.border }} />
            ))}
          </View>
          <Text style={{ minWidth: 72, textAlign: 'right', color: value ? strength.color : theme.muted, fontSize: 12, fontWeight: '700' }}>
            {value ? t(strength.label) : ''}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
