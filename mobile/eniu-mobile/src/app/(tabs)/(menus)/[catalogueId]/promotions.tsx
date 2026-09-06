import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Feedback } from '@/components/ui/feedback';
import { FormField } from '@/components/ui/form-field';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-state';
import { useEniuTheme } from '@/constants/eniu-theme';
import { useBusiness } from '@/features/business/business-context';
import { api } from '@/lib/api';
import type { Category, Product, Promotion } from '@/types/models';
import { useTranslation } from 'react-i18next';

/** 0 = lunes … 6 = domingo, igual que `date.weekday()` en el backend. */
const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const EMPTY: Omit<Promotion, 'id'> = {
  name: '', badge_label: '', is_active: true, days_of_week: [],
  start_date: '', end_date: '', product_ids: [], category_ids: [],
};

function toggle<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export default function PromotionsScreen() {
  const { t } = useTranslation();

  const theme = useEniuTheme();
  const queryClient = useQueryClient();
  const { catalogueId } = useLocalSearchParams<{ catalogueId: string }>();
  const { selectedBusiness } = useBusiness();
  const enabled = Boolean(selectedBusiness && catalogueId);
  const base = `businesses/${selectedBusiness?.id}/catalogues/${catalogueId}/promotions`;
  const key = ['promotions', selectedBusiness?.id, catalogueId] as const;

  const query = useQuery({ queryKey: key, queryFn: () => api.get<{ promotions: Promotion[] }>(base), enabled });
  const categoriesQuery = useQuery({ queryKey: ['categories', selectedBusiness?.id, catalogueId], queryFn: () => api.get<{ categories: Category[] }>(`businesses/${selectedBusiness?.id}/catalogues/${catalogueId}/categories`), enabled });
  const productsQuery = useQuery({ queryKey: ['products', selectedBusiness?.id, catalogueId], queryFn: () => api.get<{ products: Product[] }>(`businesses/${selectedBusiness?.id}/catalogues/${catalogueId}/products`), enabled });

  const [editing, setEditing] = useState<Promotion | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<Omit<Promotion, 'id'>>(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function startEdit(promotion?: Promotion) {
    setEditing(promotion ?? null);
    setForm(promotion
      ? { ...promotion, badge_label: promotion.badge_label ?? '', start_date: promotion.start_date ?? '', end_date: promotion.end_date ?? '' }
      : EMPTY);
    setError('');
    setFormOpen(true);
  }

  function update<K extends keyof Omit<Promotion, 'id'>>(field: K, value: Omit<Promotion, 'id'>[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setError('');
  }

  async function save() {
    if (!form.name.trim()) { setError(t("Escribe el nombre de la promoción.")); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        name: form.name.trim(),
        badge_label: form.badge_label?.trim() || null,
        is_active: form.is_active,
        days_of_week: [...form.days_of_week].sort((a, b) => a - b),
        // El backend espera AAAA-MM-DD o null; una cadena vacía sería un error.
        start_date: form.start_date?.trim() || null,
        end_date: form.end_date?.trim() || null,
        product_ids: form.product_ids,
        category_ids: form.category_ids,
      };
      const data = editing
        ? await api.patch<{ promotion: Promotion }>(`${base}/${editing.id}`, payload)
        : await api.post<{ promotion: Promotion }>(base, payload);
      queryClient.setQueryData<{ promotions: Promotion[] }>(key, (current) => ({
        promotions: editing
          ? (current?.promotions ?? []).map((item) => (item.id === editing.id ? data.promotion : item))
          : [...(current?.promotions ?? []), data.promotion],
      }));
      setFormOpen(false); setEditing(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("No fue posible guardar la promoción."));
    } finally {
      setSaving(false);
    }
  }

  function remove(promotion: Promotion) {
    Alert.alert(
      t("Eliminar promoción"),
      t("“{{name}}” dejará de resaltar productos en tu menú.", { name: promotion.name }),
      [
        { text: t("Cancelar"), style: 'cancel' },
        {
          text: t("Eliminar"),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`${base}/${promotion.id}`);
              queryClient.setQueryData<{ promotions: Promotion[] }>(key, (current) => ({ promotions: (current?.promotions ?? []).filter((item) => item.id !== promotion.id) }));
            } catch (requestError) {
              Alert.alert(t("No se pudo eliminar"), requestError instanceof Error ? requestError.message : t("Intenta nuevamente."));
            }
          },
        },
      ],
    );
  }

  const promotions = query.data?.promotions ?? [];
  const categories = categoriesQuery.data?.categories ?? [];
  const products = productsQuery.data?.products ?? [];

  const chip = (on: boolean) => ({
    minHeight: 38, justifyContent: 'center' as const, paddingHorizontal: 13, borderRadius: 999,
    backgroundColor: on ? theme.yellow : theme.background,
    borderWidth: 1, borderColor: on ? theme.yellowPressed : theme.border,
  });

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, paddingBottom: 100, gap: 16, backgroundColor: theme.background }}>
      <Text style={{ color: theme.muted, fontSize: 12.5, lineHeight: 19 }}>
        {t("Resalta productos en el menú durante días específicos. No cambia precios: les pone una etiqueta.")}
      </Text>
      <Button onPress={() => (formOpen ? setFormOpen(false) : startEdit())}>{formOpen ? t("Cerrar formulario") : t("Crear promoción")}</Button>

      {formOpen ? (
        <View style={{ padding: 18, gap: 15, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 20, borderCurve: 'continuous' }}>
          <Text style={{ color: theme.text, fontSize: 19, fontWeight: '900' }}>{editing ? t("Editar promoción") : t("Nueva promoción")}</Text>
          <FormField label={t("Nombre")} value={form.name} onChangeText={(value) => update('name', value)} maxLength={64} placeholder={t("Martes de tacos")} />
          <FormField label={t("Etiqueta")} value={form.badge_label ?? ''} onChangeText={(value) => update('badge_label', value)} maxLength={24} placeholder={t("2x1 hoy")} />
          <Text style={{ color: theme.muted, fontSize: 11.5, lineHeight: 16, marginTop: -8 }}>{t("Es lo que se lee sobre el producto. Si la dejas vacía, usamos el nombre.")}</Text>

          <View style={{ gap: 8 }}>
            <Text style={{ color: theme.text, fontSize: 13, fontWeight: '700' }}>{t("Días de la promoción")}</Text>
            <Text style={{ color: theme.muted, fontSize: 11.5, lineHeight: 16 }}>{t("Sin días marcados, aplica todos los días.")}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
              {DAY_LABELS.map((label, index) => {
                const on = form.days_of_week.includes(index);
                return (
                  <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => update('days_of_week', toggle(form.days_of_week, index))} style={({ pressed }) => ({ ...chip(on), opacity: pressed ? 0.75 : 1 })}>
                    <Text style={{ color: on ? theme.onYellow : theme.text, fontSize: 13, fontWeight: on ? '800' : '600' }}>{t(label)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><FormField label={t("Desde")} value={form.start_date ?? ''} onChangeText={(value) => update('start_date', value)} placeholder="2026-01-31" autoCapitalize="none" /></View>
            <View style={{ flex: 1 }}><FormField label={t("Hasta")} value={form.end_date ?? ''} onChangeText={(value) => update('end_date', value)} placeholder="2026-02-28" autoCapitalize="none" /></View>
          </View>
          <Text style={{ color: theme.muted, fontSize: 11.5, lineHeight: 16, marginTop: -8 }}>{t("Opcional, con formato AAAA-MM-DD. Déjalas vacías para que no caduque.")}</Text>

          <View style={{ minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14 }}>{t("Promoción activa")}</Text>
            <Switch value={form.is_active} onValueChange={(value) => update('is_active', value)} trackColor={{ true: theme.yellowPressed }} />
          </View>

          {categories.length ? (
            <View style={{ gap: 8 }}>
              <Text style={{ color: theme.text, fontSize: 13, fontWeight: '700' }}>{t("Categorías incluidas")}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                {categories.map((category) => {
                  const on = form.category_ids.includes(category.id);
                  return (
                    <Pressable key={category.id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => update('category_ids', toggle(form.category_ids, category.id))} style={({ pressed }) => ({ ...chip(on), opacity: pressed ? 0.75 : 1 })}>
                      <Text style={{ color: on ? theme.onYellow : theme.text, fontSize: 13, fontWeight: on ? '800' : '600' }}>{category.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {products.length ? (
            <View style={{ gap: 8 }}>
              <Text style={{ color: theme.text, fontSize: 13, fontWeight: '700' }}>{t("Productos incluidos")}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                {products.map((product) => {
                  const on = form.product_ids.includes(product.id);
                  return (
                    <Pressable key={product.id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => update('product_ids', toggle(form.product_ids, product.id))} style={({ pressed }) => ({ ...chip(on), opacity: pressed ? 0.75 : 1 })}>
                      <Text style={{ color: on ? theme.onYellow : theme.text, fontSize: 13, fontWeight: on ? '800' : '600' }}>{product.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <Feedback message={error} />
          <Button loading={saving} onPress={save}>{t("Guardar promoción")}</Button>
        </View>
      ) : null}

      {promotions.length ? <Text style={{ color: theme.muted, fontSize: 12.5, lineHeight: 19 }}>{t("Toca una promoción para editarla, mantén presionado para eliminarla.")}</Text> : null}

      {query.isLoading ? <LoadingState /> : query.isError ? (
        <ErrorState message={t("No pudimos cargar las promociones.")} error={query.error} onRetry={() => query.refetch()} />
      ) : promotions.length ? (
        <View style={{ gap: 10 }}>
          {promotions.map((promotion) => {
            const days = promotion.days_of_week.length ? promotion.days_of_week.map((day) => t(DAY_LABELS[day])).join(', ') : t("Todos los días");
            return (
              <Pressable
                key={promotion.id}
                onPress={() => startEdit(promotion)}
                onLongPress={() => remove(promotion)}
                style={({ pressed }) => ({ padding: 16, borderRadius: 18, borderCurve: 'continuous', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, gap: 5, opacity: pressed ? 0.72 : 1 })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                  <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700', flex: 1, minWidth: 0 }}>{promotion.name}</Text>
                  <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: promotion.is_active ? theme.cream : theme.surfaceAlt }}>
                    <Text style={{ color: promotion.is_active ? theme.onYellow : theme.muted, fontSize: 11, fontWeight: '800' }}>{promotion.is_active ? t("Activa") : t("Inactiva")}</Text>
                  </View>
                </View>
                <Text style={{ color: theme.muted, fontSize: 12.5 }}>{t("Etiqueta")}: {promotion.badge_label || promotion.name}</Text>
                <Text style={{ color: theme.muted, fontSize: 12.5 }}>{days}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <EmptyState title={t("Sin promociones")} description={t("Crea una promoción para resaltar productos en días específicos.")} action={t("Crear promoción")} onAction={() => startEdit()} />
      )}
    </ScrollView>
  );
}
