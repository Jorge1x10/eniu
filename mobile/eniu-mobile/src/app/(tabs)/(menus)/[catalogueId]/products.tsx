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
import type { Product } from '@/types/models';

export default function ProductsScreen() {
  const theme = useEniuTheme();
  const queryClient = useQueryClient();
  const { catalogueId } = useLocalSearchParams<{ catalogueId: string }>();
  const { selectedBusiness } = useBusiness();
  const key = ['products', selectedBusiness?.id, catalogueId] as const;
  const base = `businesses/${selectedBusiness?.id}/catalogues/${catalogueId}/products`;
  const query = useQuery({ queryKey: key, queryFn: () => api.get<{ products: Product[] }>(base), enabled: Boolean(selectedBusiness && catalogueId) });
  const [editing, setEditing] = useState<Product | null>(null); const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState(''); const [description, setDescription] = useState(''); const [price, setPrice] = useState(''); const [available, setAvailable] = useState(true);
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);

  function startEdit(product?: Product) { setEditing(product ?? null); setName(product?.name ?? ''); setDescription(product?.description ?? ''); setPrice(product?.price == null ? '' : String(product.price)); setAvailable(product?.is_available ?? true); setError(''); setFormOpen(true); }
  async function save() {
    if (!name.trim()) { setError('Escribe el nombre del producto.'); return; }
    if (price && !/^\d+(?:\.\d{1,2})?$/.test(price)) { setError('Usa un precio válido con máximo dos decimales.'); return; }
    setSaving(true); setError('');
    const payload = { name: name.trim(), description: description.trim(), price: price || null, category_id: editing?.category_id ?? null, is_available: available };
    try {
      const data = editing ? await api.patch<{ product: Product }>(`${base}/${editing.id}`, payload) : await api.post<{ product: Product }>(base, payload);
      queryClient.setQueryData<{ products: Product[] }>(key, (current) => ({ products: editing ? (current?.products ?? []).map((item) => item.id === editing.id ? data.product : item) : [...(current?.products ?? []), data.product] }));
      setFormOpen(false); setEditing(null);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'No fue posible guardar el producto.'); }
    finally { setSaving(false); }
  }
  function remove(product: Product) {
    Alert.alert('Eliminar producto', `¿Quieres eliminar “${product.name}”?`, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: async () => { try { await api.delete(`${base}/${product.id}`); queryClient.setQueryData<{ products: Product[] }>(key, (current) => ({ products: (current?.products ?? []).filter((item) => item.id !== product.id) })); } catch (requestError) { Alert.alert('No se pudo eliminar', requestError instanceof Error ? requestError.message : 'Intenta nuevamente.'); } } }]);
  }

  const products = query.data?.products ?? [];
  const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: selectedBusiness?.currency || 'MXN' });
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 18, paddingBottom: 100, gap: 16, backgroundColor: theme.background }}>
      <Button onPress={() => formOpen ? setFormOpen(false) : startEdit()}>{formOpen ? 'Cerrar formulario' : 'Crear producto'}</Button>
      {formOpen ? <View style={{ padding: 18, gap: 14, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 20, borderCurve: 'continuous' }}><Text style={{ color: theme.text, fontSize: 19, fontWeight: '900' }}>{editing ? 'Editar producto' : 'Nuevo producto'}</Text><FormField label="Nombre" value={name} onChangeText={setName} maxLength={64} placeholder="Hamburguesa clásica" /><FormField label="Descripción" value={description} onChangeText={setDescription} multiline placeholder="Ingredientes y detalles" /><FormField label="Precio" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="129.00" /><View style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: theme.text, fontWeight: '700' }}>Disponible</Text><Switch value={available} onValueChange={setAvailable} trackColor={{ true: theme.yellowPressed }} /></View><Feedback message={error} /><Button loading={saving} onPress={save}>Guardar producto</Button></View> : null}
      {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState message="No pudimos cargar los productos." onRetry={() => query.refetch()} /> : products.length ? <View style={{ gap: 11 }}>{products.map((product) => <Pressable key={product.id} onPress={() => startEdit(product)} onLongPress={() => remove(product)} style={({ pressed }) => ({ padding: 17, gap: 7, borderRadius: 18, borderCurve: 'continuous', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, opacity: pressed ? 0.72 : 1 })}><View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}><Text numberOfLines={1} style={{ flex: 1, color: theme.text, fontSize: 17, fontWeight: '900' }}>{product.name}</Text><Text selectable style={{ color: theme.text, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{product.price == null ? 'Sin precio' : currency.format(Number(product.price))}</Text></View><Text numberOfLines={2} style={{ color: theme.muted, lineHeight: 19 }}>{product.description || 'Sin descripción'}</Text><Text style={{ color: product.is_available ? theme.success : theme.muted, fontSize: 12, fontWeight: '800' }}>{product.is_available ? 'Disponible' : 'No disponible'} · Toca para editar · Mantén para eliminar</Text></Pressable>)}</View> : <EmptyState title="Sin productos" description="Agrega el primer producto de este menú." action="Crear producto" onAction={() => startEdit()} />}
    </ScrollView>
  );
}
