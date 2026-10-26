"""Línea de comandos del estudio. `studio.py --help` para ver todo."""

import argparse
import json
import os
import sys
import unicodedata
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from . import database, demo, images, local, traffic
from .api import EniuAPI, EniuError
from .env import ENVIRONMENTS, STATE_DIR, api_url, open_app, public_web_url, remote_credentials


# --- utilidades ---------------------------------------------------------------------------

def _norm(text):
    text = unicodedata.normalize("NFKD", (text or "").strip().lower())
    return "".join(ch for ch in text if not unicodedata.combining(ch))


class Context:
    def __init__(self, args):
        self.args = args
        self.env = args.env
        self._api = None

    def say(self, text=""):
        if not self.args.json:
            print(text, flush=True)

    def done(self, data, text=None):
        if self.args.json:
            print(json.dumps(data, ensure_ascii=False, indent=2, default=str))
        elif text:
            print(text)

    @property
    def api(self):
        if self._api is None:
            self._api = EniuAPI(api_url(self.env), STATE_DIR / f"session-{self.env}.json")
            try:
                if not self._api.logged_in:
                    raise EniuError(401, "sin sesión")
                self._api.me()
            except EniuError as error:
                if error.status != 401:
                    raise
                self.login()
        return self._api

    def login(self):
        api = self._api or EniuAPI(api_url(self.env), STATE_DIR / f"session-{self.env}.json")
        self._api = api
        if self.env == "local":
            account = local.account()
            return api.login(account["email"], account["password"])
        email, password = remote_credentials()
        return api.login(email, password)

    def database_app(self):
        """App del backend con acceso directo a la base de datos del entorno."""
        if self.env == "local":
            return local.app()
        url = os.getenv("DATABASE_URL")
        if not url or url.startswith("sqlite"):
            raise SystemExit(f"Para escribir en la base de datos de {self.env} hace falta DATABASE_URL (Postgres) de ese entorno.")
        if not self.args.yes:
            raise SystemExit(f"Esto escribe directo en la base de datos de {self.env}. Repite el comando con --yes para confirmar.")
        # Algunos proveedores dan postgres://, que SQLAlchemy 2 ya no acepta.
        if url.startswith("postgres://"):
            url = "postgresql://" + url.removeprefix("postgres://")
        flask_app = open_app(url)
        database.check_connection(flask_app)
        return flask_app

    # --- búsquedas ---------------------------------------------------------------------

    def businesses(self):
        return self.api.businesses()

    def business(self, ref):
        items = self.businesses()
        found = [b for b in items if b["id"] == ref or _norm(b["name"]) == _norm(ref)]
        if not found:
            raise SystemExit(f"No encuentro el negocio {ref!r}. Negocios: {', '.join(b['name'] for b in items) or 'ninguno'}")
        return found[0]

    def menus(self):
        for business in self.businesses():
            for catalogue in self.api.catalogues(business["id"]):
                yield business, catalogue

    def menu(self, ref):
        options = list(self.menus())
        found = [(b, c) for b, c in options if ref in (c["id"], c.get("public_slug")) or _norm(c["name"]) == _norm(ref)]
        if len(found) == 1:
            return found[0]
        names = ", ".join(f"{c['name']} ({b['name']})" for b, c in options) or "ninguno"
        if not found:
            raise SystemExit(f"No encuentro el menú {ref!r}. Menús: {names}")
        raise SystemExit(f"Hay varios menús {ref!r}; usa su id o su slug. Menús: {names}")

    def find(self, items, ref, kind):
        found = [item for item in items if item["id"] == ref or _norm(item["name"]) == _norm(ref)]
        if not found:
            raise SystemExit(f"No encuentro {kind} {ref!r}")
        return found[0]


def _image_arg(value, name, cover=False):
    if value is None:
        return None
    if value in ("none", "no"):
        return None
    return demo.image_for(value, name, os.getcwd(), cover=cover)


def _menu_url(ctx, catalogue):
    slug = catalogue.get("public_slug")
    return f"{public_web_url(ctx.env)}/m/{slug}" if slug else None


