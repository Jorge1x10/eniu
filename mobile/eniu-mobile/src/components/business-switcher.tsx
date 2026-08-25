import { Pressable, ScrollView, Text, View } from 'react-native';

import { useEniuTheme } from '@/constants/eniu-theme';
import { useBusiness } from '@/features/business/business-context';

export function BusinessSwitcher() {
  const theme = useEniuTheme();
  const { businesses, selectedBusiness, selectBusiness } = useBusiness();
  if (!businesses.length) return null;
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: theme.muted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 }}>Negocio</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 4 }}>
        {businesses.map((business) => {
          const selected = business.id === selectedBusiness?.id;
          return <Pressable key={business.id} onPress={() => selectBusiness(business.id)} style={({ pressed }) => ({ minHeight: 46, justifyContent: 'center', borderRadius: 999, paddingHorizontal: 18, backgroundColor: selected ? theme.yellow : theme.surface, borderWidth: 1, borderColor: selected ? theme.yellowPressed : theme.border, opacity: pressed ? 0.7 : 1 })}><Text style={{ color: selected ? '#111111' : theme.text, fontWeight: '800' }}>{business.name}</Text></Pressable>;
        })}
      </ScrollView>
    </View>
  );
}
