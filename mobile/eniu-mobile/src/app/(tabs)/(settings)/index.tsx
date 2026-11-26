import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { EniuSwitch } from '@/components/ui/eniu-switch';
import { GroupedList, ListRow } from '@/components/ui/grouped-list';
import { BellIcon, ChevronRightIcon, ClockIcon, GlobeIcon, HelpIcon, MoonIcon, StoreIcon } from '@/components/ui/icons';
import { useEniuTheme } from '@/constants/eniu-theme';
import { useScreenTopPadding } from '@/constants/layout';
import { useAuth } from '@/features/auth/auth-context';
import { useBusiness } from '@/features/business/business-context';
import { getMilestoneNotificationsEnabled, setMilestoneNotificationsEnabled } from '@/features/milestones/milestone-store';
import { useLanguage } from '@/i18n/language-context';

const LANGUAGE_OPTIONS = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
] as const;

/** "CDMX" en vez de "America/Mexico_City": la ciudad es lo que se reconoce. */
function cityOf(timezone?: string | null) {
  if (!timezone) return '';
  if (timezone === 'America/Mexico_City') return 'CDMX';
  return timezone.split('/').pop()?.replace(/_/g, ' ') ?? timezone;
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const theme = useEniuTheme();
  const isDark = useColorScheme() === 'dark';
  const topPadding = useScreenTopPadding();
  const { user, logout } = useAuth();
  const { selectedBusiness } = useBusiness();
  const { language, changeLanguage, isSaving: isSavingLanguage } = useLanguage();
  const [milestones, setMilestones] = useState(true);
  useEffect(() => { getMilestoneNotificationsEnabled().then(setMilestones); }, []);

  async function toggleMilestones(value: boolean) { setMilestones(value); await setMilestoneNotificationsEnabled(value); }

  function confirmLogout() {
    // En web `Alert` no muestra botones; allí se confirma con el diálogo del navegador.
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(t("¿Quieres salir de Eniu en este dispositivo?"))) logout();
      return;
    }
    Alert.alert(t("Cerrar sesión"), t("¿Quieres salir de Eniu en este dispositivo?"), [
      { text: t("Cancelar"), style: 'cancel' },
      { text: t("Cerrar sesión"), style: 'destructive', onPress: logout },
    ]);
  }

  const name = user?.name || user?.username || '';
  const accountCard = isDark ? theme.surfaceAlt : theme.authHero;
  const onCard = isDark ? theme.text : theme.heroText;
  const onCardMuted = isDark ? theme.muted : theme.heroMuted;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: topPadding, paddingBottom: 24, gap: 20 }}>
      <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 34, fontWeight: '900', letterSpacing: -1.2 }}>{t("Ajustes")}</Text>

      <View style={{ borderRadius: 22, borderCurve: 'continuous', backgroundColor: accountCard, overflow: 'hidden' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("{{name}}. Perfil y cuenta", { name })}
          onPress={() => router.push('/(tabs)/(settings)/profile')}
          style={({ pressed }) => ({ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, opacity: pressed ? 0.8 : 1 })}
        >
          <View style={{ width: 52, height: 52, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.yellow }}>
            <Text style={{ color: theme.onYellow, fontSize: 22, fontWeight: '900' }}>{(name || 'E').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text numberOfLines={1} style={{ color: onCard, fontSize: 18, fontWeight: '800' }}>{name}</Text>
            {/* TODO(diseño): el diseño dice "Perfil, contraseña y cuenta", pero la
                app no tiene cambio de contraseña; no se promete lo que no hay. */}
            <Text style={{ color: onCardMuted, fontSize: 13 }}>{t("Perfil y cuenta")}</Text>
          </View>
          <ChevronRightIcon color={onCardMuted} size={12} />
        </Pressable>
        <View style={{ height: 1, backgroundColor: isDark ? theme.border : 'rgba(251,247,236,0.1)' }} />
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ flex: 1, color: onCard, fontSize: 15, fontWeight: '700' }}>{user?.plan?.name || t("Plan gratuito")}</Text>
          {user?.plan?.has_access ? (
            <Text style={{ color: onCardMuted, fontSize: 13 }}>{t("Activo")}</Text>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => router.push('/paywall')} style={({ pressed }) => ({ minHeight: 36, paddingHorizontal: 14, borderRadius: 99, backgroundColor: theme.yellow, justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}>
              <Text style={{ color: theme.onYellow, fontSize: 14, fontWeight: '800' }}>{t("Mejorar plan")}</Text>
            </Pressable>
          )}
        </View>
      </View>
      {user?.plan?.has_access ? <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 18, marginTop: -10, paddingHorizontal: 4 }}>{t("Administra o cancela tu suscripción desde los ajustes de suscripciones de tu dispositivo.")}</Text> : null}

      {selectedBusiness ? (
        <GroupedList title={t("Negocio")}>
          <ListRow icon={<StoreIcon color={theme.onYellow} size={18} />} title={t("Mi negocio")} value={selectedBusiness.name} onPress={() => router.push('/(tabs)/(settings)/business-profile')} />
          <ListRow icon={<ClockIcon color={theme.onYellow} size={18} />} title={t("Moneda y horario")} value={`${selectedBusiness.currency || 'MXN'} · ${cityOf(selectedBusiness.timezone)}`} onPress={() => router.push('/(tabs)/(settings)/regional')} />
        </GroupedList>
      ) : null}

      <GroupedList title={t("Aplicación")}>
        <ListRow
          icon={<GlobeIcon color={theme.onYellow} size={18} />}
          title={t("Idioma")}
          trailing={(
            <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 4, backgroundColor: theme.surfaceAlt, borderRadius: 11, borderCurve: 'continuous', padding: 3 }}>
              {LANGUAGE_OPTIONS.map((option) => {
                const on = option.code === language;
                return (
                  <Pressable
                    key={option.code}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on, disabled: isSavingLanguage }}
                    disabled={isSavingLanguage}
                    onPress={() => void changeLanguage(option.code)}
                    style={({ pressed }) => ({ minHeight: 36, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', borderRadius: 9, borderCurve: 'continuous', backgroundColor: on ? theme.surface : 'transparent', opacity: pressed || isSavingLanguage ? 0.7 : 1 })}
                  >
                    <Text style={{ color: on ? theme.text : theme.muted, fontSize: 13, fontWeight: '800' }}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        />
        <ListRow icon={<MoonIcon color={theme.onYellow} size={18} />} title={t("Apariencia")} value={t("Automática")} />
        <ListRow
          icon={<BellIcon color={theme.onYellow} size={18} />}
          title={t("Avisos de logros")}
          subtitle={t("Cuando alcances una meta de vistas")}
          trailing={<EniuSwitch value={milestones} onValueChange={toggleMilestones} accessibilityLabel={t("Avisos de logros")} />}
        />
      </GroupedList>

      <GroupedList>
        <ListRow icon={<HelpIcon color={theme.onYellow} size={18} />} title={t("Ayuda y soporte")} onPress={() => router.push('/(tabs)/(settings)/help')} />
        <ListRow title={t("Cerrar sesión")} destructive onPress={confirmLogout} />
      </GroupedList>

      {/* La versión es lo primero que se pide al reportar un fallo. */}
      <Text style={{ color: theme.muted, fontSize: 13, textAlign: 'center' }}>{t("Eniu · versión {{version}}", { version: Constants.expoConfig?.version ?? '—' })}</Text>
    </ScrollView>
  );
}
