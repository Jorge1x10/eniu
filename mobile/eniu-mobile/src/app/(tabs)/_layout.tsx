import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { EniuTabBar, TabIconRenderer } from '@/components/tab-bar';
import { FullScreenLoader } from '@/components/ui/full-screen-loader';
import { BarsIcon, BookIcon, GearIcon, HomeIcon, ReceiptIcon } from '@/components/ui/icons';
import { useEniuTheme } from '@/constants/eniu-theme';
import { useAuth } from '@/features/auth/auth-context';
import { OrdersProvider, useOrders } from '@/features/orders/orders-context';

const ICONS: Record<string, TabIconRenderer> = {
  '(home)': (color) => <HomeIcon color={color} />,
  '(orders)': (color) => <ReceiptIcon color={color} />,
  '(menus)': (color) => <BookIcon color={color} />,
  '(analytics)': (color) => <BarsIcon color={color} />,
  '(settings)': (color) => <GearIcon color={color} />,
};

/**
 * Pestañas en JavaScript con una barra propia (`EniuTabBar`), la misma en iOS,
 * Android y web. Las nativas no dejan dibujar la pastilla flotante ni el globo
 * de pedidos por aceptar con el diseño de Eniu.
 */
export default function TabsLayout() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullScreenLoader />;
  if (!user) return <Redirect href="/(auth)/login" />;
  // Una sola consulta en vivo de pedidos para toda la app: la pestaña, su
  // globo de pendientes e Inicio leen de aquí.
  return <OrdersProvider><EniuTabs /></OrdersProvider>;
}

function EniuTabs() {
  const { t } = useTranslation();
  const theme = useEniuTheme();
  const { available, pendingCount } = useOrders();

  return (
    <Tabs
      tabBar={(props) => <EniuTabBar {...props} icons={ICONS} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: theme.background } }}
    >
      <Tabs.Screen name="(home)" options={{ title: t("Inicio") }} />
      {/* Sólo si el plan incluye pedidos; si no, la barra queda con cuatro. */}
      <Tabs.Screen name="(orders)" options={{ title: t("Pedidos"), href: available ? undefined : null, tabBarBadge: pendingCount ? pendingCount : undefined }} />
      <Tabs.Screen name="(menus)" options={{ title: t("Menús") }} />
      <Tabs.Screen name="(analytics)" options={{ title: t("Analíticas") }} />
      <Tabs.Screen name="(settings)" options={{ title: t("Ajustes") }} />
    </Tabs>
  );
}