def _parse_popularity(text):
    weights = {}
    for item in filter(None, (part.strip() for part in (text or "").split(","))):
        name, _sep, weight = item.rpartition("=")
        if not name:
            raise SystemExit(f"Popularidad inválida: {item!r}. Formato: \"Tacos de birria=10,Guacamole=6\"")
        weights[name.strip()] = float(weight)
    return weights


# --- comandos: entorno local ------------------------------------------------------------------

def cmd_local_init(ctx):
    if not ctx.args.skip_dashboard:
        ctx.say("Compilando el dashboard web (un minuto)...")
    info = local.init(plan=ctx.args.plan, reset=ctx.args.reset, build=not ctx.args.skip_dashboard)
    ctx.done(info, "\n".join([
        f"Entorno local listo ({'cuenta nueva' if info['account_created'] else 'cuenta existente'}).",
        f"  Base de datos  {info['database']}",
        f"  Cuenta demo    {info['account']}  (plan {info['plan']}; credenciales en {info['credentials_file']})",
        f"  Dashboard      {info['dashboard'] or 'sin compilar (studio.py local build)'}",
        "  Arranca el servidor con: studio.py local serve",
    ]))


def cmd_local_serve(ctx):
    local.serve()


def cmd_local_build(ctx):
    ctx.say("Compilando el dashboard web...")
    local.build_dashboard()
    ctx.done({"dashboard": str(local.DASHBOARD_DIST)}, f"Listo: {local.DASHBOARD_DIST} (lo sirve `studio.py local serve` en {local.LOCAL_DASHBOARD_URL})")


def cmd_local_status(ctx):
    import requests

    status = {}
    for name, url in (("api", api_url("local") + "/health"), ("dashboard", local.LOCAL_DASHBOARD_URL + "/login")):
        try:
            status[name] = requests.get(url, timeout=3).status_code < 500
        except requests.RequestException:
            status[name] = False
    status["account"] = local.ACCOUNT_FILE.exists() and local.account()["email"]
    status["database"] = str(local.LOCAL_DB_PATH) if local.LOCAL_DB_PATH.exists() else None
    ctx.done(status, "\n".join(f"  {key:<10} {value}" for key, value in status.items()))


# --- comandos: cuenta y vista general ----------------------------------------------------------

def cmd_login(ctx):
    user = ctx.login()
    ctx.done(user, f"Sesión iniciada en {ctx.env} como {user['email']} (plan {user['plan'].get('name', user['plan'].get('key'))}).")


def cmd_whoami(ctx):
    user = ctx.api.me()
    ctx.done(user, f"{user['email']} · plan {user['plan'].get('name', user['plan'].get('key'))} · idioma {user.get('language')} · {ctx.env}")


def cmd_language(ctx):
    ctx.api.set_language(ctx.args.language)
    ctx.done({"language": ctx.args.language}, f"Idioma de la cuenta: {ctx.args.language}")


def cmd_ls(ctx):
    tree, lines = [], []
    for business in ctx.businesses():
        node = {**business, "menus": []}
        lines.append(f"{business['name']}  ·  {business.get('currency') or '-'} · {business.get('timezone') or '-'}  ·  id {business['id']}")
        for catalogue in ctx.api.catalogues(business["id"]):
            categories = ctx.api.categories(business["id"], catalogue["id"])
            products = ctx.api.products(business["id"], catalogue["id"])
            promotions = ctx.api.promotions(business["id"], catalogue["id"])
            node["menus"].append({**catalogue, "categories": len(categories), "products": len(products), "promotions": len(promotions)})
            state = "publicado" if catalogue.get("is_published") else "borrador"
            lines.append(f"  └ {catalogue['name']}  [{state}]  {_menu_url(ctx, catalogue) or ''}")
            lines.append(f"      {len(categories)} categorías · {len(products)} productos · {len(promotions)} promociones  ·  id {catalogue['id']}")
        tree.append(node)
    ctx.done(tree, "\n".join(lines) or "La cuenta no tiene negocios todavía.")


