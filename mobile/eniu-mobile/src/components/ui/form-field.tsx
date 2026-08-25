import { Text, TextInput, TextInputProps, View } from 'react-native';

import { useEniuTheme } from '@/constants/eniu-theme';

export function FormField({ label, error, multiline, ...props }: TextInputProps & { label: string; error?: string }) {
  const theme = useEniuTheme();
  return (
    <View style={{ gap: 7 }}>
      <Text style={{ color: theme.text, fontSize: 13, fontWeight: '700' }}>{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor={theme.muted}
        style={{
          minHeight: multiline ? 100 : 48, borderRadius: 13, borderCurve: 'continuous', borderWidth: 1,
          borderColor: error ? theme.danger : theme.border, backgroundColor: theme.field, color: theme.text,
          paddingHorizontal: 15, paddingVertical: multiline ? 12 : 0, textAlignVertical: multiline ? 'top' : 'center', fontSize: 15,
        }}
      />
      {error ? <Text selectable style={{ color: theme.danger, fontSize: 12 }}>{error}</Text> : null}
    </View>
  );
}
