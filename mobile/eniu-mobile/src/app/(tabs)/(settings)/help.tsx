import { Linking, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ScreenHeader } from '@/components/screen-header';
import { GroupedList, ListRow } from '@/components/ui/grouped-list';
import { useEniuTheme } from '@/constants/eniu-theme';
import { PRIVACY_URL, SUPPORT_URL, TERMS_URL } from '@/constants/legal';

export default function HelpScreen() {
  const { t } = useTranslation();
  const theme = useEniuTheme();
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 16 }}>
      <ScreenHeader title={t("Ayuda y soporte")} />
      <GroupedList>
        <ListRow title={t("Centro de ayuda")} subtitle={t("Respuestas y contacto con soporte")} onPress={() => Linking.openURL(SUPPORT_URL)} />
        <ListRow title={t("Términos y condiciones")} onPress={() => Linking.openURL(TERMS_URL)} />
        <ListRow title={t("Aviso de privacidad")} onPress={() => Linking.openURL(PRIVACY_URL)} />
      </GroupedList>
    </ScrollView>
  );
}