def cmd_templates(ctx):
    catalog = ctx.api.template_catalog()
    if ctx.args.json:
        return ctx.done(catalog)

    def keys(section):
        items = catalog.get(section) or []
        return ", ".join(item.get("key", "") for item in items) if isinstance(items, list) else ", ".join(items)

    print(f"Layouts:  {keys('layouts')}\nPaletas:  {keys('palettes')}\nFuentes:  {keys('fonts')}")


# --- comandos: contenido -------------------------------------------------------------------

def cmd_business_create(ctx):
    a = ctx.args
    business = ctx.api.create_business({key: value for key, value in (("name", a.name), ("currency", a.currency), ("timezone", a.timezone)) if value})
    extra = {key: value for key, value in (("description", a.description), ("address", a.address), ("phone", a.phone)) if value}
    photo = images.logo(a.name) if a.photo == "auto" else _image_arg(a.photo, a.name)
    if extra or photo:
        business = ctx.api.update_business(business["id"], extra, photo=photo)
    ctx.done(business, f"+ negocio {business['name']}  (id {business['id']})")


def cmd_business_update(ctx):
    a = ctx.args
    business = ctx.business(a.business)
    fields = {key: value for key, value in vars(a).items() if key in demo.BUSINESS_FIELDS + ("name",) and value is not None and key != "business"}
    photo = images.logo(fields.get("name", business["name"])) if a.photo == "auto" else _image_arg(a.photo, business["name"])
    business = ctx.api.update_business(business["id"], fields, photo=photo)
    ctx.done(business, f"~ negocio {business['name']}")


def cmd_menu_create(ctx):
    business = ctx.business(ctx.args.business)
    catalogue = ctx.api.create_catalogue(business["id"], {"name": ctx.args.name, "description": ctx.args.description})
    ctx.done(catalogue, f"+ menú {catalogue['name']}  (id {catalogue['id']})")


def cmd_menu_delete(ctx):
    business, catalogue = ctx.menu(ctx.args.menu)
    if not ctx.args.yes:
        raise SystemExit(f"Esto borra el menú {catalogue['name']} con todo su contenido. Repite con --yes.")
    ctx.api.delete_catalogue(business["id"], catalogue["id"])
    ctx.done({"deleted": catalogue["id"]}, f"- menú {catalogue['name']}")


def cmd_menu_publish(ctx, published=True):
    business, catalogue = ctx.menu(ctx.args.menu)
    ctx.api.publish(business["id"], catalogue["id"], published)
    catalogue = ctx.api.catalogue(business["id"], catalogue["id"])
    ctx.done(catalogue, f"{'Publicado' if published else 'Despublicado'}: {catalogue['name']}  {_menu_url(ctx, catalogue) or ''}")


def cmd_menu_template(ctx):
    a = ctx.args
    business, catalogue = ctx.menu(a.menu)
    fields, theme = {}, {}
    if a.layout:
        fields["layout_key"] = a.layout
    if a.palette:
        fields["color_preset_key"] = a.palette
    if a.font:
        theme["font_key"] = a.font
    if a.show_cover is not None:
        theme["show_cover"] = a.show_cover == "yes"
    if a.show_images is not None:
        theme["show_product_images"] = a.show_images == "yes"
    if theme:
        fields["theme"] = theme
    cover = _image_arg(a.cover, catalogue["name"], cover=True)
    result = ctx.api.update_template(business["id"], catalogue["id"], fields, cover=cover)
    ctx.done(result, f"~ plantilla de {catalogue['name']}")


def cmd_category_add(ctx):
    business, catalogue = ctx.menu(ctx.args.menu)
    category = ctx.api.create_category(business["id"], catalogue["id"], {"name": ctx.args.name, "description": ctx.args.description})
    ctx.done(category, f"+ categoría {category['name']}")


def cmd_category_delete(ctx):
    business, catalogue = ctx.menu(ctx.args.menu)
    category = ctx.find(ctx.api.categories(business["id"], catalogue["id"]), ctx.args.name, "la categoría")
    if not ctx.args.yes:
        raise SystemExit(f"Esto borra la categoría {category['name']}. Repite con --yes.")
    ctx.api.delete_category(business["id"], catalogue["id"], category["id"])
    ctx.done({"deleted": category["id"]}, f"- categoría {category['name']}")


