import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Feedback } from '@/components/ui/feedback';
import { FormField } from '@/components/ui/form-field';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { useEniuTheme } from '@/constants/eniu-theme';
import { useBusiness } from '@/features/business/business-context';
import { api } from '@/lib/api';

const templates = [
  ['modern', 'Moderno'], ['minimal', 'Minimalista'], ['elegant', 'Elegante'], ['bistro', 'Bistró'],
  ['bold', 'Audaz'], ['natural', 'Natural'], ['retro', 'Retro'], ['luxury', 'Lujo'],
] as const;

const colorPresets = [
  { key: 'warm', label: 'Cálido', swatch: '#FFE05A', theme: { background_color: '#FFFDF5', primary_color: '#FFE05A', accent_color: '#F8E8AE', text_color: '#111111' } },
  { key: 'charcoal', label: 'Carbón', swatch: '#2A2A2A', theme: { background_color: '#111111', primary_color: '#2A2A2A', accent_color: '#363224', text_color: '#FFFDF5' } },
  { key: 'cream', label: 'Crema', swatch: '#F8E8AE', theme: { background_color: '#FFFDF5', primary_color: '#F8E8AE', accent_color: '#E9DDB7', text_color: '#111111' } },
  { key: 'sand', label: 'Arena', swatch: '#E9DDB7', theme: { background_color: '#FFFDF5', primary_color: '#E9DDB7', accent_color: '#F0E8D2', text_color: '#111111' } },
] as const;

type MenuTheme = { background_color: string; primary_color: string; accent_color: string; text_color: string; font_key: string; show_cover: boolean; show_product_images: boolean; background_opacity: number };
type TemplateConfig = { template_key: string; theme: MenuTheme };

