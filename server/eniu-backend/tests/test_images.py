import unittest
from io import BytesIO

from PIL import Image
from werkzeug.datastructures import FileStorage

from app import images
from tests.image_helpers import image_bytes, opened


def upload(data, filename="foto.jpg", content_type="image/jpeg"):
    return FileStorage(stream=BytesIO(data), filename=filename, content_type=content_type)


def photo_with_exif(orientation=None, gps=False, size=(80, 60)):
    """Un JPEG con los metadatos que trae la cámara de un teléfono."""
    exif = Image.Exif()
    if orientation is not None:
        exif[274] = orientation  # Orientation
    if gps:
        # 34853 = GPSInfo, 271 = Make. Lo que convierte la foto de un platillo
        # en la ubicación y el teléfono de quien la tomó.
        exif[34853] = {1: "N", 2: (19.0, 25.0, 0.0)}
        exif[271] = "Eniu Phone"
    buffer = BytesIO()
    Image.new("RGB", size, (120, 160, 90)).save(buffer, format="JPEG", exif=exif)
    return buffer.getvalue()


class OptimizeTestCase(unittest.TestCase):
    def test_reescala_una_foto_grande_al_lado_maximo(self):
        original = image_bytes("JPEG", size=(4000, 3000))

        optimized, extension = images.optimize(upload(original))
        result = opened(optimized.stream.read())

        self.assertEqual(extension, "webp")
        self.assertEqual(result.format, "WEBP")
        self.assertEqual(max(result.size), images.MAX_SIDE)
        # 4000x3000 -> 2400x1800: la proporción se conserva.
        self.assertEqual(result.size, (2400, 1800))

    def test_convierte_a_webp_aunque_ya_sea_pequena(self):
        # Un JPEG chico no pasa de largo: convertirlo a WebP sigue ahorrando
        # banda en cada escaneo, que es lo que se está optimizando.
        optimized, extension = images.optimize(upload(image_bytes("JPEG", size=(100, 100))))

        self.assertEqual(extension, "webp")
        self.assertEqual(opened(optimized.stream.read()).format, "WEBP")

    def test_deja_intacto_un_webp_que_ya_esta_dentro_del_presupuesto(self):
        original = image_bytes("WEBP", size=(200, 150))

        optimized, _ = images.optimize(upload(original, "foto.webp", "image/webp"))

        # Recomprimir lo ya comprimido sólo le quitaría calidad.
        self.assertEqual(optimized.stream.read(), original)

    def test_no_amplia_una_imagen_mas_chica_que_el_maximo(self):
        optimized, _ = images.optimize(upload(image_bytes("JPEG", size=(320, 240))))

        self.assertEqual(opened(optimized.stream.read()).size, (320, 240))

    def test_endereza_la_foto_segun_su_orientacion_exif(self):
        # Orientación 6 = rotada 90°. La cámara guarda los píxeles acostados y
        # anota cómo hay que girarlos; al borrar los metadatos hay que aplicar
        # el giro antes, o la foto queda torcida para siempre.
        optimized, _ = images.optimize(upload(photo_with_exif(orientation=6, size=(80, 60))))

        self.assertEqual(opened(optimized.stream.read()).size, (60, 80))

    def test_borra_los_metadatos_de_la_camara(self):
        optimized, _ = images.optimize(upload(photo_with_exif(gps=True)))

        result = opened(optimized.stream.read())
        # Un menú público es exactamente donde no quieres publicar dónde se
        # tomó la foto ni con qué.
        self.assertNotIn(34853, result.getexif())
        self.assertNotIn(271, result.getexif())

    def test_conserva_la_transparencia(self):
        buffer = BytesIO()
        Image.new("RGBA", (60, 60), (255, 0, 0, 0)).save(buffer, format="PNG")

        optimized, _ = images.optimize(upload(buffer.getvalue(), "logo.png", "image/png"))

        result = opened(optimized.stream.read())
        self.assertEqual(result.mode, "RGBA")
        self.assertEqual(result.getpixel((30, 30))[3], 0)

    def test_rechaza_lo_que_no_es_una_imagen(self):
        # La cabecera dice JPEG pero el contenido no lo es: exactamente lo que
        # mandaría alguien intentando colar otra cosa por el formulario.
        disguised = upload(b"\xff\xd8\xff\xe0" + b"esto no es una imagen")

        with self.assertRaises(images.InvalidImage):
            images.optimize(disguised)

    def test_rechaza_una_imagen_con_demasiados_pixeles(self):
        original = images.MAX_PIXELS
        images.MAX_PIXELS = 100  # 10x10
        self.addCleanup(setattr, images, "MAX_PIXELS", original)

        with self.assertRaises(images.InvalidImage) as raised:
            images.optimize(upload(image_bytes("JPEG", size=(200, 200))))

        self.assertIn("píxeles", str(raised.exception))

    def test_el_resultado_se_puede_guardar_como_cualquier_subida(self):
        optimized, extension = images.optimize(upload(image_bytes("JPEG", size=(3000, 3000))))

        # `storage.save_file` trata el resultado igual que al archivo original,
        # así que tiene que traer el mimetype que le corresponde y el stream al
        # principio.
        self.assertEqual(optimized.mimetype, "image/webp")
        self.assertEqual(extension, "webp")
        self.assertEqual(optimized.stream.tell(), 0)
        self.assertGreater(len(optimized.stream.read()), 0)

    def test_una_foto_de_camara_termina_pesando_una_fraccion(self):
        # La razón de existir del módulo: lo que se sirve en cada escaneo tiene
        # que ser mucho más chico que lo que salió del teléfono.
        original = image_bytes("JPEG", size=(4000, 3000), quality=95)

        optimized, _ = images.optimize(upload(original))

        self.assertLess(len(optimized.stream.read()), len(original) / 2)


if __name__ == "__main__":
    unittest.main()
