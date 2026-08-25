import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Feedback } from '@/components/ui/feedback';
import { FormField } from '@/components/ui/form-field';
import { useEniuTheme } from '@/constants/eniu-theme';
import { useBusiness } from '@/features/business/business-context';
import { api } from '@/lib/api';
import type { Business } from '@/types/models';

export function CreateBusinessCard() {
  const theme = useEniuTheme();
  const { addBusiness } = useBusiness();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function create() {
    if (!name.trim()) { setError('El nombre del negocio es obligatorio.'); return; }
    setLoading(true); setError('');
    try {
      const data = await api.post<{ business: Business }>('businesses', { name: name.trim(), description: description.trim() });
      addBusiness(data.business); setOpen(false); setName(''); setDescription('');
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'No fue posible crear el negocio.'); }
    finally { setLoading(false); }
  }
  if (!open) return <Button onPress={() => setOpen(true)}>Crear mi primer negocio</Button>;
  return <View style={{ width: '100%', gap: 14, backgroundColor: theme.surface, borderRadius: 20, borderCurve: 'continuous', borderWidth: 1, borderColor: theme.border, padding: 18 }}><FormField label="Nombre" value={name} onChangeText={setName} placeholder="Mi restaurante" /><FormField label="Descripción" value={description} onChangeText={setDescription} placeholder="Qué hace especial a tu negocio" multiline /><Feedback message={error} /><Button loading={loading} onPress={create}>Crear negocio</Button><Button variant="secondary" onPress={() => setOpen(false)}>Cancelar</Button></View>;
}
