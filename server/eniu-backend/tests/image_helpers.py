"""Imágenes reales para las pruebas que suben archivos.

Antes bastaba con inventar los primeros bytes —la cabecera de un JPEG seguida
de texto cualquiera— porque el servidor sólo miraba esa cabecera. Desde que
reencodifica lo que recibe, un archivo así se rechaza con razón: no es una
imagen. Las pruebas tienen que subir algo que de verdad se pueda decodificar,
que además es lo que hace un cliente real.
"""
from io import BytesIO

from PIL import Image


def image_bytes(fmt="JPEG", size=(64, 48), color=(200, 40, 40), **options):
    """Una imagen mínima pero legítima, en memoria."""
    buffer = BytesIO()
    Image.new("RGB", size, color).save(buffer, format=fmt, **options)
    return buffer.getvalue()


def opened(data):
    """La imagen que se recibió, lista para inspeccionar formato y tamaño."""
    return Image.open(BytesIO(data))
