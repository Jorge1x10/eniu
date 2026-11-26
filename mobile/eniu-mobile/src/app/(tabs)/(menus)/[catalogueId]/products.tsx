import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { MAX_PICTURES, ProductImagePicker, type DefaultKey, type PickedPicture } from '@/components/product-images';
import { ScreenHeader } from '@/components/screen-header';
import { Button } from '@/components/ui/button';
import { ChoiceField } from '@/components/ui/choice-field';
import { EniuSwitch } from '@/components/ui/eniu-switch';
import { Feedback } from '@/components/ui/feedback';
import { FormField } from '@/components/ui/form-field';
import { ImageIcon } from '@/components/ui/icons';
import { PlanNotice } from '@/components/ui/plan-notice';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-state';
import { SheetModal } from '@/components/ui/sheet-modal';
import { cardStyle, useEniuTheme } from '@/constants/eniu-theme';
import { usePlan } from '@/features/auth/use-plan';
import { useBusiness } from '@/features/business/business-context';
import { catalogueKeys, getCatalogue } from '@/features/catalogues/catalogue-api';
import { useProductQuickActions } from '@/features/catalogues/product-quick-actions';
import { currentLocale } from '@/i18n/formats';
import { api } from '@/lib/api';
import { appendImage } from '@/lib/image-file';
import { defaultPictureUrl } from '@/lib/product-image';
import type { Category, Product, ProductPicture } from '@/types/models';

const UNCATEGORIZED = 'uncategorized';

/**
 * Una fila por producto. Tocarla abre la edición; el punto de la derecha
 * cambia la disponibilidad, que es lo que se toca varias veces al día.
 */
