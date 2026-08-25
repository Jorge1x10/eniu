import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useEniuTheme } from '@/constants/eniu-theme';
import type { Catalogue } from '@/types/models';

export function CatalogueCard({ catalogue }: { catalogue: Catalogue }) {
  const theme = useEniuTheme();
  return (
    <Link href={{ pathname: '/(tabs)/(menus)/[catalogueId]', params: { catalogueId: catalogue.id } }} asChild>
      <Pressable style={({ pressed }) => ({ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 20, borderCurve: 'continuous', padding: 18, gap: 10, opacity: pressed ? 0.72 : 1 })}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><Text numberOfLines={1} style={{ flex: 1, color: theme.text, fontSize: 18, fontWeight: '900' }}>{catalogue.name}</Text><View style={{ borderRadius: 999, backgroundColor: catalogue.is_published ? theme.yellow : theme.surfaceAlt, paddingHorizontal: 10, paddingVertical: 5 }}><Text style={{ color: catalogue.is_published ? '#111111' : theme.muted, fontSize: 11, fontWeight: '800' }}>{catalogue.is_published ? 'Publicado' : 'Borrador'}</Text></View></View>
        <Text numberOfLines={2} style={{ color: theme.muted, lineHeight: 20 }}>{catalogue.description || 'Sin descripción'}</Text>
        <Text style={{ color: theme.yellowPressed, fontSize: 13, fontWeight: '800' }}>Administrar →</Text>
      </Pressable>
    </Link>
  );
}
