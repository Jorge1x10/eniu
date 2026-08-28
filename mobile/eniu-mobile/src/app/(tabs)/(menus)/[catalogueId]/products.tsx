import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';

import { MAX_PICTURES, ProductImagePicker, type DefaultKey, type PickedPicture } from '@/components/product-images';
import { Button } from '@/components/ui/button';
import { Feedback } from '@/components/ui/feedback';
import { FormField } from '@/components/ui/form-field';
import { ImageIcon } from '@/components/ui/icons';
import { PlanNotice } from '@/components/ui/plan-notice';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-state';
import { useEniuTheme } from '@/constants/eniu-theme';
import { usePlan } from '@/features/auth/use-plan';
import { useBusiness } from '@/features/business/business-context';
import { api, resolveMediaUrl } from '@/lib/api';
import { appendImage } from '@/lib/image-file';
import type { Category, Product, ProductPicture } from '@/types/models';

const UNCATEGORIZED = 'uncategorized';

function defaultPicture(product: Product) {
  const pictures = product.pictures ?? [];
  return pictures.find((picture) => picture.is_default) ?? pictures[0] ?? null;
}

function ProductRow({ product, currency, theme, onPress, onLongPress }: { product: Product; currency: Intl.NumberFormat; theme: ReturnType<typeof useEniuTheme>; onPress: () => void; onLongPress: () => void }) {
  const picture = defaultPicture(product);
  const uri = resolveMediaUrl(picture?.url);
  const extra = (product.pictures?.length ?? 0) - 1;
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={({ pressed }) => ({ borderRadius: 18, borderCurve: 'continuous', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 13, opacity: pressed ? 0.72 : 1 })}>
      {uri ? (
        <View style={{ width: 58, height: 58, borderRadius: 13, borderCurve: 'continuous', overflow: 'hidden', flexShrink: 0, backgroundColor: theme.surfaceAlt }}>
          <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} />
          {extra > 0 ? <View style={{ position: 'absolute', right: 3, bottom: 3, minWidth: 20, paddingHorizontal: 5, height: 17, borderRadius: 999, backgroundColor: 'rgba(17,17,17,0.7)', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>+{extra}</Text></View> : null}
        </View>
      ) : (
        <View style={{ width: 58, height: 58, borderRadius: 13, borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.yellowPressed, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><ImageIcon color={theme.yellowPressed} size={20} /></View>
      )}
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Text numberOfLines={1} style={{ color: theme.text, fontSize: 15, fontWeight: '700' }}>{product.name}</Text>
        <Text numberOfLines={1} style={{ color: uri ? theme.muted : theme.yellowPressed, fontSize: 12, fontWeight: uri ? '400' : '600' }}>{uri ? (product.description || 'Sin descripción') : 'Súbele una foto y se ve 3× más'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 1 }}>
          <View style={{ width: 6, height: 6, borderRadius: 99, backgroundColor: product.is_available ? theme.success : theme.muted }} />
          <Text style={{ color: product.is_available ? theme.success : theme.muted, fontSize: 11, fontWeight: '600' }}>{product.is_available ? 'Disponible' : 'Agotado'}</Text>
        </View>
      </View>
      <Text selectable style={{ color: theme.text, fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'], flexShrink: 0 }}>{product.price == null ? 'S/P' : currency.format(Number(product.price))}</Text>
    </Pressable>
  );
}

/**
 * Categoría del producto. Antes no había forma de asignarla desde el teléfono:
 * un producto nuevo siempre nacía sin categoría y al editarlo se conservaba la
 * que tuviera, así que las secciones del menú sólo se podían armar desde la web.
 */
function CategorySelector({ categories, value, onChange, theme }: { categories: Category[]; value: string | null; onChange: (value: string | null) => void; theme: ReturnType<typeof useEniuTheme> }) {
  const options: { id: string | null; name: string }[] = [{ id: null, name: 'Sin categoría' }, ...categories.map((category) => ({ id: category.id as string | null, name: category.name }))];
  return (
    <View style={{ gap: 7 }}>
      <Text style={{ color: theme.text, fontSize: 13, fontWeight: '700' }}>Categoría</Text>
      {categories.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
          {options.map((option) => {
            const on = option.id === value;
            return (
              <Pressable
                key={option.id ?? 'none'}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => onChange(option.id)}
                style={({ pressed }) => ({ minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 999, backgroundColor: on ? theme.yellow : theme.background, borderWidth: 1, borderColor: on ? theme.yellowPressed : theme.border, opacity: pressed ? 0.75 : 1 })}
              >
                <Text style={{ color: on ? theme.onYellow : theme.text, fontSize: 13, fontWeight: on ? '800' : '600' }}>{option.name}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 18 }}>Aún no hay categorías en este menú. Créalas desde «Categorías» para agrupar tus productos.</Text>
      )}
    </View>
  );
}

export default function ProductsScreen() {
  const theme = useEniuTheme();
  const queryClient = useQueryClient();
  const { limits, isWithin } = usePlan();
  const { catalogueId } = useLocalSearchParams<{ catalogueId: string }>();
  const { selectedBusiness } = useBusiness();
  const key = ['products', selectedBusiness?.id, catalogueId] as const;
  const base = `businesses/${selectedBusiness?.id}/catalogues/${catalogueId}/products`;
  const query = useQuery({ queryKey: key, queryFn: () => api.get<{ products: Product[] }>(base), enabled: Boolean(selectedBusiness && catalogueId) });
  const categoriesQuery = useQuery({ queryKey: ['categories', selectedBusiness?.id, catalogueId], queryFn: () => api.get<{ categories: Category[] }>(`businesses/${selectedBusiness?.id}/catalogues/${catalogueId}/categories`), enabled: Boolean(selectedBusiness && catalogueId) });
  const [editing, setEditing] = useState<Product | null>(null); const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState(''); const [description, setDescription] = useState(''); const [price, setPrice] = useState(''); const [available, setAvailable] = useState(true);
  const [existingPictures, setExistingPictures] = useState<ProductPicture[]>([]);
  const [pickedPictures, setPickedPictures] = useState<PickedPicture[]>([]);
  const [defaultKey, setDefaultKey] = useState<DefaultKey>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  // El filtro sólo decide qué se ve en la lista; la categoría del producto se
  // elige en el formulario, no arrastrando la sección activa.
  const [filter, setFilter] = useState<string | null>(null);

  function startEdit(product?: Product) {
    setEditing(product ?? null); setName(product?.name ?? ''); setDescription(product?.description ?? ''); setPrice(product?.price == null ? '' : String(product.price)); setAvailable(product?.is_available ?? true);
    setCategoryId(product?.category_id ?? null);
    const pictures = product?.pictures ?? [];
    setExistingPictures(pictures); setPickedPictures([]);
    setDefaultKey(pictures.find((picture) => picture.is_default)?.id ?? pictures[0]?.id ?? null);
    setError(''); setFormOpen(true);
  }

  async function save() {
    if (!name.trim()) { setError('Escribe el nombre del producto.'); return; }
    if (price && !/^\d+(?:\.\d{1,2})?$/.test(price)) { setError('Usa un precio válido con máximo dos decimales.'); return; }
    if (existingPictures.length + pickedPictures.length > MAX_PICTURES) { setError(`Puedes agregar máximo ${MAX_PICTURES} imágenes.`); return; }
    setSaving(true); setError('');
    const fields = { name: name.trim(), description: description.trim(), price: price || null, category_id: categoryId, is_available: available };
    // Sólo se envía multipart cuando hay fotos nuevas o se quitó/reordenó alguna;
    // así una edición de texto sigue siendo un JSON simple.
    const removedPicture = editing ? existingPictures.length !== (editing.pictures?.length ?? 0) : false;
    const usesForm = pickedPictures.length > 0 || removedPicture;
    try {
      let data: { product: Product };
      if (usesForm) {
        const form = new FormData();
        Object.entries(fields).forEach(([field, value]) => form.append(field, value == null ? '' : String(value)));
        pickedPictures.forEach((picture) => appendImage(form, 'images', picture));
        if (editing) {
          form.append('keep_image_ids', JSON.stringify(existingPictures.map((picture) => picture.id)));
          if (defaultKey) form.append('default_image_key', defaultKey);
        } else if (defaultKey?.startsWith('new:')) {
          form.append('default_image_index', defaultKey.slice(4));
        }
        data = editing ? await api.patchForm<{ product: Product }>(`${base}/${editing.id}`, form) : await api.postForm<{ product: Product }>(base, form);
      } else {
        data = editing ? await api.patch<{ product: Product }>(`${base}/${editing.id}`, fields) : await api.post<{ product: Product }>(base, fields);
      }
      queryClient.setQueryData<{ products: Product[] }>(key, (current) => ({ products: editing ? (current?.products ?? []).map((item) => item.id === editing.id ? data.product : item) : [...(current?.products ?? []), data.product] }));
      // Guardar en una categoría distinta de la que se está filtrando dejaba el
      // producto fuera de la lista, como si no se hubiera creado.
      if (filter && (data.product.category_id ?? UNCATEGORIZED) !== filter) setFilter(null);
      setFormOpen(false); setEditing(null); setExistingPictures([]); setPickedPictures([]); setDefaultKey(null);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'No fue posible guardar el producto.'); }
    finally { setSaving(false); }
  }
  function remove(product: Product) {
    Alert.alert('Eliminar producto', `¿Quieres eliminar “${product.name}”?`, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: async () => { try { await api.delete(`${base}/${product.id}`); queryClient.setQueryData<{ products: Product[] }>(key, (current) => ({ products: (current?.products ?? []).filter((item) => item.id !== product.id) })); } catch (requestError) { Alert.alert('No se pudo eliminar', requestError instanceof Error ? requestError.message : 'Intenta nuevamente.'); } } }]);
  }

  const products = query.data?.products ?? [];
  const atProductLimit = !isWithin(products.length, limits.max_products_per_catalogue);
  const categories = categoriesQuery.data?.categories ?? [];
  const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: selectedBusiness?.currency || 'MXN' });
  const filtered = filter ? products.filter((product) => (product.category_id ?? UNCATEGORIZED) === filter) : products;
  const byCategory = new Map<string, Product[]>();
  for (const product of filtered) { const id = product.category_id ?? UNCATEGORIZED; byCategory.set(id, [...(byCategory.get(id) ?? []), product]); }
  const named = categories.filter((category) => byCategory.has(category.id)).map((category) => ({ id: category.id, name: category.name, items: byCategory.get(category.id)! }));
  const rest = byCategory.get(UNCATEGORIZED);
  const groups = rest ? [...named, { id: UNCATEGORIZED, name: 'Sin categoría', items: rest }] : named;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 18, paddingBottom: 100, gap: 16, backgroundColor: theme.background }}>
      {categories.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>
        <Pressable onPress={() => setFilter(null)} style={({ pressed }) => ({ minHeight: 34, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 99, backgroundColor: filter === null ? '#111111' : theme.surface, borderWidth: filter === null ? 0 : 1, borderColor: theme.border, opacity: pressed ? 0.75 : 1 })}><Text style={{ color: filter === null ? theme.yellow : theme.text, fontSize: 12.5, fontWeight: '700' }}>Todos · {products.length}</Text></Pressable>
        {categories.map((category) => { const count = products.filter((product) => product.category_id === category.id).length; return <Pressable key={category.id} onPress={() => setFilter(category.id)} style={({ pressed }) => ({ minHeight: 34, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 99, backgroundColor: filter === category.id ? '#111111' : theme.surface, borderWidth: filter === category.id ? 0 : 1, borderColor: theme.border, opacity: pressed ? 0.75 : 1 })}><Text style={{ color: filter === category.id ? theme.yellow : theme.text, fontSize: 12.5, fontWeight: '600' }}>{category.name} · {count}</Text></Pressable>; })}
      </ScrollView> : null}
      {categories.length ? <Text style={{ color: theme.muted, fontSize: 11.5, lineHeight: 17, marginTop: -6 }}>Las secciones sólo filtran esta lista. La categoría de cada producto se elige en el formulario.</Text> : null}

      {atProductLimit && !formOpen ? <PlanNotice message={`Tu plan actual permite hasta ${limits.max_products_per_catalogue} productos por menú.`} /> : null}
      <Button disabled={atProductLimit && !formOpen} onPress={() => formOpen ? setFormOpen(false) : startEdit()}>{formOpen ? 'Cerrar formulario' : 'Crear producto'}</Button>
      {formOpen ? (
        <Animated.View entering={FadeIn.duration(220)} style={{ padding: 18, gap: 14, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 20, borderCurve: 'continuous' }}>
          <Text style={{ color: theme.text, fontSize: 19, fontWeight: '900' }}>{editing ? 'Editar producto' : 'Nuevo producto'}</Text>
          <FormField label="Nombre" value={name} onChangeText={setName} maxLength={64} placeholder="Hamburguesa clásica" />
          <FormField label="Descripción" value={description} onChangeText={setDescription} multiline placeholder="Ingredientes y detalles" />
          <FormField label="Precio" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="129.00" />
          <CategorySelector categories={categories} value={categoryId} onChange={setCategoryId} theme={theme} />
          <ProductImagePicker existing={existingPictures} picked={pickedPictures} defaultKey={defaultKey} onChangeExisting={setExistingPictures} onChangePicked={setPickedPictures} onChangeDefault={setDefaultKey} onError={setError} disabled={saving} />
          <View style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: theme.text, fontWeight: '700' }}>Disponible</Text><Switch value={available} onValueChange={setAvailable} trackColor={{ true: theme.yellowPressed }} /></View>
          <Feedback message={error} />
          <Button loading={saving} onPress={save}>Guardar producto</Button>
        </Animated.View>
      ) : null}

      {products.length ? <Text style={{ color: theme.muted, fontSize: 12.5, lineHeight: 19 }}>Toca un producto para editarlo, mantén presionado para eliminarlo.</Text> : null}
      {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState message="No pudimos cargar los productos." onRetry={() => query.refetch()} /> : products.length ? <View style={{ gap: 18 }}>
        {groups.map((group) => <View key={group.id} style={{ gap: 10 }}>
          <Text style={{ color: theme.yellowPressed, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' }}>{group.name}</Text>
          <View style={{ gap: 10 }}>{group.items.map((product, index) => <Animated.View key={product.id} entering={FadeInDown.duration(280).delay(index * 50)} layout={LinearTransition.duration(200)}><ProductRow product={product} currency={currency} theme={theme} onPress={() => startEdit(product)} onLongPress={() => remove(product)} /></Animated.View>)}</View>
        </View>)}
      </View> : <EmptyState title="Sin productos" description="Agrega el primer producto de este menú." action="Crear producto" onAction={() => startEdit()} />}
    </ScrollView>
  );
}