def _product_fields(ctx, business, catalogue, partial=False):
    a = ctx.args
    fields = {"name": getattr(a, "new_name", None) or (None if partial else a.name), "description": a.description, "price": a.price}
    if a.category:
        fields["category_id"] = ctx.find(ctx.api.categories(business["id"], catalogue["id"]), a.category, "la categoría")["id"]
    if a.available is not None:
        fields["is_available"] = a.available == "yes"
    return {key: value for key, value in fields.items() if value is not None}


def cmd_product_add(ctx):
    business, catalogue = ctx.menu(ctx.args.menu)
    image = _image_arg(ctx.args.image or "auto", ctx.args.name)
    product = ctx.api.create_product(business["id"], catalogue["id"], _product_fields(ctx, business, catalogue), images=[image] if image else [])
    ctx.done(product, f"+ producto {product['name']}  ${product.get('price')}")


def cmd_product_update(ctx):
    business, catalogue = ctx.menu(ctx.args.menu)
    product = ctx.find(ctx.api.products(business["id"], catalogue["id"]), ctx.args.name, "el producto")
    fields = _product_fields(ctx, business, catalogue, partial=True)
    image = _image_arg(ctx.args.image, product["name"])
    if image:
        fields["keep_image_ids"] = "[]"
    product = ctx.api.update_product(business["id"], catalogue["id"], product["id"], fields, images=[image] if image else None)
    ctx.done(product, f"~ producto {product['name']}")


def cmd_product_delete(ctx):
    business, catalogue = ctx.menu(ctx.args.menu)
    product = ctx.find(ctx.api.products(business["id"], catalogue["id"]), ctx.args.name, "el producto")
    if not ctx.args.yes:
        raise SystemExit(f"Esto borra el producto {product['name']}. Repite con --yes.")
    ctx.api.delete_product(business["id"], catalogue["id"], product["id"])
    ctx.done({"deleted": product["id"]}, f"- producto {product['name']}")


def cmd_promo_add(ctx):
    a = ctx.args
    business, catalogue = ctx.menu(a.menu)
    products = ctx.api.products(business["id"], catalogue["id"])
    categories = ctx.api.categories(business["id"], catalogue["id"])
    fields = {
        "name": a.name,
        "badge_label": a.badge,
        "is_active": True,
        "show_in_section": True,
        "days_of_week": [int(day) for day in a.days.split(",")] if a.days else [],
        "start_date": a.date_from,
        "end_date": a.date_to,
        "product_ids": [ctx.find(products, name.strip(), "el producto")["id"] for name in (a.products or "").split(",") if name.strip()],
        "category_ids": [ctx.find(categories, name.strip(), "la categoría")["id"] for name in (a.categories or "").split(",") if name.strip()],
    }
    promotion = ctx.api.create_promotion(business["id"], catalogue["id"], fields)
    ctx.done(promotion, f"+ promoción {promotion['name']}")


def cmd_promo_delete(ctx):
    business, catalogue = ctx.menu(ctx.args.menu)
    promotion = ctx.find(ctx.api.promotions(business["id"], catalogue["id"]), ctx.args.name, "la promoción")
    if not ctx.args.yes:
        raise SystemExit(f"Esto borra la promoción {promotion['name']}. Repite con --yes.")
    ctx.api.delete_promotion(business["id"], catalogue["id"], promotion["id"])
    ctx.done({"deleted": promotion["id"]}, f"- promoción {promotion['name']}")


# --- comandos: demo ------------------------------------------------------------------------

