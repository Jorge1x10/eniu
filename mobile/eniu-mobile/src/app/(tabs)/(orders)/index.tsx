import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { MesaBadge } from '@/components/orders/mesa-badge';
import { OrderTicket } from '@/components/orders/order-ticket';
import { EniuSwitch } from '@/components/ui/eniu-switch';
import { Feedback } from '@/components/ui/feedback';
import { LoadingState } from '@/components/ui/screen-state';
import { cardStyle, useEniuTheme } from '@/constants/eniu-theme';
import { useScreenTopPadding } from '@/constants/layout';
import { usePlan } from '@/features/auth/use-plan';
import { useBusiness } from '@/features/business/business-context';
import { useOrders } from '@/features/orders/orders-context';
import { currentLocale } from '@/i18n/formats';
import { confirmAction } from '@/lib/confirm';
import type { Order, TableAccount } from '@/types/models';

type Lane = 'pending' | 'kitchen' | 'ready';

const LANE_OF: Record<Order['status'], Lane | null> = { pending: 'pending', received: 'kitchen', preparing: 'kitchen', ready: 'ready', on_the_way: 'ready', cancelled: null };

export default function OrdersScreen() {
  const { t } = useTranslation();
  const theme = useEniuTheme();
  const topPadding = useScreenTopPadding();
  const { limits } = usePlan();
  const { selectedBusiness } = useBusiness();
  const { available, loaded, offline, accounts, ordering, setOrdering, setStatus, cancelItem, closeAccount } = useOrders();
  const [lane, setLane] = useState<Lane>('pending');
  const [error, setError] = useState('');
  const currency = new Intl.NumberFormat(currentLocale(), { style: 'currency', currency: selectedBusiness?.currency || 'MXN' });

  const entries = accounts.flatMap((account) => account.orders.map((order) => ({ order, account })));
  const byLane = (target: Lane) => entries.filter(({ order }) => LANE_OF[order.status] === target);
  const counts = { pending: byLane('pending').length, kitchen: byLane('kitchen').length, ready: byLane('ready').length };
  // Por aceptar, lo más viejo primero; en las demás, lo más reciente arriba.
  const visible = byLane(lane).sort((a, b) => (lane === 'pending' ? 1 : -1) * a.order.created_at.localeCompare(b.order.created_at));

  async function guarded(action: () => Promise<void>, fallback: string) {
    setError('');
    try { await action(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : fallback); }
  }

  function reject(order: Order) {
    confirmAction({
      title: t("¿Rechazar el pedido de {{name}}?", { name: order.diner_name }),
      message: t("Se cancelan todos sus productos y no entra en la cuenta."),
      confirmLabel: t("Rechazar"),
      onConfirm: () => guarded(() => setStatus(order.id, 'cancelled'), t("No fue posible actualizar el pedido.")),
    });
  }

  function close(account: TableAccount) {
    confirmAction({
      title: account.table.takeaway
        ? (account.table.delivery
          ? t("¿Cerrar el pedido a domicilio de {{name}}?", { name: account.table.name ?? '' })
          : t("¿Cerrar el pedido para llevar de {{name}}?", { name: account.table.name ?? '' }))
        : t("¿Cerrar la cuenta de la mesa {{number}}?", { number: account.table.number }),
      message: t("Total: {{total}}. El siguiente pedido en esta mesa abrirá una cuenta nueva.", { total: currency.format(Number(account.total)) }),
      confirmLabel: t("Cerrar cuenta"),
      onConfirm: () => guarded(() => closeAccount(account.id), t("No fue posible cerrar la cuenta.")),
    });
  }

  const lanes: { key: Lane; label: string }[] = [
    { key: 'pending', label: t("Por aceptar") },
    { key: 'kitchen', label: t("En cocina") },
    { key: 'ready', label: t("Listos") },
  ];
  const empty: Record<Lane, string> = {
    // TODO(diseño): el diseño dice "Te avisamos con un sonido"; la app vibra (ver OrdersProvider).
    pending: t("Nada por aceptar. Te avisamos cuando llegue un pedido."),
    kitchen: t("Nada en cocina ahora."),
    ready: t("Aún no hay pedidos listos."),
  };

  const planOff = ordering?.reason === 'plan' || !available;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: topPadding, paddingBottom: 24, gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 34, fontWeight: '900', letterSpacing: -1.2 }}>{t("Pedidos")}</Text>
        {ordering && !planOff ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: ordering.enabled ? theme.success : theme.muted, fontSize: 14, fontWeight: '800' }}>{ordering.enabled ? t("Recibiendo") : t("En pausa")}</Text>
            <EniuSwitch value={ordering.enabled} onValueChange={(value) => guarded(() => setOrdering(value), t("No fue posible actualizar los pedidos."))} accessibilityLabel={t("Recibir pedidos")} />
          </View>
        ) : null}
      </View>

      {planOff ? (
        <View style={{ ...cardStyle(theme, 20), padding: 18, gap: 12 }}>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800' }}>{t("Tu plan actual no incluye pedidos desde la mesa")}</Text>
          <Text style={{ color: theme.muted, fontSize: 14, lineHeight: 20 }}>{t("Tus clientes siguen viendo el menú, pero no pueden pedir desde la mesa.")}</Text>
          <Pressable accessibilityRole="link" onPress={() => router.push('/paywall')} hitSlop={10}><Text style={{ color: theme.text, fontSize: 15, fontWeight: '800', textDecorationLine: 'underline' }}>{t("Ver planes")}</Text></Pressable>
        </View>
      ) : null}
      {ordering && !ordering.enabled && ordering.reason === 'paused' ? (
        <View style={{ borderRadius: 16, padding: 14, backgroundColor: 'rgba(198,40,40,0.1)' }}>
          <Text style={{ color: theme.danger, fontSize: 14, fontWeight: '700', lineHeight: 20 }}>{t("En pausa: tus clientes ven el menú, pero no pueden pedir.")}</Text>
        </View>
      ) : null}
      {limits.orders_free_until && !planOff ? (
        <Text style={{ color: theme.muted, fontSize: 13 }}>{t("Los pedidos son gratis hasta el {{date}}.", { date: new Date(`${limits.orders_free_until}T12:00:00`).toLocaleDateString(currentLocale(), { day: 'numeric', month: 'long' }) })}</Text>
      ) : null}
      {offline ? <Feedback message={t("Sin conexión con el servidor. Reintentando…")} /> : null}
      <Feedback message={error} />

      {!planOff ? (
        <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 8 }}>
          {lanes.map((item) => {
            const selected = item.key === lane;
            const attention = item.key === 'pending' && counts.pending > 0;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={`${item.label}, ${counts[item.key]}`}
                onPress={() => setLane(item.key)}
                style={({ pressed }) => ({
                  flex: 1, height: 62, borderRadius: 16, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: selected ? theme.text : theme.surface,
                  borderWidth: attention ? 2 : 1, borderColor: attention ? theme.yellow : theme.border,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{ color: selected ? theme.background : theme.text, fontSize: 22, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{counts[item.key]}</Text>
                <Text style={{ color: selected ? theme.background : theme.muted, fontSize: 12, fontWeight: '700' }}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {planOff ? null : !loaded ? <LoadingState label={t("Cargando pedidos")} /> : visible.length ? (
        <View style={{ gap: 14 }}>
          {visible.map(({ order, account }) => (
            <OrderTicket
              key={order.id}
              order={order}
              table={account.table}
              currency={currency}
              onAdvance={(status) => guarded(() => setStatus(order.id, status), t("No fue posible actualizar el pedido."))}
              onReject={() => reject(order)}
              onRemoveItem={(item) => guarded(() => cancelItem(order.id, item.id), t("No fue posible cancelar el producto."))}
            />
          ))}
        </View>
      ) : (
        <View style={{ borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.border, padding: 24, alignItems: 'center' }}>
          <Text style={{ color: theme.muted, fontSize: 15, textAlign: 'center', lineHeight: 21 }}>{empty[lane]}</Text>
        </View>
      )}

      {/* Fuera del diseño: sin esto, desde el teléfono no había forma de cerrar
          una cuenta y la siguiente mesa se sumaría a la anterior. */}
      {!planOff && lane === 'ready' && accounts.length ? (
        <View style={{ gap: 8, marginTop: 8 }}>
          <Text accessibilityRole="header" style={{ color: theme.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', paddingHorizontal: 4 }}>{t("Cuentas abiertas")}</Text>
          <View style={{ ...cardStyle(theme, 20), overflow: 'hidden' }}>
            {accounts.map((account, index) => (
              <View key={account.id} style={{ minHeight: 68, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: index ? 1 : 0, borderTopColor: theme.border }}>
                <MesaBadge number={account.table.number} takeaway={account.table.takeaway} delivery={Boolean(account.table.delivery)} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{currency.format(Number(account.total))}</Text>
                  <Text style={{ color: theme.muted, fontSize: 13 }}>{account.pending_orders ? t("Tiene pedidos por aceptar") : account.table.delivery ? t("A domicilio · {{name}}", { name: account.table.name ?? '' }) : account.table.takeaway ? t("Para llevar · {{name}}", { name: account.table.name ?? '' }) : t("Cuenta de la mesa")}</Text>
                </View>
                <Pressable accessibilityRole="button" disabled={account.pending_orders > 0} onPress={() => close(account)} style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.border, justifyContent: 'center', opacity: account.pending_orders ? 0.4 : pressed ? 0.7 : 1 })}>
                  <Text style={{ color: theme.text, fontSize: 14, fontWeight: '800' }}>{t("Cerrar cuenta")}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}
