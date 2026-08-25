import unittest
from io import BytesIO
import json
from pathlib import Path
import tempfile
from uuid import UUID

from flask_jwt_extended import create_access_token
from sqlalchemy.exc import IntegrityError

from app import create_app
from app.database.db import db
from app.modules.business.model import Business
from app.modules.catalogue.model import Catalogue
from app.modules.category.model import Category
from app.modules.products.model import Product
from app.modules.users.model import User


class CategoryProductApiTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "SQLALCHEMY_TRACK_MODIFICATIONS": False,
            "JWT_SECRET_KEY": "category-product-tests-secret-32-bytes",
        })

    def setUp(self):
        self.product_uploads = tempfile.TemporaryDirectory()
        self.app.config["PRODUCT_UPLOAD_FOLDER"] = self.product_uploads.name
        with self.app.app_context():
            db.session.execute(db.text("PRAGMA foreign_keys=ON"))
            db.drop_all()
            db.create_all()

            owner = User(email="owner-products@example.com")
            outsider = User(email="outsider-products@example.com")
            db.session.add_all([owner, outsider])
            db.session.flush()

            business = Business(name="Restaurante", owner_id=owner.id)
            other_business = Business(name="Negocio ajeno", owner_id=outsider.id)
            db.session.add_all([business, other_business])
            db.session.flush()

            catalogue = Catalogue(name="Menú uno", business_id=business.id)
            second_catalogue = Catalogue(name="Menú dos", business_id=business.id)
            other_catalogue = Catalogue(name="Menú ajeno", business_id=other_business.id)
            db.session.add_all([catalogue, second_catalogue, other_catalogue])
            db.session.commit()

            self.owner_id = str(owner.id)
            self.outsider_id = str(outsider.id)
            self.business_id = str(business.id)
            self.other_business_id = str(other_business.id)
            self.catalogue_id = str(catalogue.id)
            self.second_catalogue_id = str(second_catalogue.id)
            self.other_catalogue_id = str(other_catalogue.id)
            self.owner_token = create_access_token(identity=self.owner_id)
            self.outsider_token = create_access_token(identity=self.outsider_id)

        self.client = self.app.test_client()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()
        self.product_uploads.cleanup()

    def headers(self, token=None):
        return {"Authorization": f"Bearer {token or self.owner_token}"}

    def category_url(self, catalogue_id=None, category_id=None, business_id=None):
        url = (
            f"/api/businesses/{business_id or self.business_id}"
            f"/catalogues/{catalogue_id or self.catalogue_id}/categories"
        )
        return f"{url}/{category_id}" if category_id else url

    def product_url(self, catalogue_id=None, product_id=None, business_id=None):
        url = (
            f"/api/businesses/{business_id or self.business_id}"
            f"/catalogues/{catalogue_id or self.catalogue_id}/products"
        )
        return f"{url}/{product_id}" if product_id else url

    def create_category(self, name="Bebidas", catalogue_id=None):
        return self.client.post(
            self.category_url(catalogue_id=catalogue_id),
            headers=self.headers(),
            json={"name": name, "description": " Bebidas preparadas "},
        )

    def create_product(self, category_id=None, catalogue_id=None, name="Hamburguesa"):
        payload = {
            "name": name,
            "description": " Carne y queso ",
            "price": 129.00,
        }
        if category_id is not None:
            payload["category_id"] = category_id
        return self.client.post(
            self.product_url(catalogue_id=catalogue_id),
            headers=self.headers(),
            json=payload,
        )

    def test_create_category_and_validate_name(self):
        response = self.create_category()
        self.assertEqual(response.status_code, 201)
        category = response.get_json()["category"]
        self.assertEqual(category["name"], "Bebidas")
        self.assertEqual(category["description"], "Bebidas preparadas")
        self.assertEqual(category["catalogue_id"], self.catalogue_id)
        self.assertTrue(category["is_visible"])
        self.assertEqual(category["display_order"], 0)

        response = self.client.post(
            self.category_url(),
            headers=self.headers(),
            json={"name": "   "},
        )
        self.assertEqual(response.status_code, 400)

    def test_category_duplicate_and_same_name_in_other_catalogue(self):
        self.assertEqual(self.create_category().status_code, 201)
        self.assertEqual(self.create_category().status_code, 409)
        self.assertEqual(
            self.create_category(catalogue_id=self.second_catalogue_id).status_code,
            201,
        )

    def test_list_edit_and_scope_categories(self):
        category = self.create_category().get_json()["category"]
        self.create_category(name="Postres", catalogue_id=self.second_catalogue_id)

        response = self.client.get(self.category_url(), headers=self.headers())
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.get_json()["categories"]], [category["id"]])

        response = self.client.patch(
            self.category_url(category_id=category["id"]),
            headers=self.headers(),
            json={"name": " Bebidas frías ", "description": " Frías "},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["category"]["name"], "Bebidas frías")

        response = self.client.get(
            self.category_url(
                catalogue_id=self.second_catalogue_id,
                category_id=category["id"],
            ),
            headers=self.headers(),
        )
        self.assertEqual(response.status_code, 404)

        response = self.client.get(
            self.category_url(
                catalogue_id=self.other_catalogue_id,
                business_id=self.other_business_id,
            ),
            headers=self.headers(),
        )
        self.assertEqual(response.status_code, 403)

    def test_delete_category_keeps_product_and_sets_category_null(self):
        category_id = self.create_category().get_json()["category"]["id"]
        product_id = self.create_product(category_id).get_json()["product"]["id"]

        response = self.client.delete(
            self.category_url(category_id=category_id),
            headers=self.headers(),
        )
        self.assertEqual(response.status_code, 200)

        response = self.client.get(
            self.product_url(product_id=product_id),
            headers=self.headers(),
        )
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.get_json()["product"]["category_id"])

        with self.app.app_context():
            self.assertIsNotNone(db.session.get(Product, UUID(product_id)))

    def test_create_products_with_and_without_category(self):
        response = self.create_product()
        self.assertEqual(response.status_code, 201)
        product = response.get_json()["product"]
        self.assertEqual(product["catalogue_id"], self.catalogue_id)
        self.assertIsNone(product["category_id"])
        self.assertEqual(product["price"], "129.00")
        self.assertEqual(product["display_order"], 0)

        category_id = self.create_category().get_json()["category"]["id"]
        response = self.create_product(category_id, name="Limonada")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["product"]["category_id"], category_id)

    def test_reject_invalid_price_and_product_without_catalogue(self):
        response = self.client.post(
            self.product_url(),
            headers=self.headers(),
            json={"name": "Precio negativo", "price": -0.01},
        )
        self.assertEqual(response.status_code, 400)

        response = self.client.post(
            self.product_url(catalogue_id="00000000-0000-0000-0000-000000000000"),
            headers=self.headers(),
            json={"name": "Sin catálogo"},
        )
        self.assertEqual(response.status_code, 404)

        with self.app.app_context():
            db.session.add(Product(name="Inválido", catalogue_id=None))
            with self.assertRaises(IntegrityError):
                db.session.commit()
            db.session.rollback()

    def test_assign_change_and_remove_product_category(self):
        first_id = self.create_category("Entradas").get_json()["category"]["id"]
        second_id = self.create_category("Platos fuertes").get_json()["category"]["id"]
        product_id = self.create_product().get_json()["product"]["id"]

        for category_id in (first_id, second_id, None):
            response = self.client.patch(
                self.product_url(product_id=product_id),
                headers=self.headers(),
                json={"category_id": category_id},
            )
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.get_json()["product"]["category_id"], category_id)

    def test_reject_category_from_other_catalogue_and_catalogue_change(self):
        foreign_category_id = self.create_category(
            name="Ajena",
            catalogue_id=self.second_catalogue_id,
        ).get_json()["category"]["id"]
        product_id = self.create_product().get_json()["product"]["id"]

        response = self.client.patch(
            self.product_url(product_id=product_id),
            headers=self.headers(),
            json={"category_id": foreign_category_id},
        )
        self.assertEqual(response.status_code, 400)

        response = self.client.patch(
            self.product_url(product_id=product_id),
            headers=self.headers(),
            json={"catalogue_id": self.second_catalogue_id},
        )
        self.assertEqual(response.status_code, 400)

    def test_invalid_uuids_and_protected_category_fields_are_controlled(self):
        category_id = self.create_category().get_json()["category"]["id"]

        response = self.client.post(
            self.product_url(),
            headers=self.headers(),
            json={"name": "Producto", "category_id": "not-a-uuid"},
        )
        self.assertEqual(response.status_code, 400)

        response = self.client.get(
            self.product_url(product_id="not-a-uuid"),
            headers=self.headers(),
        )
        self.assertEqual(response.status_code, 404)

        response = self.client.patch(
            self.category_url(category_id=category_id),
            headers=self.headers(),
            json={"catalogue_id": self.second_catalogue_id},
        )
        self.assertEqual(response.status_code, 400)

    def test_list_filter_scope_and_delete_products(self):
        category_id = self.create_category().get_json()["category"]["id"]
        categorized_id = self.create_product(category_id).get_json()["product"]["id"]
        uncategorized_id = self.create_product(name="Sin categoría").get_json()["product"]["id"]
        foreign_id = self.create_product(
            catalogue_id=self.second_catalogue_id,
            name="Otro catálogo",
        ).get_json()["product"]["id"]

        response = self.client.get(self.product_url(), headers=self.headers())
        ids = {item["id"] for item in response.get_json()["products"]}
        self.assertEqual(ids, {categorized_id, uncategorized_id})
        self.assertTrue(any(item["category_id"] is None for item in response.get_json()["products"]))

        response = self.client.get(
            f"{self.product_url()}?category_id={category_id}",
            headers=self.headers(),
        )
        self.assertEqual([item["id"] for item in response.get_json()["products"]], [categorized_id])

        response = self.client.get(
            self.product_url(catalogue_id=self.second_catalogue_id, product_id=categorized_id),
            headers=self.headers(),
        )
        self.assertEqual(response.status_code, 404)

        response = self.client.get(
            self.product_url(
                catalogue_id=self.other_catalogue_id,
                business_id=self.other_business_id,
            ),
            headers=self.headers(),
        )
        self.assertEqual(response.status_code, 403)

        response = self.client.delete(
            self.product_url(product_id=uncategorized_id),
            headers=self.headers(),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            self.client.get(
                self.product_url(product_id=uncategorized_id),
                headers=self.headers(),
            ).status_code,
            404,
        )
        self.assertNotEqual(foreign_id, categorized_id)

    def test_delete_catalogue_cascades_categories_and_products(self):
        category_id = self.create_category().get_json()["category"]["id"]
        product_id = self.create_product(category_id).get_json()["product"]["id"]

        response = self.client.delete(
            f"/api/businesses/{self.business_id}/catalogues/{self.catalogue_id}",
            headers=self.headers(),
        )
        self.assertEqual(response.status_code, 200)

        with self.app.app_context():
            self.assertIsNone(db.session.get(Category, UUID(category_id)))
            self.assertIsNone(db.session.get(Product, UUID(product_id)))

    def test_product_images_default_limit_serving_and_cleanup(self):
        response = self.client.post(
            self.product_url(),
            headers=self.headers(),
            data={
                "name": "Producto con fotos",
                "default_image_index": "1",
                "images": [
                    (BytesIO(b"\xff\xd8\xfffirst-image"), "first.jpg", "image/jpeg"),
                    (BytesIO(b"RIFF\x08\x00\x00\x00WEBPsecond-image"), "second.webp", "image/webp"),
                ],
            },
            content_type="multipart/form-data",
        )
        self.assertEqual(response.status_code, 201)
        product = response.get_json()["product"]
        self.assertEqual(len(product["pictures"]), 2)
        self.assertFalse(product["pictures"][0]["is_default"])
        self.assertTrue(product["pictures"][1]["is_default"])

        image_response = self.client.get(product["pictures"][1]["url"])
        self.assertEqual(image_response.status_code, 200)
        self.assertEqual(image_response.data, b"RIFF\x08\x00\x00\x00WEBPsecond-image")
        image_response.close()

        response = self.client.patch(
            self.product_url(product_id=product["id"]),
            headers=self.headers(),
            data={
                "keep_image_ids": json.dumps([item["id"] for item in product["pictures"]]),
                "default_image_key": product["pictures"][0]["id"],
            },
            content_type="multipart/form-data",
        )
        self.assertEqual(response.status_code, 200)
        updated = response.get_json()["product"]
        self.assertTrue(updated["pictures"][0]["is_default"])

        too_many = self.client.patch(
            self.product_url(product_id=product["id"]),
            headers=self.headers(),
            data={
                "keep_image_ids": json.dumps([item["id"] for item in updated["pictures"]]),
                "images": [
                    (BytesIO(bytes([index])), f"extra-{index}.jpg", "image/jpeg")
                    for index in range(4)
                ],
            },
            content_type="multipart/form-data",
        )
        self.assertEqual(too_many.status_code, 400)

        filenames = [Path(item["url"]).name for item in updated["pictures"]]
        response = self.client.delete(
            self.product_url(product_id=product["id"]),
            headers=self.headers(),
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(all(
            not (Path(self.product_uploads.name) / filename).exists()
            for filename in filenames
        ))


if __name__ == "__main__":
    unittest.main()