def cmd_demo_apply(ctx):
    spec, base_dir = demo.load(ctx.args.spec)
    applier = demo.Applier(ctx.api, base_dir, log=ctx.say)
    if spec.get("account"):
        applier.account(spec["account"])
    business = applier.business(spec["business"], ctx.args.business)
    results = []
    for menu_spec in spec.get("menus", []):
        catalogue = applier.menu(business, menu_spec, refresh_images=ctx.args.refresh_images)
        entry = {"menu": catalogue["name"], "id": catalogue["id"], "published": catalogue.get("is_published"), "url": _menu_url(ctx, catalogue)}
        if ctx.args.with_stats and menu_spec.get("stats") is not None and catalogue.get("is_published"):
            # La popularidad puede ir en cada producto ("popularity": 10) o en "stats".
            popularity = {
                product["name"]: product["popularity"]
                for category in menu_spec.get("categories", []) for product in category.get("products", [])
                if "popularity" in product
            }
            options = {**menu_spec["stats"], "popularity": {**popularity, **menu_spec["stats"].get("popularity", {})}}
            entry["stats"] = _seed(ctx, business, catalogue, options)
        results.append(entry)
    lines = [f"Demo aplicada en {ctx.env}: {business['name']}"]
    for entry in results:
        lines.append(f"  {entry['menu']}: {entry['url'] or 'sin publicar'}")
        if entry.get("stats"):
            s = entry["stats"]
            lines.append(f"    analíticas: {s['menu_views']} visitas, {s['visitors']} visitantes, {s['product_views']} vistas de producto")
    for warning in applier.warnings:
        lines.append(f"  ! {warning}")
    ctx.done({"business": business, "menus": results, "warnings": applier.warnings}, "\n".join(lines))


# --- comandos: estadísticas ------------------------------------------------------------------

def _seed(ctx, business, catalogue, options):
    if not catalogue.get("is_published") or not catalogue.get("public_slug"):
        raise SystemExit(f"{catalogue['name']} no está publicado: las analíticas sólo existen en menús publicados.")
    public = ctx.api.public_menu(catalogue["public_slug"])
    products, categories = traffic.targets_from_public_menu(public, options.get("popularity"))
    if not products:
        raise SystemExit(f"{catalogue['name']} no tiene productos visibles.")
    plan = traffic.Traffic(**{key: options[key] for key in ("days", "daily_views", "growth", "returning", "products_per_visit", "category_rate", "seed") if options.get(key) is not None})
    flask_app = ctx.database_app()
    if not database.catalogue_exists(flask_app, catalogue["id"]):
        raise SystemExit("Ese menú no existe en la base de datos de DATABASE_URL: ¿apunta a otro entorno?")
    # En Postgres la pantalla de Analíticas agrupa por hora y día en la zona del
    # negocio; en SQLite (el entorno local) lo hace en UTC
    # (`analytics/services.py::_date_hour_expressions`). Se genera con el reloj
    # que va a usar la pantalla para que el pico de comida y cena caiga donde debe.
    clock = business.get("timezone") or "UTC"
    if database.dialect(flask_app) == "sqlite":
        clock = "UTC"
    events, checks = traffic.generate_for_screenshots(catalogue["id"], plan, products, categories, clock)
    deleted, inserted = database.write_events(flask_app, catalogue["id"], events, replace=options.get("replace", "seeded"))
    return {**traffic.summarize(events), **checks, "replaced": deleted, "inserted": inserted, "days": plan.days}


def cmd_stats_seed(ctx):
    a = ctx.args
    business, catalogue = ctx.menu(a.menu)
    options = {
        "days": a.days, "daily_views": a.daily_views, "growth": a.growth, "returning": a.returning,
        "seed": a.seed, "popularity": _parse_popularity(a.popular), "replace": None if a.keep_previous else "seeded",
    }
    result = _seed(ctx, business, catalogue, options)
    changes = ", ".join(
        f"{result[key]:+}% en {window} días" for key, window in (("growth_7d", 7), ("growth_30d", 30)) if result[key] is not None
    )
    ctx.done(result, "\n".join([
        f"Analíticas sembradas en {catalogue['name']} ({ctx.env}, últimos {result['days']} días):",
        f"  {result['menu_views']} visitas · {result['visitors']} visitantes · {result['product_views']} vistas de producto · {result['category_selects']} filtros",
        f"  visitas vs periodo anterior: {changes or 'sin periodo anterior que comparar'} (semilla {result['seed']})",
        f"  (se reemplazaron {result['replaced']} eventos sembrados antes; las visitas reales no se tocan)",
    ]))


