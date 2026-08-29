"""Reencodifica las imágenes subidas antes de guardarlas.

El dashboard web y la app móvil ya comprimen antes de subir, pero eso es una
cortesía del cliente, no una garantía: un `curl` o una app modificada pueden
mandar 5 MB igual. Y el peso de una imagen no lo paga quien la sube — lo paga
el servidor, una vez por cada comensal que abre el menú. Por eso el límite
tiene que existir también de este lado.

No es un segundo compresor sino una red de seguridad: una imagen que ya viene
dentro del presupuesto se guarda tal cual, sin volver a codificarla. Recomprimir
lo ya comprimido sólo degrada la foto y gasta CPU.

De regalo, pasar por Pillow **borra los metadatos**. Las fotos de un teléfono
llevan las coordenadas GPS de dónde se tomaron, y un menú público es
exactamente el lugar donde no quieres publicar la dirección de tu casa si
fotografiaste el platillo ahí.
"""
from io import BytesIO

from PIL import Image, ImageOps, UnidentifiedImageError
from werkzeug.datastructures import FileStorage

# Lado mayor permitido. Coincide con el perfil de mayor calidad de los
# clientes, para que una imagen que el dueño ya subió en "alta" pase intacta en
# vez de reescalarse dos veces.
MAX_SIDE = 2400

# Por debajo de esto no vale la pena tocar el archivo. Una foto de 2400 px bien
# comprimida ronda los 250-500 KB, así que lo que ya venga optimizado desde el
# cliente cae de este lado y se guarda sin reencodificar.
PASSTHROUGH_BYTES = 600 * 1024

WEBP_QUALITY = 82

# Defensa contra "bombas de descompresión": un PNG de pocos kilobytes puede
# declarar decenas de miles de píxeles por lado y reventar la memoria al
# decodificarse. Pillow avisa a partir de su propio límite; aquí se decide
# explícitamente, porque la instancia tiene 512 MB y hay que caber.
MAX_PIXELS = 50_000_000
Image.MAX_IMAGE_PIXELS = MAX_PIXELS

# Formatos que se aceptan a la entrada. A la salida siempre es WebP: comprime
# mejor que JPEG a calidad equivalente y, a diferencia de él, conserva
# transparencia, así que sirve para los dos casos sin decidir nada.
ACCEPTED_FORMATS = {"JPEG", "PNG", "WEBP", "MPO"}
OUTPUT_EXTENSION = "webp"
OUTPUT_MIMETYPE = "image/webp"


class InvalidImage(ValueError):
    """La subida no es una imagen que se pueda procesar."""


def _stream_size(stream):
    position = stream.tell()
    stream.seek(0, 2)
    size = stream.tell()
    stream.seek(position)
    return size


def _as_upload(stream):
    stream.seek(0)
    return FileStorage(
        stream=stream,
        filename=f"imagen.{OUTPUT_EXTENSION}",
        content_type=OUTPUT_MIMETYPE,
    )


def optimize(source):
    """Devuelve la imagen lista para guardar, junto con su extensión.

    `source` es el `FileStorage` que llegó en la petición. El resultado es otro
    `FileStorage`, así que los backends de almacenamiento —disco local o
    bucket— lo tratan igual que a la subida original.

    Levanta `InvalidImage` con un mensaje que se le puede enseñar al usuario
    cuando el archivo no es una imagen legible o es absurdamente grande.
    """
    source.stream.seek(0)
    try:
        # `open` sólo lee la cabecera: aquí todavía no se decodifica nada, así
        # que se pueden mirar formato y dimensiones sin pagar la memoria.
        image = Image.open(source.stream)
    except (UnidentifiedImageError, OSError) as error:
        raise InvalidImage("El archivo no contiene una imagen válida") from error

    if image.format not in ACCEPTED_FORMATS:
        raise InvalidImage("Las imágenes deben ser JPG, PNG o WebP")

    width, height = image.size
    if width * height > MAX_PIXELS:
        raise InvalidImage("La imagen tiene demasiados píxeles. Redúcela antes de subirla.")

    try:
        # Ya viene en el formato de salida y dentro del presupuesto: guardarla
        # tal cual evita una recompresión que sólo le quitaría calidad.
        if (
            image.format == "WEBP"
            and max(width, height) <= MAX_SIDE
            and _stream_size(source.stream) <= PASSTHROUGH_BYTES
        ):
            # Se copian los bytes en lugar de devolver el stream de entrada:
            # `Image.close()`, en el `finally`, cierra el archivo del que se
            # abrió la imagen, y quien reciba esto todavía tiene que leerlo.
            source.stream.seek(0)
            return _as_upload(BytesIO(source.stream.read())), OUTPUT_EXTENSION

        # En JPEG, `draft` decodifica directamente a una fracción del tamaño
        # original en vez de decodificar entero y luego encoger. Es la
        # diferencia entre reservar ~100 MB para una foto de 48 MP y reservar
        # unos pocos.
        if image.format in {"JPEG", "MPO"}:
            image.draft("RGB", (MAX_SIDE, MAX_SIDE))

        # `exif_transpose` aplica la orientación antes de que se pierda: los
        # metadatos no sobreviven al guardado, así que si no se endereza ahora,
        # una foto vertical queda acostada para siempre.
        rendered = ImageOps.exif_transpose(image)
        if rendered.mode in {"P", "LA", "PA"}:
            rendered = rendered.convert("RGBA")
        elif rendered.mode not in {"RGB", "RGBA"}:
            rendered = rendered.convert("RGB")
        rendered.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)

        destination = BytesIO()
        rendered.save(destination, format="WEBP", quality=WEBP_QUALITY, method=4)
        return _as_upload(destination), OUTPUT_EXTENSION
    except (OSError, ValueError) as error:
        raise InvalidImage("No fue posible procesar la imagen") from error
    finally:
        image.close()
