from flask import current_app

from app import storage
from app.modules.billing import plans
from app.modules.billing.guards import plan_key_for_owner_id
from app.modules.promotion.services import active_product_ids_today
from app.modules.template import catalog
from app.modules.template.services import default_configuration
from app.modules.analytics.security import tracking_key


def _asset_url(folder_key, filename, api_path):
    """La URL que el menú público anuncia para una imagen.

    Con un bucket público configurado se apunta directo a él, y el navegador
    del comensal deja de pedirle nada a esta API: el 302 no movía bytes, pero
    la petición sí llegaba, y son ~20 por escaneo en un menú con fotos.

    Además el objeto del bucket sí está direccionado por su contenido —la
    clave es un UUID nuevo en cada subida— así que puede cachearse para
    siempre, mientras que la ruta por la API nombra una posición del menú y
    sólo aguanta 60 segundos.

    Sin bucket público —almacenamiento local, o S3 sin `S3_PUBLIC_BASE_URL`—
    se devuelve la ruta por la API de siempre.
    """
    if not filename:
        return None
    return storage.public_url(current_app.config[folder_key], filename) or api_path


def _product_image_url(product, api_path):
    picture = main_picture(product)
    if not picture:
        return None
    # Las fotos heredadas se guardaron como una URL suelta, sin nombre de
    # archivo; para ésas no hay nada que apuntar en el bucket.
    return _asset_url("PRODUCT_UPLOAD_FOLDER", picture.get("filename"), api_path)


def main_picture(product):
    """La foto que representa al producto en el menú público.

    La comparte `get_public_product_image`: es la misma decisión tomada dos
    veces —qué archivo hay detrás de la imagen de un producto— y si las dos
    copias se separan, el menú anuncia una foto y el endpoint sirve otra.
    """
    pictures = product.picture_metadata()
    return next((picture for picture in pictures if picture.get("is_default")), pictures[0] if pictures else None)


def _product_data(catalogue, product, api_path, promo_labels):
    return {
        "tracking_key": tracking_key(catalogue.id, "product", product.id),
        "name": product.name,
        "description": product.description,
        "price": format(product.price, ".2f") if product.price is not None else None,
        "image_url": _product_image_url(product, api_path),
        "is_available": product.is_available,
        # Ninguna promoción cambia el precio (ver la nota en
        # `promotion/services.py`) — sólo agrega esta etiqueta para que la
        # plantilla la resalte hoy.
        "promo_label": promo_labels.get(product.id),
    }


def serialize_public_menu(catalogue):
    configuration = (
        catalogue.template_config.to_dict()
        if catalogue.template_config else default_configuration()
    )
    slug = catalogue.public_slug
    categories = sorted(
        (category for category in catalogue.categories if category.is_visible),
        key=lambda category: (category.display_order, category.created_at),
    )
    products = sorted(
        catalogue.products,
        key=lambda product: (product.display_order, product.created_at),
    )
    promo_labels = active_product_ids_today(catalogue.id)
    category_payload = []
    for section_index, category in enumerate(categories):
        category_products = [product for product in products if product.category_id == category.id]
        category_payload.append({
            "tracking_key": tracking_key(catalogue.id, "category", category.id),
            "name": category.name,
            "description": category.description,
            "products": [
                _product_data(
                    catalogue,
                    product,
                    f"/api/public/menus/{slug}/product-images/{section_index}/{product_index}"
                    if slug and catalogue.is_published else None,
                    promo_labels,
                )
                for product_index, product in enumerate(category_products)
            ],
        })
    uncategorized = [product for product in products if product.category_id is None]
    uncategorized_payload = [
        _product_data(
            catalogue,
            product,
            f"/api/public/menus/{slug}/product-images/{len(categories)}/{product_index}"
            if slug and catalogue.is_published else None,
            promo_labels,
        )
        for product_index, product in enumerate(uncategorized)
    ]
    published = bool(slug and catalogue.is_published and catalogue.template_config)

    def decoration(attribute, folder_key, path):
        if not published:
            return None
        return _asset_url(folder_key, getattr(catalogue.template_config, attribute), path)

    theme = dict(configuration["theme"])
    # Campos de sólo edición (re-mostrar lo guardado en el editor avanzado):
    # no aportan nada a quien sólo va a leer el menú, así que no viajan en el
    # payload público — es la ruta más caliente del backend.
    theme.pop("color_preset_key", None)
    theme.pop("theme_overrides", None)
    theme["cover_image_url"] = decoration(
        "cover_filename", "CATALOGUE_COVER_FOLDER", f"/api/public/menus/{slug}/cover"
    )
    theme["background_image_url"] = decoration(
        "background_filename", "CATALOGUE_BACKGROUND_FOLDER", f"/api/public/menus/{slug}/background"
    )
    # Resuelto aquí mismo (no sólo la clave) para que la página pública no
    # tenga que pedir el catálogo aparte sólo para saber qué patrón dibujar
    # — es la ruta más caliente del backend, un solo request debe bastar.
    background_preset = catalog.BACKGROUNDS.get(theme.get("background_preset_key"))
    theme["background_preset"] = (
        {"key": theme["background_preset_key"], "css": background_preset["css"], "size": background_preset["size"]}
        if background_preset else None
    )
    splash = dict(configuration.get("splash") or {"enabled": False, "duration": 2.5})
    splash["image_url"] = decoration(
        "splash_filename", "CATALOGUE_SPLASH_FOLDER", f"/api/public/menus/{slug}/splash"
    )

    plan_key = plan_key_for_owner_id(catalogue.business.owner_id)
    # Se sanea contra `template_key`, no `layout_key`: ver la nota equivalente
    # en `billing/guards.py` — es el campo siempre poblado de forma confiable.
    layout_key, theme = plans.sanitize_public_theme(
        plan_key, configuration["template_key"], theme
    )
    splash = plans.sanitize_public_splash(plan_key, splash)
    return {
        "business": {
            "name": catalogue.business.name,
            "description": catalogue.business.description,
        },
        "catalogue": {
            "name": catalogue.name,
            "description": catalogue.description,
        },
        "template": {
            "key": layout_key,
            # Alias hacia adelante: mismo valor, nombre nuevo para clientes
            # que ya conozcan el concepto de layout en vez de "plantilla".
            "layout_key": layout_key,
            "theme": theme,
        },
        "splash": splash,
        "branding": {
            "show_eniu_badge": plans.limits_for(plan_key)["show_eniu_badge"],
        },
        "categories": category_payload,
        "uncategorized_products": uncategorized_payload,
    }