def cmd_stats_clear(ctx):
    business, catalogue = ctx.menu(ctx.args.menu)
    if ctx.args.all and not ctx.args.yes:
        raise SystemExit("--all borra también las visitas reales. Repite con --yes.")
    deleted = database.clear_events(ctx.database_app(), catalogue["id"], everything=ctx.args.all)
    ctx.done({"deleted": deleted}, f"Borrados {deleted} eventos de {catalogue['name']}.")


def cmd_stats_show(ctx):
    business, catalogue = ctx.menu(ctx.args.menu)
    zone = ZoneInfo(business.get("timezone") or "UTC")
    today = datetime.now(timezone.utc).astimezone(zone).date()
    start = today - timedelta(days=ctx.args.days - 1)
    data = ctx.api.analytics(business["id"], catalogue["id"], start.isoformat(), today.isoformat())
    if ctx.args.json:
        return ctx.done(data)
    s = data.get("summary", {})

    def metric(key):
        item = s.get(key) or {}
        change = item.get("percentage_change")
        arrow = f" ({'+' if (change or 0) > 0 else ''}{change}% vs periodo anterior)" if change is not None else ""
        return f"{item.get('value')}{arrow}"

    top = s.get("top_product") or {}
    day = s.get("busiest_day") or {}
    hour = s.get("busiest_hour") or {}
    print(f"{catalogue['name']} · del {start} al {today} ({ctx.args.days} días)")
    print(f"  Visitas al menú            {metric('menu_views')}")
    print(f"  Visitantes únicos          {metric('approximate_unique_visitors')}")
    print(f"  Interacciones de producto  {metric('product_interactions')}")
    print(f"  Producto con más interés   {top.get('name')} ({top.get('interactions')})")
    print(f"  Día con más actividad      {day.get('date')} ({day.get('views')} visitas)")
    print(f"  Hora con más actividad     {hour.get('label')} ({hour.get('views')} visitas)")
    print("  Categorías  " + ", ".join(f"{c['name']} {c['percentage']}%" for c in data.get("top_categories", [])[:5]))
    print("  Dispositivos " + ", ".join(f"{d['label']} {d['percentage']}%" for d in data.get("devices", [])))
    print("  Fuentes     " + ", ".join(f"{d['label']} {d['percentage']}%" for d in data.get("sources", [])))


def cmd_plan_set(ctx):
    email = ctx.args.email or (local.account()["email"] if ctx.env == "local" else remote_credentials()[0])
    plan = database.set_plan(ctx.database_app(), email, ctx.args.plan)
    ctx.done(plan, f"{email}: plan {plan.get('name', ctx.args.plan)}")


# --- argparse ----------------------------------------------------------------------------------------

