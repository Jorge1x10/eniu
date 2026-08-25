import { Redirect, Tabs } from 'expo-router';
import { ColorValue, Text } from 'react-native';

import { FullScreenLoader } from '@/components/ui/full-screen-loader';
import { useEniuTheme } from '@/constants/eniu-theme';
import { useAuth } from '@/features/auth/auth-context';

const tabIcons: Record<string, string> = {
  home: '⌂',
  menus: '☰',
  analytics: '▥',
  settings: '⚙',
};

function TabIcon({ name, color }: { name: keyof typeof tabIcons; color: ColorValue }) {
  return <Text style={{ color, fontSize: 20, fontWeight: '800', lineHeight: 22 }}>{tabIcons[name]}</Text>;
}

export default function WebTabsLayout() {
  const theme = useEniuTheme();
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullScreenLoader />;
  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.background },
        tabBarActiveTintColor: '#111111',
        tabBarInactiveTintColor: theme.muted,
        tabBarActiveBackgroundColor: theme.yellow,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '800' },
        tabBarItemStyle: { borderRadius: 14, marginHorizontal: 3, marginVertical: 6 },
        tabBarStyle: {
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: 12,
          height: 68,
          borderRadius: 20,
          borderTopWidth: 0,
          paddingHorizontal: 5,
          backgroundColor: theme.surface,
          boxShadow: '0 10px 30px rgba(0,0,0,0.28)',
        },
      }}
    >
      <Tabs.Screen name="(home)" options={{ title: 'Inicio', tabBarIcon: ({ color }) => <TabIcon name="home" color={color} /> }} />
      <Tabs.Screen name="(menus)" options={{ title: 'Menús', tabBarIcon: ({ color }) => <TabIcon name="menus" color={color} /> }} />
      <Tabs.Screen name="(analytics)" options={{ title: 'Analíticas', tabBarIcon: ({ color }) => <TabIcon name="analytics" color={color} /> }} />
      <Tabs.Screen name="(settings)" options={{ title: 'Ajustes', tabBarIcon: ({ color }) => <TabIcon name="settings" color={color} /> }} />
    </Tabs>
  );
}
