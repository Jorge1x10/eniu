import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { CreateBusinessForm } from '@/components/create-business-card';
import { LockIcon, PlusIcon } from '@/components/ui/icons';
import { useEniuTheme } from '@/constants/eniu-theme';
import { usePlan } from '@/features/auth/use-plan';
import { useBusiness } from '@/features/business/business-context';
import { useTranslation } from 'react-i18next';

export function BusinessSwitcher() {
  const { t } = useTranslation();

  const theme = useEniuTheme();
  const { businesses, selectedBusiness, selectBusiness } = useBusiness();
  const { limits, isWithin } = usePlan();
  const [creating, setCreating] = useState(false);
  const canCreate = isWithin(businesses.length, limits.max_businesses);
  if (!businesses.length) return null;
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: theme.muted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 }}>{t("Negocio")}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 4 }}>
        {businesses.map((business) => {
          const selected = business.id === selectedBusiness?.id;
          return <Pressable key={business.id} onPress={() => selectBusiness(business.id)} style={({ pressed }) => ({ minHeight: 46, justifyContent: 'center', borderRadius: 999, paddingHorizontal: 18, backgroundColor: selected ? theme.yellow : theme.surface, borderWidth: 1, borderColor: selected ? theme.yellowPressed : theme.border, opacity: pressed ? 0.7 : 1 })}><Text style={{ color: selected ? '#111111' : theme.text, fontWeight: '800' }}>{business.name}</Text></Pressable>;
        })}
        {/* La pastilla bloqueada se queda a la vista para que se note que hay más cupo en otro plan. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={canCreate ? t("Crear otro negocio") : t("Tu plan actual no permite más negocios")}
          accessibilityState={{ disabled: !canCreate }}
          disabled={!canCreate || creating}
          onPress={() => setCreating(true)}
          style={({ pressed }) => ({ minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 999, paddingHorizontal: 18, backgroundColor: theme.background, borderWidth: 1.5, borderStyle: 'dashed', borderColor: canCreate ? theme.yellowPressed : theme.border, opacity: !canCreate ? 0.5 : pressed ? 0.7 : 1 })}
        >
          {canCreate ? <PlusIcon color={theme.text} size={14} /> : <LockIcon color={theme.muted} size={13} />}
          <Text style={{ color: canCreate ? theme.text : theme.muted, fontWeight: '800' }}>{t("Nuevo")}</Text>
        </Pressable>
      </ScrollView>
      {creating ? <CreateBusinessForm onCancel={() => setCreating(false)} onCreated={(business) => selectBusiness(business.id)} /> : null}
    </View>
  );
}