def _parser():
    parser = argparse.ArgumentParser(
        prog="studio.py",
        description="Eniu Studio: maneja Eniu desde la terminal (menús, productos, plantillas, promociones y analíticas de demostración).",
    )
    parser.add_argument("--env", choices=ENVIRONMENTS, default=os.getenv("ENIU_STUDIO_ENV", "local"), help="entorno (default: local)")
    parser.add_argument("--json", action="store_true", help="salida en JSON")
    parser.add_argument("--yes", action="store_true", help="confirma acciones que borran o escriben directo en la base de datos")
    sub = parser.add_subparsers(dest="command", required=True)

    def group(name, help_text):
        p = sub.add_parser(name, help=help_text)
        return p.add_subparsers(dest="action", required=True)

    loc = group("local", "Eniu completo en tu máquina (API sobre SQLite + dashboard)")
    p = loc.add_parser("init", help="prepara la base de datos local y la cuenta demo")
    p.add_argument("--plan", default="pro", help="plan de la cuenta demo (default: pro)")
    p.add_argument("--reset", action="store_true", help="borra la base local y empieza de cero")
    p.add_argument("--skip-dashboard", action="store_true", help="no compila el dashboard web")
    p.set_defaults(func=cmd_local_init)
    loc.add_parser("serve", help="arranca la API y el dashboard en http://localhost:5055 (bloquea la terminal)").set_defaults(func=cmd_local_serve)
    loc.add_parser("build", help="vuelve a compilar el dashboard web (tras cambios en client/eniu)").set_defaults(func=cmd_local_build)
    loc.add_parser("status", help="qué está corriendo").set_defaults(func=cmd_local_status)

    sub.add_parser("login", help="inicia sesión (local: cuenta demo; remoto: ENIU_EMAIL/ENIU_PASSWORD)").set_defaults(func=cmd_login)
    sub.add_parser("whoami", help="cuenta y plan con la sesión actual").set_defaults(func=cmd_whoami)
    p = sub.add_parser("language", help="idioma de la cuenta (es/en)")
    p.add_argument("language", choices=["es", "en"])
    p.set_defaults(func=cmd_language)
    sub.add_parser("ls", help="negocios, menús y cuánto contenido tiene cada uno").set_defaults(func=cmd_ls)
    sub.add_parser("templates", help="layouts, paletas y fuentes disponibles").set_defaults(func=cmd_templates)

    biz = group("business", "negocios")
    p = biz.add_parser("create", help="crea un negocio")
    p.add_argument("name")
    for flag in ("currency", "timezone", "description", "address", "phone"):
        p.add_argument(f"--{flag}")
    p.add_argument("--photo", help="ruta a una imagen o 'auto' para un logo con iniciales")
    p.set_defaults(func=cmd_business_create)
    p = biz.add_parser("update", help="edita un negocio")
    p.add_argument("business", help="nombre o id")
    for flag in ("name",) + demo.BUSINESS_FIELDS:
        p.add_argument(f"--{flag}")
    p.add_argument("--photo")
    p.set_defaults(func=cmd_business_update)

    menu = group("menu", "menús (catálogos)")
    p = menu.add_parser("create", help="crea un menú")
    p.add_argument("business", help="nombre o id del negocio")
    p.add_argument("name")
    p.add_argument("--description")
    p.set_defaults(func=cmd_menu_create)
    p = menu.add_parser("delete", help="borra un menú")
    p.add_argument("menu", help="nombre, slug o id")
    p.set_defaults(func=cmd_menu_delete)
    p = menu.add_parser("publish", help="publica un menú")
    p.add_argument("menu")
    p.set_defaults(func=cmd_menu_publish)
    p = menu.add_parser("unpublish", help="despublica un menú")
    p.add_argument("menu")
    p.set_defaults(func=lambda ctx: cmd_menu_publish(ctx, published=False))
    p = menu.add_parser("template", help="cambia layout, paleta, fuente o portada")
    p.add_argument("menu")
    p.add_argument("--layout")
    p.add_argument("--palette")
    p.add_argument("--font")
    p.add_argument("--cover", help="ruta o 'auto'")
    p.add_argument("--show-cover", choices=["yes", "no"])
    p.add_argument("--show-images", choices=["yes", "no"])
    p.set_defaults(func=cmd_menu_template)

    cat = group("category", "categorías")
    p = cat.add_parser("add", help="agrega una categoría")
    p.add_argument("menu")
    p.add_argument("name")
    p.add_argument("--description")
    p.set_defaults(func=cmd_category_add)
    p = cat.add_parser("delete", help="borra una categoría")
    p.add_argument("menu")
    p.add_argument("name")
    p.set_defaults(func=cmd_category_delete)

    prod = group("product", "productos")
    for action, func in (("add", cmd_product_add), ("update", cmd_product_update)):
        p = prod.add_parser(action, help=f"{'agrega' if action == 'add' else 'edita'} un producto")
        p.add_argument("menu")
        p.add_argument("name")
        if action == "update":
            p.add_argument("--new-name")
        p.add_argument("--price", required=action == "add")
        p.add_argument("--description")
        p.add_argument("--category")
        p.add_argument("--available", choices=["yes", "no"])
        p.add_argument("--image", help="ruta, 'auto' (foto dibujada) o 'none'")
        p.set_defaults(func=func)
    p = prod.add_parser("delete", help="borra un producto")
    p.add_argument("menu")
    p.add_argument("name")
    p.set_defaults(func=cmd_product_delete)

    promo = group("promo", "promociones")
    p = promo.add_parser("add", help="crea una promoción")
    p.add_argument("menu")
    p.add_argument("name")
    p.add_argument("--badge", help="etiqueta (ej. 2x1)")
    p.add_argument("--days", help="días 0-6 (0 = lunes), ej. 1,3")
    p.add_argument("--products", help="nombres separados por coma")
    p.add_argument("--categories", help="nombres separados por coma")
    p.add_argument("--from", dest="date_from", help="AAAA-MM-DD")
    p.add_argument("--to", dest="date_to", help="AAAA-MM-DD")
    p.set_defaults(func=cmd_promo_add)
    p = promo.add_parser("delete", help="borra una promoción")
    p.add_argument("menu")
    p.add_argument("name")
    p.set_defaults(func=cmd_promo_delete)

    dm = group("demo", "demos completas desde un archivo JSON")
    p = dm.add_parser("apply", help="crea o actualiza todo lo que describe el archivo")
    p.add_argument("spec", help="ruta al JSON (ej. tools/eniu-studio/demos/casa-nopal.json)")
    p.add_argument("--business", help="aplicar sobre un negocio existente con otro nombre")
    p.add_argument("--refresh-images", action="store_true", help="vuelve a subir las fotos de los productos")
    p.add_argument("--with-stats", action="store_true", help="siembra también las analíticas del archivo")
    p.set_defaults(func=cmd_demo_apply)

    st = group("stats", "analíticas de demostración")
    p = st.add_parser("seed", help="llena las analíticas de un menú publicado con tráfico creíble")
    p.add_argument("menu")
    p.add_argument("--days", type=int, default=60, help="días hacia atrás (default 60: permite comparar 30 contra 30)")
    p.add_argument("--daily-views", type=float, default=40, help="visitas en un día normal al inicio (default 40)")
    p.add_argument("--growth", type=float, default=0.6, help="crecimiento a lo largo del periodo (default 0.6 = +60%%)")
    p.add_argument("--returning", type=float, default=0.28, help="fracción de visitas recurrentes (default 0.28)")
    p.add_argument("--popular", help="peso por producto, ej. \"Tacos de birria=10,Guacamole=6\"")
    p.add_argument("--seed", type=int, help="semilla para un resultado reproducible")
    p.add_argument("--keep-previous", action="store_true", help="suma a lo sembrado antes en vez de reemplazarlo")
    p.set_defaults(func=cmd_stats_seed)
    p = st.add_parser("clear", help="borra lo sembrado (o todo con --all)")
    p.add_argument("menu")
    p.add_argument("--all", action="store_true")
    p.set_defaults(func=cmd_stats_clear)
    p = st.add_parser("show", help="lo que muestra la pantalla de Analíticas")
    p.add_argument("menu")
    p.add_argument("--days", type=int, default=30)
    p.set_defaults(func=cmd_stats_show)

    pl = group("plan", "plan de la cuenta (sin cobro, para cuentas demo)")
    p = pl.add_parser("set", help="cambia el plan: free, essential o pro")
    p.add_argument("plan")
    p.add_argument("--email", help="cuenta (default: la del entorno)")
    p.set_defaults(func=cmd_plan_set)
    return parser


def main(argv=None):
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except AttributeError:
            pass
    # --yes, --json y --env valen en cualquier posición (`promo delete X --yes`),
    # no sólo antes del subcomando como pide argparse.
    argv = list(sys.argv[1:] if argv is None else argv)
    front = [flag for flag in ("--yes", "--json") if flag in argv]
    argv = [arg for arg in argv if arg not in front]
    if "--env" in argv[1:]:
        at = argv.index("--env")
        front += argv[at : at + 2]
        del argv[at : at + 2]
    args = _parser().parse_args(front + argv)
    ctx = Context(args)
    try:
        args.func(ctx)
    except EniuError as error:
        detail = error.payload.get("fields") or error.payload.get("code") or ""
        raise SystemExit(f"Error de la API ({error.status}): {error.message} {detail}".strip())

