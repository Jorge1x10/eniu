import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';

import { MAX_PICTURES, ProductImagePicker, type DefaultKey, type PickedPicture } from '@/components/product-images';
import { Button } from '@/components/ui/button';
import { Feedback } from '@/components/ui/feedback';
import { FormField } from '@/components/ui/form-field';
import { ImageIcon, PencilIcon, PlusIcon } from '@/components/ui/icons';
import { PlanNotice } from '@/components/ui/plan-notice';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-state';
import { cardStyle, useEniuTheme } from '@/constants/eniu-theme';
import { usePlan } from '@/features/auth/use-plan';
import { useBusiness } from '@/features/business/business-context';
import { useProductQuickActions } from '@/features/catalogues/product-quick-actions';
import { api } from '@/lib/api';
import { appendImage } from '@/lib/image-file';
import { defaultPictureUrl } from '@/lib/product-image';
import type { Category, Product, ProductPicture } from '@/types/models';
import { useTranslation } from 'react-i18next';
import { currentLocale } from '@/i18n/formats';

const UNCATEGORIZED = 'uncategorized';

/**
 * La disponibilidad se cambia desde la lista porque es el ajuste que se hace
 * varias veces al día. El precio no: se edita en el formulario, junto al resto
 * de los datos del producto.
 */
