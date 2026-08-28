import { File as StoredFile } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

/** Tope del backend para cualquier imagen (producto, portada, fondo o logo). */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Calidad de subida. El usuario elige cuánta conserva: la cámara de un teléfono
 * moderno entrega archivos de 8–12 MB que el servidor rechaza, así que siempre
 * hay que recomprimir, pero cuánto se recomprime no debería decidirlo la app.
 */
export type ImageQuality = 'alta' | 'media' | 'ligera';

export const IMAGE_QUALITIES: { key: ImageQuality; label: string; hint: string }[] = [
  { key: 'alta', label: 'Alta', hint: 'Máximo detalle' },
  { key: 'media', label: 'Media', hint: 'Equilibrada' },
  { key: 'ligera', label: 'Ligera', hint: 'Carga más rápido' },
];

const PROFILES: Record<ImageQuality, { maxSide: number; compress: number }> = {
  alta: { maxSide: 2400, compress: 0.92 },
  media: { maxSide: 1600, compress: 0.8 },
  ligera: { maxSide: 1080, compress: 0.62 },
};

const EXTENSIONS = { jpeg: 'jpg', png: 'png', webp: 'webp' } as const;
const MIMETYPES = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' } as const;
const FORMATS = { jpeg: SaveFormat.JPEG, png: SaveFormat.PNG, webp: SaveFormat.WEBP } as const;
type Encoding = keyof typeof EXTENSIONS;
type ImagePickerAsset = ImagePicker.ImagePickerAsset;

/** Imagen ya convertida y lista para subir. */
export type PickedPicture = { uri: string; name: string; type: string; size: number };

/**
 * `expo/fetch` serializa como archivo cualquier parte que exponga `name`, `type`
 * y `bytes()`; el tipo de `FormData` de React Native sólo declara valores de
 * texto, de ahí el cast.
 */
type MultipartForm = { append(name: string, value: unknown): void };

async function encode(uri: string, width: number, height: number, quality: ImageQuality, encoding: Encoding) {
  const profile = PROFILES[quality];
  const context = ImageManipulator.manipulate(uri);
  const longest = Math.max(width, height);
  if (longest > profile.maxSide && width > 0 && height > 0) {
    const scale = profile.maxSide / longest;
    context.resize({ width: Math.round(width * scale), height: Math.round(height * scale) });
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: FORMATS[encoding], compress: profile.compress });
  return { uri: saved.uri, size: new StoredFile(saved.uri).size };
}

/**
 * Convierte la foto elegida a un formato que el servidor acepta.
 *
 * El backend exige que la extensión, el mimetype y los bytes de cabecera
 * coincidan, y que el archivo no pase de 5 MB. La galería no garantiza nada de
 * eso: en iOS entrega HEIC y en ambos sistemas fotos de 8–12 MB. Reencodificar
 * resuelve las dos cosas a la vez: WebP en Android (pesa menos y conserva
 * transparencia), PNG en iOS cuando la original la tenía y JPEG en el resto.
 */
export async function prepareImage(
  asset: Pick<ImagePickerAsset, 'uri' | 'width' | 'height' | 'mimeType' | 'fileName'>,
  quality: ImageQuality = 'alta',
): Promise<PickedPicture> {
  const keepsAlpha = (asset.mimeType || asset.fileName || '').toLowerCase().includes('png');
  let encoding: Encoding = Platform.OS === 'android' ? 'webp' : keepsAlpha ? 'png' : 'jpeg';
  let result = await encode(asset.uri, asset.width, asset.height, quality, encoding);
  // PNG es sin pérdida: una foto de cámara guardada así puede superar el límite
  // aunque venga reescalada. JPEG siempre entra.
  if (result.size > MAX_IMAGE_BYTES && encoding !== 'jpeg') {
    encoding = 'jpeg';
    result = await encode(asset.uri, asset.width, asset.height, quality, encoding);
  }
  if (result.size > MAX_IMAGE_BYTES) {
    throw new Error('La imagen sigue pesando más de 5 MB. Elige una calidad menor o recórtala antes de subirla.');
  }
  return {
    uri: result.uri,
    name: `eniu-${Date.now()}-${Math.round(Math.random() * 1e6)}.${EXTENSIONS[encoding]}`,
    type: MIMETYPES[encoding],
    size: result.size,
  };
}

/**
 * Pide permiso, abre la galería y devuelve las fotos ya convertidas. `null`
 * significa que el usuario canceló o negó el permiso: no hay nada que reportar.
 */
export async function pickImages({ limit = 1, quality = 'alta' as ImageQuality } = {}): Promise<PickedPicture[] | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Permiso necesario', 'Permite el acceso a tus fotos para subir imágenes.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
    // Sin recomprimir aquí: la calidad la decide `prepareImage` con lo que el
    // usuario eligió, y comprimir dos veces sólo degrada la imagen.
    quality: 1,
  });
  if (result.canceled) return null;
  const assets = result.assets.slice(0, limit);
  return Promise.all(assets.map((asset) => prepareImage(asset, quality)));
}

/**
 * Agrega una imagen a un `FormData`.
 *
 * Desde SDK 54 `expo/fetch` es también el `fetch` global, y su serializador
 * multipart rechaza el objeto `{ uri, name, type }` de React Native: de ahí el
 * «invalid FormData» al subir una foto. Tampoco sirve un `Blob`, porque el de
 * React Native no se puede construir con bytes desde JS.
 *
 * Lo que sí acepta es una parte con `name`, `type` y `bytes()`. Se los damos
 * explícitos en lugar de dejarlos en manos del sistema de archivos, porque la
 * API valida la extensión y el mimetype juntos y tienen que coincidir con el
 * formato al que acabamos de convertir la imagen.
 */
export function appendImage(form: FormData, field: string, picture: PickedPicture) {
  const file = new StoredFile(picture.uri);
  const part = { name: picture.name, type: picture.type, size: picture.size, bytes: () => file.bytes() };
  (form as unknown as MultipartForm).append(field, part);
}
