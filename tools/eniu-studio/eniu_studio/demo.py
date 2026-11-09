"""Aplica una demo declarativa (JSON) a una cuenta de Eniu.

Es idempotente: busca cada cosa por nombre y sólo crea o actualiza lo que
falta o cambió. Se puede correr las veces que haga falta después de editar
el archivo, sin duplicar nada.

Las imágenes aceptan:
  "auto"         foto dibujada a partir del nombre del platillo
  "auto:taco"    foto dibujada de un tipo concreto (ver images.KINDS)
  "fotos/x.jpg"  archivo propio, relativo al archivo de la demo
  null / false   sin imagen
"""

import json
from pathlib import Path

from . import images
from .api import EniuError

BUSINESS_FIELDS = ("description", "phone", "whatsapp", "address", "currency", "timezone", "website")


def load(path):
    path = Path(path)
    return json.loads(path.read_text(encoding="utf-8")), path.parent


def _same(a, b):
    return (a or "").strip().lower() == (b or "").strip().lower()


def _find(items, name):
    return next((item for item in items if _same(item.get("name"), name)), None)


def image_for(value, name, base_dir, cover=False, kinds=None):
    """Convierte el valor del JSON en algo que `EniuAPI` pueda subir."""
    if value in (None, False):
        return None
    if value is True or (isinstance(value, str) and value.startswith("auto")):
        kind = value.split(":", 1)[1] if isinstance(value, str) and ":" in value else None
        if cover:
            return images.cover_photo(name, kinds=kinds) if kinds else images.cover_photo(name)
        return images.food_photo(name, kind=kind)
    path = Path(value)
    return path if path.is_absolute() else base_dir / path


