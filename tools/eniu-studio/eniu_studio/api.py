"""Cliente de la API de Eniu: lo mismo que hacen el dashboard web y la app.

Pasa por las mismas validaciones y límites de plan que un usuario real, así
que lo que crea el estudio es exactamente lo que vería un restaurante.
"""

import json
import mimetypes
from pathlib import Path

import requests


class EniuError(Exception):
    def __init__(self, status, message, payload=None):
        super().__init__(f"{status}: {message}")
        self.status = status
        self.message = message
        self.payload = payload or {}


def _pick(payload, key):
    """Las rutas responden {"<key>": ...}; algunas, el objeto suelto."""
    if isinstance(payload, dict) and key in payload:
        return payload[key]
    return payload


class EniuAPI:
    def __init__(self, base_url, session_file=None, timeout=60):
        self.base_url = base_url.rstrip("/")
        self.session_file = Path(session_file) if session_file else None
        self.timeout = timeout
        self.http = requests.Session()
        self.tokens = {}
        if self.session_file and self.session_file.exists():
            self.tokens = json.loads(self.session_file.read_text(encoding="utf-8"))

    # --- sesión --------------------------------------------------------------

    def _save_tokens(self):
        if self.session_file:
            self.session_file.parent.mkdir(parents=True, exist_ok=True)
            self.session_file.write_text(json.dumps(self.tokens), encoding="utf-8")

    def login(self, identifier, password):
        data = self._request("POST", "/auth/login", json={"identifier": identifier, "password": password}, auth=False)
        self.tokens = {"access": data["access_token"], "refresh": data["refresh_token"]}
        self._save_tokens()
        return data["user"]

    def _refresh(self):
        if not self.tokens.get("refresh"):
            return False
        response = self.http.post(
            f"{self.base_url}/auth/refresh",
            headers={"Authorization": f"Bearer {self.tokens['refresh']}"},
            timeout=self.timeout,
        )
        if response.status_code != 200:
            return False
        self.tokens["access"] = response.json()["access_token"]
        self._save_tokens()
        return True

    @property
    def logged_in(self):
        return bool(self.tokens.get("access"))

    # --- transporte ----------------------------------------------------------

    def _request(self, method, path, *, json=None, data=None, files=None, params=None, auth=True, retry=True):
        headers = {"Accept-Language": "es"}
        if auth:
            if not self.tokens.get("access"):
                raise EniuError(401, "No hay sesión iniciada")
            headers["Authorization"] = f"Bearer {self.tokens['access']}"
        response = self.http.request(
            method, f"{self.base_url}{path}", json=json, data=data, files=files,
            params=params, headers=headers, timeout=self.timeout,
        )
        if response.status_code == 401 and auth and retry and self._refresh():
            return self._request(method, path, json=json, data=data, files=files, params=params, auth=auth, retry=False)
        try:
            payload = response.json()
        except ValueError:
            payload = {"message": response.text[:300]}
        if response.status_code >= 400:
            message = payload.get("message") if isinstance(payload, dict) else str(payload)
            raise EniuError(response.status_code, message or response.reason, payload)
        return payload

    @staticmethod
    def _files(field, paths):
        """Archivos para multipart; acepta rutas o tuplas (nombre, bytes, mimetype)."""
        files = []
        for item in paths:
            if isinstance(item, tuple):
                files.append((field, item))
            else:
                path = Path(item)
                mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
                files.append((field, (path.name, path.read_bytes(), mime)))
        return files

    # --- cuenta ----------------------------------------------------------------

    def me(self):
        return _pick(self._request("GET", "/auth/me"), "user")

    def set_language(self, language):
        return self._request("PATCH", "/users/me", json={"language": language})

    def update_me(self, fields):
        return _pick(self._request("PATCH", "/users/me", json=fields), "user")

    # --- negocios --------------------------------------------------------------

    def businesses(self):
        return _pick(self._request("GET", "/businesses"), "businesses")

    def create_business(self, fields):
        return _pick(self._request("POST", "/businesses", json=fields), "business")

    def update_business(self, business_id, fields, photo=None):
        if photo is not None:
            form = {key: str(value) for key, value in fields.items()}
            payload = self._request("PATCH", f"/businesses/{business_id}", data=form, files=self._files("photo", [photo]))
        else:
            payload = self._request("PATCH", f"/businesses/{business_id}", json=fields)
        return _pick(payload, "business")

    # --- menús (catálogos) -----------------------------------------------------

    def catalogues(self, business_id):
        return _pick(self._request("GET", f"/businesses/{business_id}/catalogues"), "catalogues")

    def catalogue(self, business_id, catalogue_id):
        return _pick(self._request("GET", f"/businesses/{business_id}/catalogues/{catalogue_id}"), "catalogue")

    def create_catalogue(self, business_id, fields):
        return _pick(self._request("POST", f"/businesses/{business_id}/catalogues", json=fields), "catalogue")

    def update_catalogue(self, business_id, catalogue_id, fields):
        return _pick(self._request("PATCH", f"/businesses/{business_id}/catalogues/{catalogue_id}", json=fields), "catalogue")

    def delete_catalogue(self, business_id, catalogue_id):
        return self._request("DELETE", f"/businesses/{business_id}/catalogues/{catalogue_id}")

    def publish(self, business_id, catalogue_id, published=True):
        action = "publish" if published else "unpublish"
        return self._request("POST", f"/businesses/{business_id}/catalogues/{catalogue_id}/{action}")

    def publication(self, business_id, catalogue_id):
        return self._request("GET", f"/businesses/{business_id}/catalogues/{catalogue_id}/publication")

    # --- categorías ------------------------------------------------------------

    def categories(self, business_id, catalogue_id):
        return _pick(self._request("GET", f"/businesses/{business_id}/catalogues/{catalogue_id}/categories"), "categories")

    def create_category(self, business_id, catalogue_id, fields):
        return _pick(self._request("POST", f"/businesses/{business_id}/catalogues/{catalogue_id}/categories", json=fields), "category")

    def update_category(self, business_id, catalogue_id, category_id, fields):
        path = f"/businesses/{business_id}/catalogues/{catalogue_id}/categories/{category_id}"
        return _pick(self._request("PATCH", path, json=fields), "category")

    def delete_category(self, business_id, catalogue_id, category_id):
        return self._request("DELETE", f"/businesses/{business_id}/catalogues/{catalogue_id}/categories/{category_id}")

    # --- productos ---------------------------------------------------------------

    def products(self, business_id, catalogue_id):
        return _pick(self._request("GET", f"/businesses/{business_id}/catalogues/{catalogue_id}/products"), "products")

    def _product_request(self, method, path, fields, images):
        fields = {key: value for key, value in fields.items() if value is not None}
        if not images:
            # Sin fotos la ruta espera JSON (un formulario urlencoded lo rechaza).
            return _pick(self._request(method, path, json=fields), "product")
        # Con fotos, multipart: los campos van como texto.
        form = {key: ("true" if value is True else "false" if value is False else str(value)) for key, value in fields.items()}
        return _pick(self._request(method, path, data=form, files=self._files("images", images)), "product")

    def create_product(self, business_id, catalogue_id, fields, images=()):
        return self._product_request("POST", f"/businesses/{business_id}/catalogues/{catalogue_id}/products", fields, images)

    def update_product(self, business_id, catalogue_id, product_id, fields, images=None):
        path = f"/businesses/{business_id}/catalogues/{catalogue_id}/products/{product_id}"
        return self._product_request("PATCH", path, fields, images)

    def delete_product(self, business_id, catalogue_id, product_id):
        return self._request("DELETE", f"/businesses/{business_id}/catalogues/{catalogue_id}/products/{product_id}")

    # --- promociones ---------------------------------------------------------------

    def promotions(self, business_id, catalogue_id):
        return _pick(self._request("GET", f"/businesses/{business_id}/catalogues/{catalogue_id}/promotions"), "promotions")

    def create_promotion(self, business_id, catalogue_id, fields):
        path = f"/businesses/{business_id}/catalogues/{catalogue_id}/promotions"
        return _pick(self._request("POST", path, json=fields), "promotion")

    def update_promotion(self, business_id, catalogue_id, promotion_id, fields):
        path = f"/businesses/{business_id}/catalogues/{catalogue_id}/promotions/{promotion_id}"
        return _pick(self._request("PATCH", path, json=fields), "promotion")

    def delete_promotion(self, business_id, catalogue_id, promotion_id):
        return self._request("DELETE", f"/businesses/{business_id}/catalogues/{catalogue_id}/promotions/{promotion_id}")

    # --- plantilla -------------------------------------------------------------------

    def template_catalog(self):
        return self._request("GET", "/templates", auth=False)

    def template(self, business_id, catalogue_id):
        return self._request("GET", f"/businesses/{business_id}/catalogues/{catalogue_id}/template")

    def update_template(self, business_id, catalogue_id, fields, cover=None, background=None, splash=None):
        path = f"/businesses/{business_id}/catalogues/{catalogue_id}/template"
        if cover is None and background is None and splash is None:
            return self._request("PATCH", path, json=fields)
        # Con imágenes la ruta pide multipart y los objetos van serializados.
        form = {}
        for key, value in fields.items():
            form[key] = json.dumps(value) if isinstance(value, (dict, list)) else ("" if value is None else str(value))
        files = []
        for field, item in (("cover", cover), ("background", background), ("splash", splash)):
            if item is not None:
                files += self._files(field, [item])
        return self._request("PATCH", path, data=form, files=files)

    # --- analíticas y menú público ------------------------------------------------------

    def analytics(self, business_id, catalogue_id, date_from=None, date_to=None):
        params = {key: value for key, value in (("from", date_from), ("to", date_to)) if value}
        return self._request("GET", f"/businesses/{business_id}/catalogues/{catalogue_id}/analytics", params=params)

    def public_menu(self, slug):
        return self._request("GET", f"/public/menus/{slug}", auth=False)