function ProductRow({ product, currency, businessId, catalogueId, onEdit, divider }: { product: Product; currency: Intl.NumberFormat; businessId?: string; catalogueId?: string; onEdit: () => void; divider: boolean }) {
  const { t } = useTranslation();
  const theme = useEniuTheme();
  const { toggleAvailable } = useProductQuickActions(businessId, catalogueId);
  const uri = defaultPictureUrl(product);
  const price = product.price == null ? t("Sin precio") : currency.format(Number(product.price));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', borderTopWidth: divider ? 1 : 0, borderTopColor: theme.border }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("Editar {{name}}", { name: product.name })}
        onPress={onEdit}
        style={({ pressed }) => ({ flex: 1, minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 14, paddingVertical: 10, opacity: (product.is_available ? 1 : 0.55) * (pressed ? 0.7 : 1) })}
      >
        {uri ? (
          <Image source={{ uri }} style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: theme.surfaceAlt }} contentFit="cover" transition={150} />
        ) : (
          <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}><ImageIcon color={theme.muted} size={18} /></View>
        )}
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text numberOfLines={1} style={{ color: theme.text, fontSize: 16, fontWeight: '700' }}>{product.name}</Text>
          {product.description ? <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 13 }}>{product.description}</Text> : null}
        </View>
        <Text style={{ color: theme.text, fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{price}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: product.is_available }}
        accessibilityLabel={t("{{name}} disponible", { name: product.name })}
        onPress={() => toggleAvailable(product)}
        style={({ pressed }) => ({ width: 44, height: 44, marginHorizontal: 6, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: pressed ? theme.surfaceAlt : 'transparent' })}
      >
        <View style={{ width: 14, height: 14, borderRadius: 99, backgroundColor: product.is_available ? theme.success : theme.danger }} />
      </Pressable>
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
  const catalogue = useQuery({ queryKey: catalogueKeys.detail(selectedBusiness?.id, catalogueId), queryFn: () => getCatalogue(selectedBusiness!.id, catalogueId), enabled: Boolean(selectedBusiness && catalogueId) });
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
  // Eliminar vive dentro de la edición, con confirmación: ya no hay pulsación
  // larga escondida en la lista.
  function remove(product: Product) {
    Alert.alert(t("¿Eliminar “{{name}}”?", { name: product.name }), t("Esta acción no se puede deshacer."), [{ text: t("Cancelar"), style: 'cancel' }, { text: t("Eliminar"), style: 'destructive', onPress: async () => { try { await api.delete(`${base}/${product.id}`); queryClient.setQueryData<{ products: Product[] }>(key, (current) => ({ products: (current?.products ?? []).filter((item) => item.id !== product.id) })); setFormOpen(false); setEditing(null); } catch (requestError) { Alert.alert(t("No se pudo eliminar"), requestError instanceof Error ? requestError.message : t("Intenta nuevamente.")); } } }]);
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
  const uncategorizedCount = products.filter((product) => !product.category_id).length;
  const chips = [
    { id: null as string | null, label: t("Todos · {{count}}", { count: products.length }) },
    ...categories.map((category) => ({ id: category.id as string | null, label: `${category.name} · ${products.filter((product) => product.category_id === category.id).length}` })),
    ...(uncategorizedCount ? [{ id: UNCATEGORIZED as string | null, label: `${t("Sin categoría")} · ${uncategorizedCount}` }] : []),
  ];
  const categoryOptions = [{ value: '', label: t("Sin categoría") }, ...categories.map((category) => ({ value: category.id, label: category.name }))];

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 16 }}>
      <ScreenHeader
        overline={catalogue.data?.catalogue.name}
        title={t("Productos")}
        actionLabel={t("Nuevo")}
        actionDisabled={atProductLimit}
        onAction={() => startEdit()}
      />

      {products.length && chips.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginHorizontal: -20 }}>
          <View style={{ width: 12 }} />
          {chips.map((chip) => {
            const on = filter === chip.id;
            return (
              <Pressable
                key={chip.id ?? 'all'}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setFilter(chip.id)}
                style={({ pressed }) => ({ minHeight: 40, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 99, backgroundColor: on ? theme.yellow : theme.surface, borderWidth: on ? 0 : 1, borderColor: theme.border, opacity: pressed ? 0.75 : 1 })}
              >
                <Text style={{ color: on ? theme.onYellow : theme.text, fontSize: 14, fontWeight: on ? '800' : '600' }}>{chip.label}</Text>
              </Pressable>
            );
          })}
          <View style={{ width: 12 }} />
        </ScrollView>
      ) : null}

      {atProductLimit ? <PlanNotice message={t("Tu plan actual permite hasta {{limit}} productos por menú.", { limit: limits.max_products_per_catalogue })} /> : null}

      {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState message={t("No pudimos cargar los productos.")} error={query.error} onRetry={() => query.refetch()} /> : products.length ? (
        <View style={{ gap: 18 }}>
          {groups.map((group) => (
            <View key={group.id} style={{ gap: 8 }}>
              <Text accessibilityRole="header" style={{ color: theme.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', paddingHorizontal: 4 }}>{group.name}</Text>
              <View style={{ ...cardStyle(theme, 20), overflow: 'hidden' }}>
                {group.items.map((product, index) => (
                  <Animated.View key={product.id} entering={FadeInDown.duration(260).delay(index * 40)} layout={LinearTransition.duration(200)}>
                    <ProductRow product={product} currency={currency} businessId={selectedBusiness?.id} catalogueId={catalogueId} onEdit={() => startEdit(product)} divider={index > 0} />
                  </Animated.View>
                ))}
              </View>
            </View>
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 99, backgroundColor: theme.success }} />
            <Text style={{ color: theme.muted, fontSize: 13 }}>{t("Disponible")}</Text>
            <View style={{ width: 8, height: 8, borderRadius: 99, backgroundColor: theme.danger, marginLeft: 6 }} />
            <Text style={{ color: theme.muted, fontSize: 13 }}>{t("Agotado · toca el punto para cambiarlo")}</Text>
          </View>
        </View>
      ) : <EmptyState title={t("Sin productos")} description={t("Agrega el primer producto de este menú.")} action={t("Crear producto")} onAction={() => startEdit()} />}

      <SheetModal visible={formOpen} title={editing ? t("Editar producto") : t("Nuevo producto")} onClose={() => setFormOpen(false)} busy={saving}>
        <ProductImagePicker existing={existingPictures} picked={pickedPictures} defaultKey={defaultKey} onChangeExisting={setExistingPictures} onChangePicked={setPickedPictures} onChangeDefault={setDefaultKey} onError={setError} disabled={saving} />
        <FormField label={t("Nombre")} value={name} onChangeText={setName} maxLength={64} placeholder={t("Hamburguesa clásica")} />
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <FormField
              label={t("Precio")}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              placeholder="129.00"
              prefix={<Text style={{ color: theme.text, fontSize: 16, fontWeight: '700' }}>$</Text>}
            />
          </View>
          <View style={{ flex: 1 }}>
            <ChoiceField label={t("Categoría")} value={categoryId ?? ''} options={categoryOptions} searchLabel={t("Buscar categoría")} onChange={(value) => setCategoryId(value || null)} />
          </View>
        </View>
        <FormField label={t("Descripción · opcional")} value={description} onChangeText={setDescription} multiline placeholder={t("Ingredientes y detalles")} />
        <View style={{ ...cardStyle(theme, 18), paddingLeft: 16, paddingRight: 4, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700' }}>{t("Disponible")}</Text>
            <Text style={{ color: theme.muted, fontSize: 13 }}>{available ? t("Tus clientes pueden pedirlo") : t("Se marca como agotado en tu menú")}</Text>
          </View>
          <EniuSwitch value={available} onValueChange={setAvailable} accessibilityLabel={t("Disponible")} />
        </View>
        <Feedback message={error} />
        <Button size="lg" loading={saving} onPress={save}>{t("Guardar producto")}</Button>
        {editing ? (
          <Pressable accessibilityRole="button" onPress={() => remove(editing)} disabled={saving} style={({ pressed }) => ({ minHeight: 48, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ color: theme.danger, fontSize: 16, fontWeight: '700' }}>{t("Eliminar producto")}</Text>
          </Pressable>
        ) : null}
      </SheetModal>
    </ScrollView>
  );
}
