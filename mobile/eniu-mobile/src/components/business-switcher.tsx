import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CreateBusinessForm } from '@/components/create-business-card';
import { ChevronDownIcon, LockIcon, PlusIcon } from '@/components/ui/icons';
import { cardStyle, useEniuTheme } from '@/constants/eniu-theme';
import { usePlan } from '@/features/auth/use-plan';
import { useBusiness } from '@/features/business/business-context';
import { useBusinessesTodayViews } from '@/features/business/business-views';
import { useTranslation } from 'react-i18next';

function initialOf(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?';
}

/**
 * Control de negocio activo: una fila compacta que abre una hoja inferior con
 * el resto de negocios. `variant="dark"` se usa incrustado en la cabecera
 * oscura de Inicio; `variant="light"` (por defecto) es la tarjeta clara que
 * aparece en Menús, Analíticas y Ajustes.
 */
export function BusinessSwitcher({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const { t } = useTranslation();

  const theme = useEniuTheme();
  const insets = useSafeAreaInsets();
  const { businesses, selectedBusiness, selectBusiness } = useBusiness();
  const { limits, isWithin } = usePlan();
  const summaries = useBusinessesTodayViews(businesses, limits.allow_analytics);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const canCreate = isWithin(businesses.length, limits.max_businesses);
  if (!businesses.length || !selectedBusiness) return null;

  const dark = variant === 'dark';
  const businessCountLabel = businesses.length === 1 ? t("1 negocio") : t("{{count}} negocios", { count: businesses.length });

  function close() { setOpen(false); setCreating(false); }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t("Cambiar de negocio")}
        style={({ pressed }) => ({
          ...(dark ? {} : cardStyle(theme, 18)),
          flexDirection: 'row', alignItems: 'center', gap: dark ? 11 : 12,
          padding: dark ? 0 : 13, opacity: pressed ? 0.75 : 1,
        })}
      >
        <View style={{ width: dark ? 40 : 36, height: dark ? 40 : 36, borderRadius: dark ? 13 : 12, backgroundColor: theme.yellow, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Text style={{ color: theme.onYellow, fontSize: dark ? 17 : 15, fontWeight: '900' }}>{initialOf(selectedBusiness.name)}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
          <Text style={{ color: dark ? theme.heroMuted : theme.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' }}>{t("Negocio activo")}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text numberOfLines={1} style={{ color: dark ? '#FFFDF5' : theme.text, fontSize: dark ? 16 : 15, fontWeight: '800', flexShrink: 1 }}>{selectedBusiness.name}</Text>
            <ChevronDownIcon color={dark ? theme.yellow : theme.muted} size={11} />
          </View>
        </View>
        <View style={{ minHeight: 25, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 999, backgroundColor: dark ? 'rgba(255,255,255,0.09)' : theme.surfaceAlt, flexShrink: 0 }}>
          <Text style={{ color: dark ? '#C7C1B4' : theme.muted, fontSize: 11, fontWeight: '700' }}>{businessCountLabel}</Text>
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(17,15,12,0.5)', justifyContent: 'flex-end' }} onPress={close}>
          <View onStartShouldSetResponder={() => true} style={{ backgroundColor: theme.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderCurve: 'continuous', padding: 18, paddingBottom: Math.max(20, insets.bottom) + 14, gap: 14, maxHeight: '82%' }}>
            <View style={{ width: 44, height: 5, borderRadius: 99, backgroundColor: theme.border, alignSelf: 'center' }} />
            <Text style={{ color: theme.text, fontSize: 19, fontWeight: '900' }}>{t("Cambiar de negocio")}</Text>
            <ScrollView contentContainerStyle={{ gap: 10 }} showsVerticalScrollIndicator={false}>
              {businesses.map((business) => {
                const selected = business.id === selectedBusiness.id;
                const summary = summaries.get(business.id);
                const menusLabel = summary && summary.catalogueCount === 1 ? t("1 menú") : t("{{count}} menús", { count: summary?.catalogueCount ?? 0 });
                return (
                  <Pressable
                    key={business.id}
                    onPress={() => { selectBusiness(business.id); close(); }}
                    style={({ pressed }) => ({ padding: 14, borderRadius: 18, borderCurve: 'continuous', backgroundColor: theme.surface, borderWidth: 1.5, borderColor: selected ? theme.yellowPressed : theme.border, flexDirection: 'row', alignItems: 'center', gap: 13, opacity: pressed ? 0.75 : 1 })}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: selected ? theme.yellow : theme.surfaceAlt, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Text style={{ color: theme.onYellow, fontSize: 16, fontWeight: '900' }}>{initialOf(business.name)}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                      <Text numberOfLines={1} style={{ color: theme.text, fontSize: 14.5, fontWeight: '800' }}>{business.name}</Text>
                      <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 11.5 }}>{menusLabel}{limits.allow_analytics ? ` · ${t("{{count}} vistas hoy", { count: summary?.views ?? 0 })}` : ''}</Text>
                    </View>
                    {limits.allow_analytics ? <Text style={{ color: theme.text, fontSize: 17, fontWeight: '900', fontVariant: ['tabular-nums'], flexShrink: 0 }}>{summary?.isLoading ? '—' : (summary?.views ?? 0)}</Text> : null}
                  </Pressable>
                );
              })}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={canCreate ? t("Crear otro negocio") : t("Tu plan actual no permite más negocios")}
                accessibilityState={{ disabled: !canCreate }}
                disabled={!canCreate || creating}
                onPress={() => setCreating(true)}
                style={({ pressed }) => ({ padding: 14, borderRadius: 18, borderCurve: 'continuous', borderWidth: 1.5, borderStyle: 'dashed', borderColor: canCreate ? theme.yellowPressed : theme.border, flexDirection: 'row', alignItems: 'center', gap: 13, opacity: !canCreate ? 0.5 : pressed ? 0.7 : 1 })}
              >
                <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {canCreate ? <PlusIcon color={theme.yellowPressed} size={16} /> : <LockIcon color={theme.muted} size={14} />}
                </View>
                <Text style={{ color: canCreate ? theme.text : theme.muted, fontSize: 14.5, fontWeight: '800' }}>{t("Agregar negocio")}</Text>
              </Pressable>
              {creating ? <CreateBusinessForm onCancel={() => setCreating(false)} onCreated={(business) => { selectBusiness(business.id); close(); }} /> : null}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
