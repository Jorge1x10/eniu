import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { MenuSkeleton } from '@/components/menu-skeleton';
import { Divider } from '@/components/ui/divider';
import { ChevronRightIcon } from '@/components/ui/icons';
import { useEniuTheme } from '@/constants/eniu-theme';
import type { Catalogue } from '@/types/models';

export function CatalogueCard({ catalogue }: { catalogue: Catalogue }) {
  const theme = useEniuTheme();
  return (
    <Link href={{ pathname: '/(tabs)/(menus)/[catalogueId]', params: { catalogueId: catalogue.id } }} asChild>
      {/* La acción va bajo una línea divisoria y no suelta dentro del bloque de
          texto: así la tarjeta se lee como un contenedor con su propio pie. */}
      <Pressable style={({ pressed }) => ({ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 20, borderCurve: 'continuous', overflow: 'hidden', opacity: pressed ? 0.72 : 1 })}>
        <View style={{ flexDirection: 'row', gap: 14, padding: 16 }}>
          <MenuSkeleton width={52} padding={7} />
          <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <Text numberOfLines={1} style={{ flex: 1, color: theme.text, fontSize: 17, fontWeight: '900' }}>{catalogue.name}</Text>
              <View style={{ borderRadius: 999, backgroundColor: catalogue.is_published ? theme.yellow : theme.surfaceAlt, paddingHorizontal: 9, paddingVertical: 4 }}><Text style={{ color: catalogue.is_published ? '#111111' : theme.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.3 }}>{catalogue.is_published ? 'PUBLICADO' : 'BORRADOR'}</Text></View>
            </View>
            <Text numberOfLines={2} style={{ color: theme.muted, fontSize: 12.5, lineHeight: 18 }}>{catalogue.description || 'Sin descripción'}</Text>
          </View>
        </View>
        <Divider />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text style={{ color: theme.yellowPressed, fontSize: 13, fontWeight: '800' }}>Administrar menú</Text>
          <View style={{ width: 30, height: 30, borderRadius: 999, backgroundColor: theme.yellow, alignItems: 'center', justifyContent: 'center' }}><ChevronRightIcon color="#111111" size={12} /></View>
        </View>
      </Pressable>
    </Link>
  );
}
