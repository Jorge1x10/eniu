import { Image } from 'expo-image';
import { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, ScrollView, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useEniuTheme } from '@/constants/eniu-theme';

const logoLight = require('../../assets/brand/app-icon-light.png');
const logoDark = require('../../assets/brand/app-icon-dark.png');

export function AuthShell({ title, subtitle, children }: PropsWithChildren<{ title: string; subtitle: string }>) {
  const theme = useEniuTheme();
  const isDark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentInsetAdjustmentBehavior="never" keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: Math.max(24, insets.top + 16), paddingBottom: Math.max(24, insets.bottom + 16), gap: 28 }}>
        <View style={{ gap: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Image source={isDark ? logoDark : logoLight} style={{ width: 56, height: 56, borderRadius: 16 }} contentFit="cover" />
            <View style={{ gap: 2, flex: 1 }}>
              <Text style={{ color: theme.text, fontSize: 20, fontWeight: '900', letterSpacing: -0.6 }}>eniu</Text>
              <Text style={{ color: theme.muted, fontSize: 12.5, lineHeight: 17 }}>Administra tu menú desde un solo lugar.</Text>
            </View>
          </View>
          <View style={{ gap: 8 }}>
            <Text style={{ color: theme.text, fontSize: 32, fontWeight: '900', letterSpacing: -0.8 }}>{title}</Text>
            <Text style={{ color: theme.muted, fontSize: 15, lineHeight: 22 }}>{subtitle}</Text>
          </View>
        </View>
        <View style={{ gap: 16 }}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
