import { Modal, Pressable, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheckIcon } from '@/components/ui/icons';
import { upcomingMilestone } from '@/features/milestones/milestone-store';

type Props = {
  visible: boolean;
  milestone: number;
  catalogueName: string;
  isPublished: boolean;
  hasScans: boolean;
  publicUrl?: string | null;
  onDismiss: () => void;
};

function Check({ done, label }: { done: boolean; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: done ? '#111111' : 'rgba(17,17,17,0.14)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {done ? <CheckIcon color="#FFE05A" size={13} /> : null}
      </View>
      <Text style={{ color: done ? '#2A2A2A' : '#5C5646', fontWeight: '600', fontSize: 13 }}>{label}</Text>
    </View>
  );
}

export function MilestoneSheet({ visible, milestone, catalogueName, isPublished, hasScans, publicUrl, onDismiss }: Props) {
  const next = upcomingMilestone(milestone);
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={{ flex: 1, backgroundColor: 'rgba(17,17,17,0.42)', justifyContent: 'flex-end' }}>
        <View style={{ borderTopLeftRadius: 32, borderTopRightRadius: 32, borderCurve: 'continuous', backgroundColor: '#FFE05A', padding: 26, paddingBottom: Math.max(24, insets.bottom) + 16, gap: 0 }}>
          <View style={{ width: 44, height: 5, borderRadius: 99, backgroundColor: 'rgba(17,17,17,0.22)', alignSelf: 'center', marginBottom: 26 }} />
          <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1.6, textTransform: 'uppercase', color: '#8A7420' }}>Nuevo logro</Text>
          <Text style={{ fontWeight: '900', fontSize: 72, lineHeight: 76, letterSpacing: -3, color: '#111111', fontVariant: ['tabular-nums'], marginTop: 12 }}>{milestone.toLocaleString('es-MX')}</Text>
          <Text style={{ fontWeight: '800', fontSize: 22, lineHeight: 28, letterSpacing: -0.4, color: '#111111', marginTop: 6 }}>vistas en {catalogueName}</Text>
          <Text style={{ fontSize: 14, lineHeight: 21, color: '#2A2A2A', marginTop: 12, maxWidth: 300 }}>Tus clientes están descubriendo tu menú. Sigue así.</Text>

          <View style={{ marginTop: 22, borderRadius: 18, backgroundColor: 'rgba(255,253,245,0.72)', padding: 16, gap: 12 }}>
            <Check done={isPublished} label="Menú publicado" />
            <Check done={hasScans} label="Primer escaneo de QR" />
            {next ? <Check done={false} label={`Siguiente meta: ${next.toLocaleString('es-MX')} vistas`} /> : null}
          </View>

          <Pressable
            onPress={() => { if (publicUrl) Share.share({ title: catalogueName, message: publicUrl, url: publicUrl }); }}
            style={({ pressed }) => ({ height: 52, borderRadius: 15, backgroundColor: '#111111', alignItems: 'center', justifyContent: 'center', marginTop: 22, opacity: pressed ? 0.8 : 1 })}
          >
            <Text style={{ color: '#FFE05A', fontWeight: '700', fontSize: 15 }}>Compartir el logro</Text>
          </Pressable>
          <Pressable onPress={onDismiss} style={({ pressed }) => ({ height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ color: '#2A2A2A', fontWeight: '600', fontSize: 14 }}>Seguir</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