function ProductRow({ product, currency, theme, businessId, catalogueId, onEdit, onLongPress }: { product: Product; currency: Intl.NumberFormat; theme: ReturnType<typeof useEniuTheme>; businessId?: string; catalogueId?: string; onEdit: () => void; onLongPress: () => void }) {
  const { t } = useTranslation();
  const { toggleAvailable } = useProductQuickActions(businessId, catalogueId);

  const uri = defaultPictureUrl(product);
  const extra = (product.pictures?.length ?? 0) - 1;
  return (
    <Pressable onLongPress={onLongPress} style={{ ...cardStyle(theme, 18), padding: 13, gap: 11 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
        {uri ? (
          <View style={{ width: 52, height: 52, borderRadius: 15, borderCurve: 'continuous', overflow: 'hidden', flexShrink: 0, backgroundColor: theme.background }}>
            <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} />
            {extra > 0 ? <View style={{ position: 'absolute', right: 3, bottom: 3, minWidth: 20, paddingHorizontal: 5, height: 17, borderRadius: 999, backgroundColor: 'rgba(17,17,17,0.7)', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>+{extra}</Text></View> : null}
          </View>
        ) : (
          <View style={{ width: 52, height: 52, borderRadius: 15, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><ImageIcon color={theme.yellowPressed} size={19} /></View>
        )}
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text numberOfLines={1} style={{ color: product.is_available ? theme.text : theme.muted, fontSize: 15, fontWeight: '700' }}>{product.name}</Text>
          <Text numberOfLines={1} style={{ color: uri ? theme.muted : theme.yellowPressed, fontSize: 11.5, fontWeight: uri ? '400' : '600' }}>{uri ? (product.description || t("Sin descripción")) : t("Súbele una foto y se ve 3× más")}</Text>
        </View>
        <Text selectable style={{ color: product.is_available ? theme.text : theme.muted, fontSize: 18, fontWeight: '900', fontVariant: ['tabular-nums'], flexShrink: 0 }}>{product.price == null ? 'S/P' : currency.format(Number(product.price))}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable onPress={() => toggleAvailable(product)} style={({ pressed }) => ({ minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, borderRadius: 11, backgroundColor: product.is_available ? 'rgba(22,128,58,0.1)' : 'rgba(198,40,40,0.1)', opacity: pressed ? 0.75 : 1 })}>
          <View style={{ width: 7, height: 7, borderRadius: 99, backgroundColor: product.is_available ? theme.success : theme.danger }} />
          <Text style={{ color: product.is_available ? theme.success : theme.danger, fontSize: 11.5, fontWeight: '700' }}>{product.is_available ? t("Disponible") : t("Agotado")}</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel={t("Editar {{name}}", { name: product.name })} style={({ pressed }) => ({ minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, borderRadius: 11, backgroundColor: theme.background, opacity: pressed ? 0.7 : 1 })}>
          <PencilIcon color={theme.muted} size={14} />
          <Text style={{ color: theme.muted, fontSize: 11.5, fontWeight: '700' }}>{t("Editar")}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

/**
 * Categoría del producto. Antes no había forma de asignarla desde el teléfono:
 * un producto nuevo siempre nacía sin categoría y al editarlo se conservaba la
 * que tuviera, así que las secciones del menú sólo se podían armar desde la web.
 */
function CategorySelector({ categories, value, onChange, theme }: { categories: Category[]; value: string | null; onChange: (value: string | null) => void; theme: ReturnType<typeof useEniuTheme> }) {
  const { t } = useTranslation();

  const options: { id: string | null; name: string }[] = [{ id: null, name: t("Sin categoría") }, ...categories.map((category) => ({ id: category.id as string | null, name: category.name }))];
  return (
    <View style={{ gap: 7 }}>
      <Text style={{ color: theme.text, fontSize: 13, fontWeight: '700' }}>{t("Categoría")}</Text>
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
        <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 18 }}>{t("Aún no hay categorías en este menú. Créalas desde «Categorías» para agrupar tus productos.")}</Text>
      )}
    </View>
  );
}

export default function ProductsScreen() {
  const { t } = useTranslation();

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
    if (!name.trim()) { setError(t("Escribe el nombre del producto.")); return; }
    if (price && !/^\d+(?:\.\d{1,2})?$/.test(price)) { setError(t("Usa un precio válido con máximo dos decimales.")); return; }
    if (existingPictures.length + pickedPictures.length > MAX_PICTURES) { setError(t("Puedes agregar máximo {{limit}} imágenes.", { limit: MAX_PICTURES })); return; }
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
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : t("No fue posible guardar el producto.")); }
    finally { setSaving(false); }
  }
  function remove(product: Product) {
    Alert.alert(t("Eliminar producto"), t("¿Quieres eliminar “{{name}}”?", { name: product.name }), [{ text: t("Cancelar"), style: 'cancel' }, { text: t("Eliminar"), style: 'destructive', onPress: async () => { try { await api.delete(`${base}/${product.id}`); queryClient.setQueryData<{ products: Product[] }>(key, (current) => ({ products: (current?.products ?? []).filter((item) => item.id !== product.id) })); } catch (requestError) { Alert.alert(t("No se pudo eliminar"), requestError instanceof Error ? requestError.message : t("Intenta nuevamente.")); } } }]);
  }

  const products = query.data?.products ?? [];
  const atProductLimit = !isWithin(products.length, limits.max_products_per_catalogue);
  const categories = categoriesQuery.data?.categories ?? [];
  const currency = new Intl.NumberFormat(currentLocale(), { style: 'currency', currency: selectedBusiness?.currency || 'MXN' });
  const filtered = filter ? products.filter((product) => (product.category_id ?? UNCATEGORIZED) === filter) : products;
  const byCategory = new Map<string, Product[]>();
  for (const product of filtered) { const id = product.category_id ?? UNCATEGORIZED; byCategory.set(id, [...(byCategory.get(id) ?? []), product]); }
  const named = categories.filter((category) => byCategory.has(category.id)).map((category) => ({ id: category.id, name: category.name, items: byCategory.get(category.id)! }));
  const rest = byCategory.get(UNCATEGORIZED);
  const groups = rest ? [...named, { id: UNCATEGORIZED, name: t("Sin categoría"), items: rest }] : named;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 18, paddingBottom: 100, gap: 16, backgroundColor: theme.background }}>
      {/* El botón de agregar vive en la cabecera, que es donde se busca, y no
          al final de la lista: con muchos productos quedaba fuera de la vista. */}
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("Crear producto")}
              accessibilityState={{ disabled: atProductLimit }}
              disabled={atProductLimit}
              onPress={() => startEdit()}
              style={({ pressed }) => ({ width: 34, height: 34, borderRadius: 11, borderCurve: 'continuous', backgroundColor: theme.yellow, alignItems: 'center', justifyContent: 'center', opacity: atProductLimit ? 0.4 : pressed ? 0.75 : 1 })}
            >
              <PlusIcon color={theme.onYellow} size={17} />
            </Pressable>
          ),
        }}
      />
      {categories.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>
        <Pressable onPress={() => setFilter(null)} style={({ pressed }) => ({ minHeight: 34, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 99, backgroundColor: filter === null ? theme.hero : theme.surface, borderWidth: filter === null ? 0 : 1, borderColor: theme.border, opacity: pressed ? 0.75 : 1 })}><Text style={{ color: filter === null ? theme.yellow : theme.text, fontSize: 12.5, fontWeight: '700' }}>{t("Todos ·")} {products.length}</Text></Pressable>
        {categories.map((category) => { const count = products.filter((product) => product.category_id === category.id).length; return <Pressable key={category.id} onPress={() => setFilter(category.id)} style={({ pressed }) => ({ minHeight: 34, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 99, backgroundColor: filter === category.id ? theme.hero : theme.surface, borderWidth: filter === category.id ? 0 : 1, borderColor: theme.border, opacity: pressed ? 0.75 : 1 })}><Text style={{ color: filter === category.id ? theme.yellow : theme.text, fontSize: 12.5, fontWeight: '600' }}>{category.name} · {count}</Text></Pressable>; })}
      </ScrollView> : null}
      {categories.length ? <Text style={{ color: theme.muted, fontSize: 11.5, lineHeight: 17, marginTop: -6 }}>{t("Las secciones sólo filtran esta lista. La categoría de cada producto se elige en el formulario.")}</Text> : null}

      {atProductLimit && !formOpen ? <PlanNotice message={t("Tu plan actual permite hasta {{limit}} productos por menú.", { limit: limits.max_products_per_catalogue })} /> : null}
      <Button disabled={atProductLimit && !formOpen} onPress={() => formOpen ? setFormOpen(false) : startEdit()}>{formOpen ? t("Cerrar formulario") : t("Crear producto")}</Button>
      {formOpen ? (
        <Animated.View entering={FadeIn.duration(220)} style={{ padding: 18, gap: 14, ...cardStyle(theme) }}>
          <Text style={{ color: theme.text, fontSize: 19, fontWeight: '900' }}>{editing ? t("Editar producto") : t("Nuevo producto")}</Text>
          <FormField label={t("Nombre")} value={name} onChangeText={setName} maxLength={64} placeholder={t("Hamburguesa clásica")} />
          <FormField label={t("Descripción")} value={description} onChangeText={setDescription} multiline placeholder={t("Ingredientes y detalles")} />
          <FormField label={t("Precio")} value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="129.00" />
          <CategorySelector categories={categories} value={categoryId} onChange={setCategoryId} theme={theme} />
          <ProductImagePicker existing={existingPictures} picked={pickedPictures} defaultKey={defaultKey} onChangeExisting={setExistingPictures} onChangePicked={setPickedPictures} onChangeDefault={setDefaultKey} onError={setError} disabled={saving} />
          <View style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: theme.text, fontWeight: '700' }}>{t("Disponible")}</Text><Switch value={available} onValueChange={setAvailable} trackColor={{ true: theme.yellowPressed }} /></View>
          <Feedback message={error} />
          <Button loading={saving} onPress={save}>{t("Guardar producto")}</Button>
        </Animated.View>
      ) : null}

      {products.length ? <Text style={{ color: theme.muted, fontSize: 12.5, lineHeight: 19 }}>{t("Marca lo agotado desde la lista. Toca «Editar» para el precio y el resto, mantén presionado para eliminar.")}</Text> : null}
      {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState message={t("No pudimos cargar los productos.")} error={query.error} onRetry={() => query.refetch()} /> : products.length ? <View style={{ gap: 18 }}>
        {groups.map((group) => <View key={group.id} style={{ gap: 10 }}>
          <Text style={{ color: theme.yellowPressed, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' }}>{group.name}</Text>
          <View style={{ gap: 10 }}>{group.items.map((product, index) => <Animated.View key={product.id} entering={FadeInDown.duration(280).delay(index * 50)} layout={LinearTransition.duration(200)}><ProductRow product={product} currency={currency} theme={theme} businessId={selectedBusiness?.id} catalogueId={catalogueId} onEdit={() => startEdit(product)} onLongPress={() => remove(product)} /></Animated.View>)}</View>
        </View>)}
      </View> : <EmptyState title={t("Sin productos")} description={t("Agrega el primer producto de este menú.")} action={t("Crear producto")} onAction={() => startEdit()} />}
    </ScrollView>
  );
}
