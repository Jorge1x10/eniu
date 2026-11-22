import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { ReactNode } from 'react';
import { Pressable, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useEniuTheme } from '@/constants/eniu-theme';

export type TabIconRenderer = (color: string) => ReactNode;

/**
 * Barra de pestañas flotante: una pastilla de 64 de alto, a 16 de los lados y
 * despegada del borde inferior. La pestaña activa se invierte (en claro, fondo
 * oscuro con ícono amarillo; en oscuro, fondo amarillo) para que se vea de un
 * vistazo dónde se está.
 *
 * Va en el flujo, no superpuesta: así ninguna pantalla tiene que reservarle
 * espacio al final de su contenido.
 */
export function EniuTabBar({ state, descriptors, navigation, icons }: BottomTabBarProps & { icons: Record<string, TabIconRenderer> }) {
  const theme = useEniuTheme();
  const isDark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();

  const routes = state.routes.filter((route) => {
    const style = descriptors[route.key].options.tabBarItemStyle as { display?: string } | undefined;
    return style?.display !== 'none';
  });

  return (
    <View style={{ backgroundColor: theme.background, paddingHorizontal: 16, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
      <View
        accessibilityRole="tablist"
        style={{
          height: 64, borderRadius: 22, borderCurve: 'continuous', flexDirection: 'row', alignItems: 'center', padding: 6, gap: 4,
          backgroundColor: isDark ? theme.surface : '#FFFFFF',
          borderWidth: isDark ? 1 : 0, borderColor: theme.border,
          ...(isDark ? null : { ...theme.cardShadow, shadowOpacity: 0.12 }),
        }}
      >
        {routes.map((route) => {
          const { options } = descriptors[route.key];
          const focused = state.routes[state.index]?.key === route.key;
          const label = options.title ?? route.name;
          const color = focused ? (isDark ? theme.onYellow : theme.yellow) : theme.muted;
          const labelColor = focused ? (isDark ? theme.onYellow : theme.heroText) : theme.muted;
          const badge = options.tabBarBadge;

          function onPress() {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              Haptics.selectionAsync();
              navigation.navigate(route.name, route.params);
            }
          }

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={badge ? `${label}, ${badge}` : label}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              style={({ pressed }) => ({
                flex: 1, height: 52, borderRadius: 17, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', gap: 3,
                backgroundColor: focused ? (isDark ? theme.yellow : theme.authHero) : 'transparent',
                opacity: pressed && !focused ? 0.6 : 1,
              })}
            >
              <View>
                {icons[route.name]?.(color)}
                {badge !== undefined ? (
                  <View style={{ position: 'absolute', top: -6, right: -12, minWidth: 18, height: 18, borderRadius: 99, paddingHorizontal: 5, backgroundColor: theme.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: isDark ? theme.surface : '#FFFFFF' }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text numberOfLines={1} style={{ color: labelColor, fontSize: 11, fontWeight: '700' }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
