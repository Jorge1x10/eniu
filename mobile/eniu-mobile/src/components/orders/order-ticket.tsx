import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, useColorScheme, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

import { MesaBadge } from '@/components/orders/mesa-badge';
import { StatusChip } from '@/components/orders/status-chip';
import { TrashIcon } from '@/components/ui/icons';
import { useEniuTheme } from '@/constants/eniu-theme';
import { orderTime } from '@/features/orders/orders-context';
import { currentLocale } from '@/i18n/formats';
import type { Order, OrderItem, OrderStatus, TableLabel } from '@/types/models';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

/** Orilla recortada del ticket: semicírculos del color de lo que hay detrás. */
function TicketEdge({ color, paper, flip = false }: { color: string; paper: string; flip?: boolean }) {
  const [width, setWidth] = useState(0);
  const count = Math.ceil(width / 12) + 1;
  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ height: 8, overflow: 'hidden', backgroundColor: paper }}>
      {width ? (
        <Svg width={width} height={8}>
          {Array.from({ length: count }, (_, index) => (
            <Circle key={index} cx={index * 12 + 6} cy={flip ? 8 : 0} r={5} fill={color} />
          ))}
        </Svg>
      ) : null}
    </View>
  );
}

function Rule() {
  const theme = useEniuTheme();
  return <View style={{ borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: theme.ticketRule, marginVertical: 10 }} />;
}

type Props = {
  order: Order;
  table: TableLabel;
  currency: Intl.NumberFormat;
  /** `table`: encabezado "DAVID · 13:40" (vista por mesa). `status`: con la insignia de mesa. */
  variant?: 'table' | 'status';
  /** Color de lo que hay detrás, para recortar las orillas. */
  backdrop?: string;
  onAdvance: (status: Exclude<OrderStatus, 'pending'>) => Promise<void>;
  onReject: () => void;
  onRemoveItem: (item: OrderItem) => Promise<void>;
};

const NEXT: Partial<Record<OrderStatus, { status: Exclude<OrderStatus, 'pending'>; label: string }>> = {
  received: { status: 'preparing', label: 'Empezar a preparar' },
  preparing: { status: 'ready', label: 'Marcar listo' },
};

/**
 * La comanda: papel crema en los dos modos, con orillas recortadas, productos
 * en monoespaciada y las notas de cocina resaltadas. Quitar un producto se
 * confirma en el mismo renglón.
 */
