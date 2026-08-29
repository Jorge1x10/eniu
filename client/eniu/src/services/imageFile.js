/**
 * Reencodifica en el navegador las fotos que se suben desde el dashboard.
 *
 * La app móvil ya hacía esto en `mobile/eniu-mobile/src/lib/image-file.ts`; el
 * dashboard mandaba el archivo tal como salía del disco. Como el backend no
 * procesa imágenes —guarda los bytes que recibe—, una foto de cámara de 4 MB
 * se quedaba así para siempre y se le servía completa a cada comensal que
 * escaneara el menú. Ahí es donde se va el ancho de banda del servidor.
 *
 * Los perfiles de calidad son deliberadamente los mismos que los de la app: es
 * el mismo producto, y un menú no debería verse distinto según por dónde se
 * subió la foto.
 */

/** Tope del backend para cualquier imagen (producto, portada, fondo o logo). */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const IMAGE_QUALITIES = [
  { key: "alta", label: "Alta", hint: "Máximo detalle" },
  { key: "media", label: "Media", hint: "Equilibrada" },
  { key: "ligera", label: "Ligera", hint: "Carga más rápido" },
];

const PROFILES = {
  alta: { maxSide: 2400, compress: 0.92 },
  media: { maxSide: 1600, compress: 0.8 },
  ligera: { maxSide: 1080, compress: 0.62 },
};

const EXTENSIONS = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };

/** Formatos que el backend acepta, comparando extensión, mimetype y cabecera. */
export const ACCEPTED_MIMETYPES = ["image/jpeg", "image/png", "image/webp"];

let webpSupport = null;

/**
 * Si este navegador sabe *escribir* WebP, no sólo mostrarlo.
 *
 * Safari lo lee desde hace años pero sólo lo codifica desde la 16, y un
 * `toBlob` con un formato no soportado no falla: devuelve PNG silenciosamente.
 * Un PNG de una foto pesa más que el JPEG original, así que conviene
 * detectarlo en vez de asumirlo.
 */
function supportsWebp() {
  if (webpSupport === null) {
    const probe = document.createElement("canvas");
    probe.width = 1;
    probe.height = 1;
    webpSupport = probe.toDataURL("image/webp").startsWith("data:image/webp");
  }
  return webpSupport;
}

function encode(bitmap, { maxSide, compress }, mimetype) {
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = longest > maxSide ? maxSide / longest : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No fue posible procesar la imagen."))),
      mimetype,
      compress
    );
  });
}

function named(blob, mimetype) {
  const suffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  // El backend valida que la extensión, el mimetype y los bytes de cabecera
  // coincidan entre sí, así que el nombre se deriva del formato real y no del
  // archivo que eligió el usuario.
  return new File([blob], `eniu-${suffix}.${EXTENSIONS[mimetype]}`, { type: mimetype });
}

/**
 * Devuelve la foto lista para subir: reescalada, reencodificada y con un
 * nombre coherente con su contenido.
 *
 * Lanza un error legible si ni siquiera en JPEG baja de los 5 MB, que es lo
 * único que el usuario puede resolver eligiendo otra foto o menos calidad.
 */
export async function prepareImage(file, quality = "alta") {
  const profile = PROFILES[quality] || PROFILES.alta;
  // `from-image` respeta la orientación EXIF. Sin esto, las fotos tomadas en
  // vertical con el teléfono se suben acostadas: el navegador las endereza al
  // mostrarlas, pero el canvas dibuja los píxeles crudos.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    let mimetype = supportsWebp() ? "image/webp" : "image/jpeg";
    let blob = await encode(bitmap, profile, mimetype);
    // JPEG siempre pesa menos que un WebP sin pérdida mal negociado y que un
    // PNG de fotografía, así que es el último recurso antes de rendirse.
    if (blob.size > MAX_IMAGE_BYTES && mimetype !== "image/jpeg") {
      mimetype = "image/jpeg";
      blob = await encode(bitmap, profile, mimetype);
    }
    if (blob.size > MAX_IMAGE_BYTES) {
      throw new Error(
        "La imagen sigue pesando más de 5 MB. Elige una calidad menor o recórtala antes de subirla."
      );
    }
    return named(blob, mimetype);
  } finally {
    bitmap.close?.();
  }
}

/**
 * Procesa varias fotos y devuelve un error único y legible si alguna falla.
 * Los formatos que el backend no acepta se descartan antes de tocar el canvas.
 */
export async function prepareImages(files, quality = "alta") {
  const rejected = files.find((file) => !ACCEPTED_MIMETYPES.includes(file.type));
  if (rejected) throw new Error("Cada imagen debe ser JPG, PNG o WebP.");
  return Promise.all(files.map((file) => prepareImage(file, quality)));
}