class Applier:
    def __init__(self, api, base_dir, log=print):
        self.api = api
        self.base_dir = Path(base_dir)
        self.log = log
        self.warnings = []

    def account(self, spec):
        """Nombre (y otros datos de perfil) de la cuenta: el saludo del dashboard
        dice "Hola, <nombre>" y se ve en las capturas."""
        fields = {key: spec[key] for key in ("name", "language") if spec.get(key)}
        if fields:
            self.api.update_me(fields)
            self.log(f"~ cuenta: {', '.join(f'{k}={v}' for k, v in fields.items())}")

    def warn(self, message):
        self.warnings.append(message)
        self.log(f"  ! {message}")

    # --- negocio ------------------------------------------------------------------

    def business(self, spec, name=None):
        name = name or spec["name"]
        existing = _find(self.api.businesses(), name)
        created = existing is None
        if created:
            create = {"name": name, **{key: spec[key] for key in ("currency", "timezone") if spec.get(key)}}
            existing = self.api.create_business(create)
            self.log(f"+ negocio {name}")
        changes = {key: spec[key] for key in BUSINESS_FIELDS if key in spec and existing.get(key) != spec[key]}
        photo = None
        if spec.get("photo") and (created or not existing.get("photo_url")):
            photo = (
                images.logo(name, **spec.get("logo", {}))
                if spec["photo"] == "auto"
                else image_for(spec["photo"], name, self.base_dir)
            )
        if changes or photo:
            existing = self.api.update_business(existing["id"], changes, photo=photo)
            if not created:
                self.log(f"~ negocio {name}: {', '.join(changes) or 'logo'}")
        return existing

    # --- menú --------------------------------------------------------------------------

    def menu(self, business, spec, refresh_images=False):
        bid = business["id"]
        catalogue = _find(self.api.catalogues(bid), spec["name"])
        if catalogue is None:
            catalogue = self.api.create_catalogue(bid, {"name": spec["name"], "description": spec.get("description")})
            self.log(f"+ menú {spec['name']}")
        elif spec.get("description") and catalogue.get("description") != spec["description"]:
            catalogue = self.api.update_catalogue(bid, catalogue["id"], {"description": spec["description"]})
        cid = catalogue["id"]

        categories = self._categories(bid, cid, spec.get("categories", []))
        products = self._products(bid, cid, spec.get("categories", []), categories, refresh_images)
        self._template(bid, cid, spec)
        self._promotions(bid, cid, spec.get("promotions", []), products, categories)

        if spec.get("publish", True) and not catalogue.get("is_published"):
            try:
                self.api.publish(bid, cid)
                self.log(f"> publicado {spec['name']}")
            except EniuError as error:
                self.warn(f"no se pudo publicar {spec['name']}: {error.message}")
        return self.api.catalogue(bid, cid)

    def _categories(self, bid, cid, specs):
        existing = self.api.categories(bid, cid)
        for spec in specs:
            if _find(existing, spec["name"]) is None:
                existing.append(self.api.create_category(bid, cid, {"name": spec["name"], "description": spec.get("description")}))
                self.log(f"  + categoría {spec['name']}")
        return existing

    def _products(self, bid, cid, category_specs, categories, refresh_images):
        existing = self.api.products(bid, cid)
        for category_spec in category_specs:
            category = _find(categories, category_spec["name"])
            for spec in category_spec.get("products", []):
                fields = {
                    "name": spec["name"],
                    "description": spec.get("description"),
                    "price": spec.get("price"),
                    "category_id": category["id"] if category else None,
                    "is_available": spec.get("available", True),
                }
                current = _find(existing, spec["name"])
                image = image_for(spec.get("image", "auto"), spec["name"], self.base_dir)
                try:
                    if current is None:
                        existing.append(self.api.create_product(bid, cid, fields, images=[image] if image else []))
                        self.log(f"  + producto {spec['name']}")
                        continue
                    changed = {
                        key: value for key, value in fields.items()
                        if value is not None and str(current.get(key)) != (f"{float(value):.2f}" if key == "price" else str(value))
                    }
                    if refresh_images and image:
                        changed["keep_image_ids"] = "[]"
                        self.api.update_product(bid, cid, current["id"], changed, images=[image])
                        self.log(f"  ~ producto {spec['name']} (foto nueva)")
                    elif changed:
                        self.api.update_product(bid, cid, current["id"], changed)
                        self.log(f"  ~ producto {spec['name']}: {', '.join(changed)}")
                except EniuError as error:
                    self.warn(f"producto {spec['name']}: {error.message}")
        return self.api.products(bid, cid)

    def _template(self, bid, cid, spec):
        template = spec.get("template")
        if not template:
            return
        fields = {}
        if template.get("layout"):
            fields["layout_key"] = template["layout"]
        if template.get("palette"):
            fields["color_preset_key"] = template["palette"]
        theme = {key: template[key] for key in ("show_cover", "show_product_images", "background_opacity") if key in template}
        if template.get("font"):
            theme["font_key"] = template["font"]
        if "background_preset" in template:
            theme["background_preset_key"] = template["background_preset"]
        if theme:
            fields["theme"] = theme
        if template.get("splash"):
            fields["splash"] = template["splash"]
        kinds = [images.guess_kind(p["name"]) for c in spec.get("categories", []) for p in c.get("products", [])]
        cover_kinds = tuple(dict.fromkeys(k for k in kinds if k != "plate"))[:5] or None
        cover = image_for(template.get("cover"), spec["name"], self.base_dir, cover=True, kinds=cover_kinds)
        try:
            self.api.update_template(bid, cid, fields, cover=cover)
            self.log(f"  ~ plantilla {template.get('layout', '')} {template.get('palette', '')}".rstrip())
        except EniuError as error:
            self.warn(f"plantilla: {error.message} (¿la cuenta tiene plan Esencial?)")

    def _promotions(self, bid, cid, specs, products, categories):
        if not specs:
            return
        existing = self.api.promotions(bid, cid)
        for spec in specs:
            fields = {
                "name": spec["name"],
                "badge_label": spec.get("badge"),
                "is_active": spec.get("active", True),
                "show_in_section": spec.get("show_in_section", True),
                # "all" = toda la semana: la etiqueta se ve el día que se tomen las capturas.
                "days_of_week": list(range(7)) if spec.get("days") == "all" else spec.get("days", []),
                "start_date": spec.get("from"),
                "end_date": spec.get("to"),
                "product_ids": [p["id"] for name in spec.get("products", []) if (p := _find(products, name))],
                "category_ids": [c["id"] for name in spec.get("categories", []) if (c := _find(categories, name))],
            }
            current = _find(existing, spec["name"])
            try:
                if current is None:
                    self.api.create_promotion(bid, cid, fields)
                    self.log(f"  + promoción {spec['name']}")
                else:
                    self.api.update_promotion(bid, cid, current["id"], fields)
            except EniuError as error:
                self.warn(f"promoción {spec['name']}: {error.message}")