export function OrderTicket({ order, table, currency, variant = 'status', backdrop, onAdvance, onReject, onRemoveItem }: Props) {
  const { t } = useTranslation();
  const theme = useEniuTheme();
  const isDark = useColorScheme() === 'dark';
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const ink = theme.ticketInk;
  const inkMuted = theme.ticketInkMuted;
  const behind = backdrop ?? theme.background;
  const canRemove = order.status !== 'ready' && order.status !== 'on_the_way' && order.status !== 'cancelled';
  const liveItems = order.items.filter((item) => !item.is_cancelled);
  const count = liveItems.reduce((sum, item) => sum + item.quantity, 0);
  const time = orderTime(order.created_at, currentLocale());
  // A domicilio, lo listo sale con el repartidor. Entregado es cobrar.
  const next = NEXT[order.status] ?? (order.status === 'ready' && table.delivery ? { status: 'on_the_way' as const, label: 'Salió a entregar' } : undefined);

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key);
    try { await action(); } finally { setBusy(null); }
  }

  return (
    <View style={{ ...(isDark ? null : { ...theme.cardShadow, shadowOpacity: 0.1 }) }}>
      <TicketEdge color={behind} paper={theme.ticketPaper} />
      <View style={{ backgroundColor: theme.ticketPaper, paddingHorizontal: 16, paddingVertical: 6 }}>
        {variant === 'table' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <Text style={{ fontFamily: MONO, color: ink, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 }}>{order.diner_name.toUpperCase()} · {time}</Text>
            <StatusChip status={order.status} />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <MesaBadge number={table.number} takeaway={table.takeaway} delivery={Boolean(table.delivery)} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontFamily: MONO, color: ink, fontSize: 15, fontWeight: '800' }}>{order.diner_name.toUpperCase()}</Text>
              <Text style={{ fontFamily: MONO, color: inkMuted, fontSize: 13 }}>{time}{table.delivery ? ` · ${table.delivery.zone}` : table.takeaway ? (table.phone ? ` · ${table.phone}` : '') : table.name ? ` · ${table.name}` : ''}</Text>
            </View>
            <StatusChip status={order.status} />
          </View>
        )}

        <Rule />

        <View style={{ gap: 6 }}>
          {order.items.map((item) => {
            const amount = currency.format(Number(item.line_total));
            if (confirming === item.id) {
              return (
                <View key={item.id} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ flex: 1, color: ink, fontSize: 15, fontWeight: '700' }}>{t("¿Quitarlo del pedido?")}</Text>
                  <Pressable accessibilityRole="button" onPress={() => setConfirming(null)} style={{ minHeight: 44, minWidth: 44, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: ink, fontSize: 15, fontWeight: '700' }}>{t("No")}</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy === item.id}
                    onPress={() => run(item.id, async () => { await onRemoveItem(item); setConfirming(null); })}
                    style={({ pressed }) => ({ minHeight: 40, paddingHorizontal: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#C62828', opacity: pressed ? 0.8 : 1 })}
                  >
                    {busy === item.id ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>{t("Sí, quitar")}</Text>}
                  </Pressable>
                </View>
              );
            }
            return (
              <View key={item.id} style={{ gap: 4 }}>
                <View style={{ minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontFamily: MONO, width: 28, color: item.is_cancelled ? inkMuted : ink, fontSize: 16, fontWeight: '800', textDecorationLine: item.is_cancelled ? 'line-through' : 'none' }}>{item.quantity}×</Text>
                  <Text style={{ fontFamily: MONO, flex: 1, color: item.is_cancelled ? inkMuted : ink, fontSize: 16, fontWeight: '600', textDecorationLine: item.is_cancelled ? 'line-through' : 'none' }}>{item.name}</Text>
                  <Text style={{ fontFamily: MONO, color: item.is_cancelled ? inkMuted : ink, fontSize: 14, fontVariant: ['tabular-nums'], textDecorationLine: item.is_cancelled ? 'line-through' : 'none' }}>{amount}</Text>
                  {canRemove && !item.is_cancelled ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t("Quitar {{name}} del pedido", { name: item.name })}
                      onPress={() => setConfirming(item.id)}
                      style={({ pressed }) => ({ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: pressed ? 'rgba(17,17,17,0.06)' : 'transparent' })}
                    >
                      <TrashIcon color={inkMuted} size={18} />
                    </Pressable>
                  ) : null}
                </View>
                {item.notes && !item.is_cancelled ? (
                  <View style={{ marginLeft: 36, alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: theme.noteHighlight }}>
                    <Text style={{ fontFamily: MONO, color: theme.onYellow, fontSize: 15, fontWeight: '800' }}>↳ {item.notes}</Text>
                  </View>
                ) : null}
                {item.is_cancelled ? <Text style={{ marginLeft: 36, color: inkMuted, fontSize: 13 }}>{t("Quitado por el restaurante")}</Text> : null}
              </View>
            );
          })}
        </View>

        <Rule />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: MONO, color: inkMuted, fontSize: 14 }}>{count === 1 ? t("1 producto") : t("{{count}} productos", { count })}</Text>
          <Text style={{ fontFamily: MONO, color: ink, fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{currency.format(Number(order.total))}</Text>
        </View>

        {order.status === 'pending' ? (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 6 }}>
            <Pressable accessibilityRole="button" onPress={onReject} style={({ pressed }) => ({ minHeight: 50, paddingHorizontal: 18, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(198,40,40,0.4)', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
              <Text style={{ color: '#C62828', fontSize: 16, fontWeight: '800' }}>{t("Rechazar")}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={busy === 'advance'} onPress={() => run('advance', () => onAdvance('received'))} style={({ pressed }) => ({ flex: 1, minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.yellow, opacity: pressed ? 0.8 : 1 })}>
              {busy === 'advance' ? <ActivityIndicator color={theme.onYellow} /> : <Text style={{ color: theme.onYellow, fontSize: 16, fontWeight: '800' }}>{t("Aceptar")}</Text>}
            </Pressable>
          </View>
        ) : next ? (
          <Pressable accessibilityRole="button" disabled={busy === 'advance'} onPress={() => run('advance', () => onAdvance(next.status))} style={({ pressed }) => ({ minHeight: 50, marginTop: 12, marginBottom: 6, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111111', opacity: pressed ? 0.85 : 1 })}>
            {busy === 'advance' ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>{t(next.label)}</Text>}
          </Pressable>
        ) : null}
      </View>
      <TicketEdge color={behind} paper={theme.ticketPaper} flip />
    </View>
  );
}
