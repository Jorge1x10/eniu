import { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, ScrollView, Text, View } from 'react-native';

import { useEniuTheme } from '@/constants/eniu-theme';

export function AuthShell({ title, subtitle, children }: PropsWithChildren<{ title: string; subtitle: string }>) {
  const theme = useEniuTheme();
  return (
    <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 28 }}>
        <View style={{ gap: 18 }}>
          <View style={{ alignSelf: 'flex-start', borderRadius: 18, borderCurve: 'continuous', backgroundColor: theme.yellow, paddingHorizontal: 18, paddingVertical: 12 }}>
            <Text style={{ color: '#111111', fontSize: 25, fontWeight: '900', letterSpacing: -1 }}>eniu</Text>
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