export default function TemplateScreen() {
  const appTheme = useEniuTheme();
  const queryClient = useQueryClient();
  const { catalogueId } = useLocalSearchParams<{ catalogueId: string }>();
  const { selectedBusiness } = useBusiness();
  const key = ['template', selectedBusiness?.id, catalogueId] as const;
  const path = `businesses/${selectedBusiness?.id}/catalogues/${catalogueId}/template`;
  const query = useQuery({ queryKey: key, queryFn: () => api.get<{ template: TemplateConfig }>(path), enabled: Boolean(selectedBusiness && catalogueId) });
  const [draft, setDraft] = useState<TemplateConfig | null>(null); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  useEffect(() => { const task = setTimeout(() => setDraft(query.data?.template ?? null), 0); return () => clearTimeout(task); }, [query.data?.template]);
  const updateTheme = <K extends keyof MenuTheme>(field: K, value: MenuTheme[K]) => setDraft((current) => current ? ({ ...current, theme: { ...current.theme, [field]: value } }) : current);
  async function save() {
    if (!draft) return;
    const colors = [draft.theme.background_color, draft.theme.primary_color, draft.theme.accent_color, draft.theme.text_color];
    if (colors.some((color) => !/^#[0-9A-Fa-f]{6}$/.test(color))) { setError('Los colores deben usar formato hexadecimal, por ejemplo #FFE05A.'); return; }
    setSaving(true); setError(''); setSuccess('');
    try { const data = await api.patch<{ template: TemplateConfig }>(path, { template_key: draft.template_key, theme: draft.theme }); queryClient.setQueryData(key, data); setDraft(data.template); setSuccess('La personalización se guardó correctamente.'); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'No fue posible guardar la plantilla.'); }
    finally { setSaving(false); }
  }
  if (query.isLoading) return <LoadingState label="Cargando diseño…" />;
  if (query.isError || !draft) return <ErrorState message="No pudimos cargar la plantilla." onRetry={() => query.refetch()} />;
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 18, paddingBottom: 100, gap: 20, backgroundColor: appTheme.background }}>
      <Feedback message={error} /><Feedback message={success} tone="success" />
      <View style={{ gap: 10 }}><Text style={{ color: appTheme.text, fontSize: 19, fontWeight: '900' }}>Plantilla</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 9 }}>{templates.map(([keyName, label]) => <Pressable key={keyName} onPress={() => setDraft((current) => current ? ({ ...current, template_key: keyName }) : current)} style={({ pressed }) => ({ width: 112, minHeight: 76, padding: 12, justifyContent: 'flex-end', borderRadius: 16, borderCurve: 'continuous', backgroundColor: draft.template_key === keyName ? appTheme.yellow : appTheme.surface, borderWidth: 1, borderColor: draft.template_key === keyName ? appTheme.yellowPressed : appTheme.border, opacity: pressed ? 0.7 : 1 })}><Text style={{ color: draft.template_key === keyName ? '#111111' : appTheme.text, fontWeight: '900' }}>{label}</Text></Pressable>)}</ScrollView></View>
      <View style={{ borderRadius: 26, borderCurve: 'continuous', padding: 22, gap: 16, backgroundColor: draft.theme.background_color, borderWidth: 1, borderColor: appTheme.border }}><View style={{ height: 8, width: 66, borderRadius: 999, backgroundColor: draft.theme.primary_color }} /><Text style={{ color: draft.theme.text_color, fontSize: 25, fontWeight: '900' }}>Vista previa</Text><Text style={{ color: draft.theme.text_color, opacity: 0.72 }}>Tu menú se verá con esta combinación de colores.</Text><View style={{ padding: 14, borderRadius: 16, borderCurve: 'continuous', backgroundColor: draft.theme.primary_color }}><Text style={{ color: draft.theme.text_color, fontWeight: '900' }}>Producto destacado · $129</Text></View></View>
      <View style={{ gap: 14 }}>
        <Text style={{ color: appTheme.text, fontSize: 19, fontWeight: '900' }}>Colores</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>{colorPresets.map((preset) => {
          const active = draft.theme.background_color === preset.theme.background_color && draft.theme.primary_color === preset.theme.primary_color && draft.theme.accent_color === preset.theme.accent_color && draft.theme.text_color === preset.theme.text_color;
          return <Pressable key={preset.key} onPress={() => setDraft((current) => current ? ({ ...current, theme: { ...current.theme, ...preset.theme } }) : current)} style={({ pressed }) => ({ flex: 1, borderRadius: 14, borderCurve: 'continuous', borderWidth: active ? 1.5 : 1, borderColor: active ? appTheme.text : appTheme.border, backgroundColor: appTheme.surface, padding: 11, gap: 8, opacity: pressed ? 0.75 : 1 })}>
            <View style={{ height: 26, borderRadius: 8, backgroundColor: preset.swatch }} />
            <Text style={{ color: appTheme.text, fontSize: 10.5, fontWeight: active ? '800' : '600' }}>{preset.label}</Text>
          </Pressable>;
        })}</View>
        <FormField label="Fondo" value={draft.theme.background_color} onChangeText={(value) => updateTheme('background_color', value)} autoCapitalize="characters" /><FormField label="Principal" value={draft.theme.primary_color} onChangeText={(value) => updateTheme('primary_color', value)} autoCapitalize="characters" /><FormField label="Acento" value={draft.theme.accent_color} onChangeText={(value) => updateTheme('accent_color', value)} autoCapitalize="characters" /><FormField label="Texto" value={draft.theme.text_color} onChangeText={(value) => updateTheme('text_color', value)} autoCapitalize="characters" /></View>
      <View style={{ gap: 4 }}>{([['show_cover', 'Mostrar portada'], ['show_product_images', 'Mostrar imágenes de productos']] as const).map(([field, label]) => <View key={field} style={{ minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: appTheme.text, fontWeight: '700' }}>{label}</Text><Switch value={draft.theme[field]} onValueChange={(value) => updateTheme(field, value)} trackColor={{ true: appTheme.yellowPressed }} /></View>)}</View>
      <Button loading={saving} onPress={save}>Guardar personalización</Button>
    </ScrollView>
  );
}
