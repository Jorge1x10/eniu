import json
import re
import tempfile
import unittest
import uuid
from pathlib import Path
from unittest.mock import patch

from flask_jwt_extended import create_access_token
from sqlalchemy import event
from sqlalchemy.exc import SQLAlchemyError

from app import create_app, storage
from app.database.db import db
from app.modules.business.model import Business
from app.modules.catalogue.model import Catalogue
from app.modules.category.model import Category
from app.modules.products.model import Product
from app.modules.template.model import CatalogueTemplate
from app.modules.users.model import User
from tests.plan_helpers import grant_plan


FORBIDDEN_KEYS = {
    "id", "public_id", "user_id", "owner_id", "business_id", "catalogue_id",
    "category_id", "email", "password", "password_hash", "google_id", "plan",
    "subscription", "access_token", "refresh_token", "created_at", "updated_at",
    "published_at", "public_slug", "is_published", "cover_filename", "background_filename",
}
UUID_PATTERN = re.compile(r"\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b", re.I)


def all_keys(value):
    if isinstance(value, dict):
        for key, nested in value.items():
            yield key
            yield from all_keys(nested)
    elif isinstance(value, list):
        for nested in value:
            yield from all_keys(nested)


class PublicationApiTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "SQLALCHEMY_TRACK_MODIFICATIONS": False,
            "JWT_SECRET_KEY": "publication-tests-secret-at-least-32-bytes",
            "PUBLIC_WEB_BASE_URL": "https://menus.example.test",
        })

    def setUp(self):
        self.backgrounds = tempfile.TemporaryDirectory()
        self.app.config["CATALOGUE_BACKGROUND_FOLDER"] = self.backgrounds.name
        with self.app.app_context():
            db.session.execute(db.text("PRAGMA foreign_keys=ON"))
            db.drop_all()
            db.create_all()
            owner = User(email="publication-owner@example.com")
            outsider = User(email="publication-outsider@example.com")
            db.session.add_all([owner, outsider])
            db.session.flush()
            business = Business(name="La Pizzería Santa Anita", description="Pizzas", owner_id=owner.id)
            second_business = Business(name="La Pizzería Santa Anita", owner_id=owner.id)
            foreign_business = Business(name="Negocio ajeno", owner_id=outsider.id)
            db.session.add_all([business, second_business, foreign_business])
            db.session.flush()
            catalogue = Catalogue(name="Menú principal", description="Especialidades", business_id=business.id)
            collision_catalogue = Catalogue(name="Menú principal", business_id=second_business.id)
            foreign_catalogue = Catalogue(name="Menú ajeno", business_id=foreign_business.id)
            db.session.add_all([catalogue, collision_catalogue, foreign_catalogue])
            db.session.flush()
            category = Category(name="Pizzas", description="Clásicas", catalogue_id=catalogue.id)
            db.session.add(category)
            db.session.flush()
            db.session.add_all([
                Product(name="Pepperoni", description="Queso y pepperoni", price=189, catalogue_id=catalogue.id, category_id=category.id),
                Product(name="Agua", price=25, catalogue_id=catalogue.id, category_id=None, is_available=False),
                CatalogueTemplate(
                    catalogue_id=catalogue.id,
                    template_key="minimal",
                    font_key="lora",
                    background_filename="background.webp",
                    background_opacity=0.35,
                ),
            ])
            db.session.commit()
            (Path(self.backgrounds.name) / "background.webp").write_bytes(
                b"RIFF\x08\x00\x00\x00WEBPbackground"
            )
            grant_plan(owner.id)
            grant_plan(outsider.id)
            self.owner_token = create_access_token(identity=str(owner.id))
            self.outsider_token = create_access_token(identity=str(outsider.id))
            self.business_id = str(business.id)
            self.second_business_id = str(second_business.id)
            self.foreign_business_id = str(foreign_business.id)
            self.catalogue_id = str(catalogue.id)
            self.collision_catalogue_id = str(collision_catalogue.id)
            self.foreign_catalogue_id = str(foreign_catalogue.id)
        self.client = self.app.test_client()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()
        self.backgrounds.cleanup()

    def headers(self, token=None):
        return {"Authorization": f"Bearer {token or self.owner_token}"}

    def base(self, business_id=None, catalogue_id=None):
        return f"/api/businesses/{business_id or self.business_id}/catalogues/{catalogue_id or self.catalogue_id}"

    def publish(self, business_id=None, catalogue_id=None):
        return self.client.patch(
            f"{self.base(business_id, catalogue_id)}/publication",
            headers=self.headers(), json={"is_published": True},
        )

    def test_publish_slug_stability_unpublish_and_republish(self):
        response = self.publish()
        self.assertEqual(response.status_code, 200)
        first = response.get_json()["publication"]
        self.assertEqual(first["public_slug"], "la-pizzeria-santa-anita-menu-principal")
        self.assertEqual(first["public_url"], f"https://menus.example.test/m/{first['public_slug']}")

        response = self.client.patch(
            f"{self.base()}/publication", headers=self.headers(), json={"is_published": False}
        )
        unpublished = response.get_json()["publication"]
        self.assertFalse(unpublished["is_published"])
        self.assertEqual(unpublished["public_slug"], first["public_slug"])
        self.assertIsNone(unpublished["published_at"])

        republished = self.publish().get_json()["publication"]
        self.assertEqual(republished["public_slug"], first["public_slug"])
        with self.app.app_context():
            product = Product.query.filter_by(name="Pepperoni").first()
            product.price = 199
            config = CatalogueTemplate.query.filter_by(catalogue_id=product.catalogue_id).first()
            config.template_key = "elegant"
            db.session.commit()
        self.assertEqual(self.client.get(f"{self.base()}/publication", headers=self.headers()).get_json()["publication"]["public_slug"], first["public_slug"])

    def test_slug_collision_is_resolved(self):
        first_slug = self.publish().get_json()["publication"]["public_slug"]
        second = self.publish(self.second_business_id, self.collision_catalogue_id)
        self.assertEqual(second.status_code, 200)
        second_slug = second.get_json()["publication"]["public_slug"]
        self.assertNotEqual(first_slug, second_slug)
        self.assertRegex(second_slug, rf"^{re.escape(first_slug)}-[0-9a-f]{{6}}$")

    def test_private_publication_and_preview_enforce_scope(self):
        self.assertEqual(self.client.get(f"{self.base()}/publication").status_code, 401)
        self.assertEqual(self.client.get(f"{self.base()}/preview", headers=self.headers()).status_code, 200)
        self.assertEqual(self.client.get(f"{self.base()}/preview", headers=self.headers(self.outsider_token)).status_code, 403)
        self.assertEqual(self.publish(self.foreign_business_id, self.foreign_catalogue_id).status_code, 403)
        mismatched = self.publish(self.second_business_id, self.catalogue_id)
        self.assertEqual(mismatched.status_code, 404)
        invalid = self.client.patch(f"{self.base()}/publication", headers=self.headers(), json={"is_published": "true"})
        self.assertEqual(invalid.status_code, 400)

    def test_public_menu_requires_publication_and_contains_only_allowed_data(self):
        self.assertEqual(self.client.get("/api/public/menus/missing").status_code, 404)
        self.assertEqual(
            self.client.get("/api/public/menus/unpublished/background").status_code,
            404,
        )
        response = self.publish()
        slug = response.get_json()["publication"]["public_slug"]
        public_response = self.client.get(f"/api/public/menus/{slug}")
        self.assertEqual(public_response.status_code, 200)
        self.assertEqual(public_response.headers["Cache-Control"], "public, max-age=20")
        payload = public_response.get_json()
        self.assertFalse(FORBIDDEN_KEYS.intersection(set(all_keys(payload))))
        self.assertIsNone(UUID_PATTERN.search(json.dumps(payload)))
        menu = payload["menu"]
        self.assertEqual(menu["business"], {"name": "La Pizzería Santa Anita", "description": "Pizzas"})
        self.assertEqual(menu["template"]["key"], "minimal")
        self.assertEqual(menu["template"]["theme"]["background_opacity"], 0.35)
        background_url = menu["template"]["theme"]["background_image_url"]
        background_response = self.client.get(background_url)
        self.assertEqual(background_response.data, b"RIFF\x08\x00\x00\x00WEBPbackground")
        background_response.close()
        self.assertEqual(menu["categories"][0]["products"][0]["name"], "Pepperoni")
        self.assertEqual(menu["uncategorized_products"][0]["name"], "Agua")
        self.assertFalse(menu["uncategorized_products"][0]["is_available"])

        self.client.patch(f"{self.base()}/publication", headers=self.headers(), json={"is_published": False})
        self.assertEqual(self.client.get(f"/api/public/menus/{slug}").status_code, 404)
        self.assertEqual(self.client.get(background_url).status_code, 404)

    def test_publication_rollback_does_not_expose_database_error(self):
        with patch.object(db.session, "commit", side_effect=SQLAlchemyError("private SQL detail")):
            response = self.publish()
        self.assertEqual(response.status_code, 500)
        self.assertNotIn("private SQL detail", response.get_data(as_text=True))
        with self.app.app_context():
            catalogue = db.session.get(Catalogue, __import__("uuid").UUID(self.catalogue_id))
            self.assertFalse(catalogue.is_published)
            self.assertIsNone(catalogue.public_slug)

    # --- imagenes de producto del menu publico -----------------------------

    def product_images_folder(self):
        """Carpeta temporal de fotos, con una foto distinta por producto."""
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        self.app.config["PRODUCT_UPLOAD_FOLDER"] = folder.name
        return Path(folder.name)

    def picture_for(self, folder, filename):
        """Escribe un archivo cuyo contenido identifica de que producto es."""
        (folder / filename).write_bytes(f"imagen:{filename}".encode())
        return json.dumps([{"id": filename, "filename": filename, "is_default": True}])

    def build_menu_with_images(self):
        """Un menu con las trampas que el indice de la URL tiene que sortear:
        una categoria oculta que no debe contar, categorias desordenadas, un
        producto agotado que si ocupa posicion y una seccion sin categoria."""
        folder = self.product_images_folder()
        with self.app.app_context():
            catalogue = db.session.get(Catalogue, uuid.UUID(self.catalogue_id))
            hidden = Category(name="Borradores", catalogue_id=catalogue.id, is_visible=False, display_order=0)
            drinks = Category(name="Bebidas", catalogue_id=catalogue.id, display_order=5)
            db.session.add_all([hidden, drinks])
            db.session.flush()
            pizzas = Category.query.filter_by(catalogue_id=catalogue.id, name="Pizzas").first()
            pizzas.display_order = 1
            # Un producto en la categoria oculta: no aparece en el menu y no
            # debe correr la numeracion de las secciones visibles.
            db.session.add(Product(
                name="Prueba", catalogue_id=catalogue.id, category_id=hidden.id,
                pictures=self.picture_for(folder, "oculta.png"),
            ))
            existing = Product.query.filter_by(catalogue_id=catalogue.id, name="Pepperoni").first()
            existing.display_order = 1
            existing.pictures = self.picture_for(folder, "pepperoni.png")
            db.session.add_all([
                Product(name="Margarita", catalogue_id=catalogue.id, category_id=pizzas.id,
                        display_order=0, pictures=self.picture_for(folder, "margarita.png")),
                Product(name="Cerveza", catalogue_id=catalogue.id, category_id=drinks.id,
                        display_order=0, is_available=False,
                        pictures=self.picture_for(folder, "cerveza.png")),
                Product(name="Limonada", catalogue_id=catalogue.id, category_id=drinks.id,
                        display_order=1, pictures=self.picture_for(folder, "limonada.png")),
            ])
            # El "Agua" que ya existe va sin categoria: ultima seccion.
            water = Product.query.filter_by(catalogue_id=catalogue.id, name="Agua").first()
            water.pictures = self.picture_for(folder, "agua.png")
            db.session.commit()
        self.publish()
        status = self.client.get(f"{self.base()}/publication", headers=self.headers())
        return status.get_json()["publication"]["public_slug"]

    def test_public_product_images_correspond_to_their_position_in_the_menu(self):
        slug = self.build_menu_with_images()
        menu = self.client.get(f"/api/public/menus/{slug}").get_json()["menu"]

        self.assertEqual(
            [category["name"] for category in menu["categories"]],
            ["Pizzas", "Bebidas"],
            "la categoria oculta no debe aparecer ni desplazar a las visibles",
        )

        sections = [category["products"] for category in menu["categories"]]
        sections.append(menu["uncategorized_products"])

        served = {}
        for products in sections:
            for product in products:
                response = self.client.get(product["image_url"])
                self.assertEqual(response.status_code, 200, product["name"])
                served[product["name"]] = response.get_data()

        # Cada producto sirve su propia foto, no la de su vecino.
        self.assertEqual(served, {
            "Margarita": b"imagen:margarita.png",
            "Pepperoni": b"imagen:pepperoni.png",
            "Cerveza": b"imagen:cerveza.png",
            "Limonada": b"imagen:limonada.png",
            "Agua": b"imagen:agua.png",
        })

    def test_public_product_image_rejects_positions_outside_the_menu(self):
        slug = self.build_menu_with_images()
        base = f"/api/public/menus/{slug}/product-images"
        # Secciones: 0 y 1 con categoria, 2 la de sin categoria. La 3 no existe.
        self.assertEqual(self.client.get(f"{base}/3/0").status_code, 404)
        self.assertEqual(self.client.get(f"{base}/9/0").status_code, 404)
        # La seccion sin categoria tiene un solo producto.
        self.assertEqual(self.client.get(f"{base}/2/0").status_code, 200)
        self.assertEqual(self.client.get(f"{base}/2/1").status_code, 404)
        self.assertEqual(self.client.get("/api/public/menus/no-existe/product-images/0/0").status_code, 404)

        self.client.patch(f"{self.base()}/publication", headers=self.headers(), json={"is_published": False})
        self.assertEqual(self.client.get(f"{base}/0/0").status_code, 404)

    def test_the_menu_points_straight_at_the_bucket_when_there_is_one(self):
        """Con bucket publico, el comensal no le pide las fotos a esta API.

        El 302 de antes no movia bytes, pero la peticion si llegaba hasta
        aqui: unas 20 por escaneo en un menu con fotos. Anunciando la URL del
        bucket quedan dos, el JSON del menu y la analitica.
        """
        slug = self.build_menu_with_images()
        with self.app.app_context():
            catalogue = db.session.get(Catalogue, uuid.UUID(self.catalogue_id))
            catalogue.template_config.cover_filename = "portada.webp"
            catalogue.template_config.splash_filename = "bienvenida.webp"
            db.session.commit()

        class Bucket:
            def url_for(self, folder, filename):
                return f"https://cdn.eniu.app/{filename}"

            def serve(self, folder, filename):
                return None

        original_backend = storage._backend
        storage._backend = Bucket()
        try:
            menu = self.client.get(f"/api/public/menus/{slug}").get_json()["menu"]
        finally:
            storage._backend = original_backend

        images = [
            product["image_url"]
            for category in menu["categories"]
            for product in category["products"]
        ]
        images += [product["image_url"] for product in menu["uncategorized_products"]]

        # Cada URL nombra el archivo, no la posicion del producto en el menu:
        # reordenar el menu deja de cambiar a que apunta cada foto.
        self.assertEqual(sorted(images), sorted([
            "https://cdn.eniu.app/margarita.png",
            "https://cdn.eniu.app/pepperoni.png",
            "https://cdn.eniu.app/cerveza.png",
            "https://cdn.eniu.app/limonada.png",
            "https://cdn.eniu.app/agua.png",
        ]))
        self.assertEqual(menu["template"]["theme"]["cover_image_url"], "https://cdn.eniu.app/portada.webp")
        self.assertEqual(
            menu["template"]["theme"]["background_image_url"],
            "https://cdn.eniu.app/background.webp",
        )
        self.assertEqual(menu["splash"]["image_url"], "https://cdn.eniu.app/bienvenida.webp")

    def test_without_a_bucket_the_menu_keeps_serving_the_images_itself(self):
        slug = self.build_menu_with_images()

        menu = self.client.get(f"/api/public/menus/{slug}").get_json()["menu"]

        # Almacenamiento local: nada que anunciar fuera de esta API.
        self.assertTrue(
            menu["categories"][0]["products"][0]["image_url"].startswith(
                f"/api/public/menus/{slug}/product-images/"
            )
        )
        self.assertEqual(
            menu["template"]["theme"]["background_image_url"],
            f"/api/public/menus/{slug}/background",
        )

    def test_the_section_lookup_uses_the_index_instead_of_scanning(self):
        """El índice existe para que la base no recorra `products` entera.

        Crearlo no garantiza que se use: si el orden de las columnas no
        coincide con el de la consulta, el planificador lo ignora y el índice
        sólo ocupa espacio. Esto lo comprueba sobre la forma exacta de la
        consulta que sirve una sección del menú.

        Es SQLite, no Postgres, así que es indicativo y no una prueba de
        producción; pero un índice que ni siquiera SQLite elige tampoco lo
        elegiría Postgres.
        """
        with self.app.app_context():
            plan = db.session.execute(db.text(
                "EXPLAIN QUERY PLAN "
                "SELECT * FROM products "
                "WHERE catalogue_id = 'x' AND category_id = 'y' "
                "ORDER BY display_order, created_at"
            )).fetchall()

        detail = " ".join(str(row[-1]) for row in plan)
        self.assertIn("ix_products_catalogue_section_order", detail)
        # "SCAN products" a secas significa recorrer la tabla entera, que es
        # justo lo que el índice viene a evitar.
        self.assertNotIn("SCAN products", detail)

    def test_public_product_image_cost_does_not_grow_with_the_catalogue(self):
        """Servir una foto no debe depender del tamano del menu.

        Es la regresion que motivo el cambio. Lo que crecia no era el numero
        de consultas —la version anterior hacia dos, siempre las mismas— sino
        cuantas filas traia cada una: cargaba todas las categorias y todos los
        productos del catalogo, y construia un objeto por cada uno, para
        devolver el nombre de un archivo. Un menu se pide una vez pero sus
        imagenes una por producto, asi que ese trabajo se repetia tantas veces
        como fotos tuviera el menu.

        Por eso se cuentan objetos cargados y no sentencias emitidas: es la
        diferencia que el cambio realmente elimina.
        """
        slug = self.build_menu_with_images()
        url = f"/api/public/menus/{slug}/product-images/0/0"

        def rows_loaded_for_one_image():
            loaded = []

            def record(target, context):
                loaded.append(type(target).__name__)

            event.listen(Category, "load", record)
            event.listen(Product, "load", record)
            try:
                self.assertEqual(self.client.get(url).status_code, 200)
            finally:
                event.remove(Category, "load", record)
                event.remove(Product, "load", record)
            return loaded

        small = rows_loaded_for_one_image()

        with self.app.app_context():
            catalogue = db.session.get(Catalogue, uuid.UUID(self.catalogue_id))
            pizzas = Category.query.filter_by(catalogue_id=catalogue.id, name="Pizzas").first()
            db.session.add_all([
                Product(name=f"Relleno {index}", catalogue_id=catalogue.id,
                        category_id=pizzas.id, display_order=100 + index)
                for index in range(60)
            ])
            db.session.commit()

        large = rows_loaded_for_one_image()

        self.assertEqual(
            len(small), len(large),
            f"cargar una foto empeoro al crecer el catalogo: {len(small)} filas "
            f"con 6 productos, {len(large)} con 66",
        )
        # La categoria de la seccion y el producto de la posicion. Nada mas.
        self.assertEqual(sorted(small), ["Category", "Product"], small)


if __name__ == "__main__":
    unittest.main()
