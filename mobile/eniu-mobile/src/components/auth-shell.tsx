import { PropsWithChildren, ReactNode } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { BrandLine } from '@/components/brand-line';
import { cardStyle, eniuDark, useEniuTheme } from '@/constants/eniu-theme';
import { ChevronLeftIcon } from '@/components/ui/icons';

/**
 * Entrada de las pantallas de acceso: el contenido aparece subiendo desde
 * 25 pt más abajo en 0.5 s. El bloque de abajo sale 80 ms después del de
 * arriba para que se lea como una secuencia. Reanimated respeta por defecto
 * la opción de reducir movimiento del sistema. El builder se crea en cada uso
 * porque `.delay()` modifica la instancia.
 */
const REVEAL_MS = 500;
const REVEAL_STAGGER_MS = 80;
const reveal = (delay = 0) => FadeInDown.duration(REVEAL_MS).delay(delay);

/** El encabezado es oscuro en los dos modos, así que su texto siempre es claro. */
const ON_HERO = eniuDark.text;

type HeroProps = PropsWithChildren<{
  variant?: 'hero';
  headline: ReactNode;
  /** `md` acorta el encabezado 24 pt y baja el titular, para formularios más largos. */
  heroSize?: 'lg' | 'md';
}>;

type CompactProps = PropsWithChildren<{
  variant: 'compact';
  title: string;
  subtitle: string;
  step?: { current: number; total: number };
  onBack?: () => void;
}>;

function Frame({ children, contentStyle }: PropsWithChildren<{ contentStyle?: object }>) {
  const theme = useEniuTheme();
  return (
    <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={[{ flexGrow: 1, backgroundColor: theme.background }, contentStyle]}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function HeroShell({ headline, heroSize = 'lg', children }: HeroProps) {
  const theme = useEniuTheme();
  const insets = useSafeAreaInsets();
  const large = heroSize === 'lg';
  return (
    <Frame>
      <View style={{ height: insets.top + (large ? 210 : 186), backgroundColor: theme.authHero, overflow: 'hidden', paddingHorizontal: 24, paddingTop: insets.top + 10, paddingBottom: 28 + 14, justifyContent: 'flex-end' }}>
        <BrandLine color={theme.yellow} width={214} height={200} style={{ position: 'absolute', right: -14, top: insets.top }} />
        <Animated.View entering={reveal()}>
          <Text accessibilityRole="header" style={{ color: ON_HERO, fontSize: large ? 36 : 34, lineHeight: large ? 38 : 36, fontWeight: '900', letterSpacing: -1.4 }}>
            {headline}
          </Text>
        </Animated.View>
      </View>
      <View
        style={{
          flex: 1, marginTop: -28, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderCurve: 'continuous',
          backgroundColor: theme.background, paddingTop: 22, paddingHorizontal: 24, paddingBottom: insets.bottom + 16,
        }}
      >
        {/* La hoja se queda quieta (si se moviera dejaría ver el encabezado
            por sus esquinas); lo que entra es su contenido. */}
        <Animated.View entering={reveal(REVEAL_STAGGER_MS)} style={{ flex: 1, gap: 16 }}>{children}</Animated.View>
      </View>
    </Frame>
  );
}

function StepBar({ current, total }: { current: number; total: number }) {
  const { t } = useTranslation();
  const theme = useEniuTheme();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t("Paso {{current}} de {{total}}", { current, total })}
      accessibilityValue={{ min: 1, max: total, now: current }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
    >
      <Text style={{ color: theme.muted, fontSize: 12, fontWeight: '700' }}>{t("Paso {{current}} de {{total}}", { current, total })}</Text>
      <View style={{ flexDirection: 'row', gap: 5 }}>
        {Array.from({ length: total }, (_, index) => {
          const position = index + 1;
          const backgroundColor = position < current ? theme.text : position === current ? theme.yellow : theme.border;
          return <View key={position} style={{ width: 22, height: 5, borderRadius: 99, backgroundColor }} />;
        })}
      </View>
    </View>
  );
}

function CompactShell({ title, subtitle, step, onBack, children }: CompactProps) {
  const { t } = useTranslation();
  const theme = useEniuTheme();
  const insets = useSafeAreaInsets();
  return (
    <Frame contentStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 24, paddingBottom: insets.bottom + 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 44 }}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Volver")}
            onPress={onBack}
            style={({ pressed }) => ({ ...cardStyle(theme, 14), width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}
          >
            <ChevronLeftIcon color={theme.text} size={14} />
          </Pressable>
        ) : <View />}
        {step ? <StepBar current={step.current} total={step.total} /> : null}
      </View>
      <Animated.View entering={reveal()} style={{ marginTop: 36, gap: 8 }}>
        <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 32, lineHeight: 35, fontWeight: '900', letterSpacing: -1.1 }}>{title}</Text>
        <Text style={{ color: theme.muted, fontSize: 15, lineHeight: 22 }}>{subtitle}</Text>
      </Animated.View>
      {/* Cada pantalla pone un `<View style={{ flex: 1 }} />` antes de su CTA
          para que quede abajo. */}
      <Animated.View entering={reveal(REVEAL_STAGGER_MS)} style={{ flex: 1, marginTop: 28, gap: 16 }}>{children}</Animated.View>
    </Frame>
  );
}

export function AuthShell(props: HeroProps | CompactProps) {
  return props.variant === 'compact' ? <CompactShell {...props} /> : <HeroShell {...props} />;
}

/** Separador "o con tu correo" entre los botones sociales y el formulario. */
export function AuthDivider() {
  const { t } = useTranslation();
  const theme = useEniuTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
      <Text style={{ color: theme.muted, fontSize: 13 }}>{t("o con tu correo")}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
    </View>
  );
}
