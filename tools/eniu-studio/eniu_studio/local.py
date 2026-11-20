"""Eniu completo en tu máquina: la API del backend sobre SQLite y el
dashboard web, servidos juntos en http://localhost:5055.

El dashboard se sirve compilado (`vite build`), no con el servidor de
desarrollo: es lo mismo que ve un usuario en producción, sin los dobles
montajes de React StrictMode ni avisos de desarrollo — justo lo que hace
falta para sacar capturas.

Todo vive en `tools/eniu-studio/.studio/` (ignorado por git): la base de
datos, las fotos subidas, el dashboard compilado, los secretos de la API
local y la cuenta demo. Nada de esto toca staging ni producción.
"""

import json
import secrets
import shutil
import subprocess
import sys

from . import database
from .env import (
    CLIENT_DIR, LOCAL_API_PORT, LOCAL_BROWSER_API_URL, LOCAL_DASHBOARD_URL, LOCAL_DB_PATH, LOCAL_DB_URL,
    STATE_DIR, open_app,
)

ACCOUNT_FILE = STATE_DIR / "local-account.json"
SECRETS_FILE = STATE_DIR / "local-secrets.json"
UPLOADS_DIR = STATE_DIR / "uploads"
DASHBOARD_DIST = STATE_DIR / "dashboard"
# Vite carga `.env.<modo>.local` por encima de `.env.local`: compilado en modo
# "studio", el dashboard habla con la API local sin tocar la configuración normal.
DASHBOARD_ENV_FILE = CLIENT_DIR / ".env.studio.local"
DEMO_EMAIL = "demo@eniu-studio.test"


def _secrets():
    if SECRETS_FILE.exists():
        return json.loads(SECRETS_FILE.read_text(encoding="utf-8"))
    values = {name: secrets.token_urlsafe(48) for name in ("secret_key", "jwt_secret_key", "reset_secret_key", "analytics_secret")}
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    SECRETS_FILE.write_text(json.dumps(values, indent=2), encoding="utf-8")
    return values


def config():
    keys = _secrets()
    # Además del propio origen, los servidores de desarrollo del dashboard (5174) y
    # de la app móvil en web (8081), por si se quieren apuntar a esta API.
    origins = [LOCAL_DASHBOARD_URL, "http://localhost:5174", "http://localhost:8081"]
    folders = {
        "BUSINESS_UPLOAD_FOLDER": "businesses",
        "PRODUCT_UPLOAD_FOLDER": "products",
        "CATALOGUE_COVER_FOLDER": "catalogue-covers",
        "CATALOGUE_BACKGROUND_FOLDER": "catalogue-backgrounds",
        "CATALOGUE_SPLASH_FOLDER": "catalogue-splashes",
    }
    return {
        "SECRET_KEY": keys["secret_key"],
        "JWT_SECRET_KEY": keys["jwt_secret_key"],
        "PASSWORD_RESET_SECRET_KEY": keys["reset_secret_key"],
        "ANALYTICS_TOKEN_SECRET": keys["analytics_secret"],
        # El estudio hace muchas peticiones seguidas; el límite de producción no aplica aquí.
        "RATELIMIT_ENABLED": False,
        "CORS_ORIGINS": origins,
        "FRONTEND_URL": LOCAL_DASHBOARD_URL,
        "PUBLIC_WEB_BASE_URL": LOCAL_DASHBOARD_URL,
        "STORAGE_BACKEND": "local",
        "CACHE_TYPE": "SimpleCache",
        **{key: str(UPLOADS_DIR / folder) for key, folder in folders.items()},
    }


def app():
    return open_app(LOCAL_DB_URL, config())


def account():
    if not ACCOUNT_FILE.exists():
        raise SystemExit("El entorno local no está preparado. Corre primero: studio.py local init")
    return json.loads(ACCOUNT_FILE.read_text(encoding="utf-8"))


def init(plan="pro", reset=False, build=True):
    if reset:
        for path in (LOCAL_DB_PATH, UPLOADS_DIR, ACCOUNT_FILE):
            if path.is_dir():
                shutil.rmtree(path)
            elif path.exists():
                path.unlink()
        for session in STATE_DIR.glob("session-local*.json"):
            session.unlink()
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    for folder in ("businesses", "products", "catalogue-covers", "catalogue-backgrounds", "catalogue-splashes"):
        (UPLOADS_DIR / folder).mkdir(parents=True, exist_ok=True)

    flask_app = app()
    database.create_schema(flask_app)

    if ACCOUNT_FILE.exists():
        creds = json.loads(ACCOUNT_FILE.read_text(encoding="utf-8"))
    else:
        # Credenciales de prueba sólo para la API local; se guardan aquí y no se muestran.
        creds = {"email": DEMO_EMAIL, "password": secrets.token_urlsafe(18), "phone": "+520000000001"}
        ACCOUNT_FILE.write_text(json.dumps(creds, indent=2), encoding="utf-8")
    _user, created = database.ensure_user(flask_app, creds["email"], creds["password"], creds["phone"])
    plan_info = database.set_plan(flask_app, creds["email"], plan)
    built = build_dashboard() if build else DASHBOARD_DIST.exists()
    return {
        "database": str(LOCAL_DB_PATH),
        "account": creds["email"],
        "account_created": created,
        "credentials_file": str(ACCOUNT_FILE),
        "plan": plan_info.get("key") or plan,
        "dashboard": LOCAL_DASHBOARD_URL if built else None,
    }


def build_dashboard():
    """Compila el dashboard web apuntando a la API local."""
    DASHBOARD_ENV_FILE.write_text(f"VITE_API_URL={LOCAL_BROWSER_API_URL}\n", encoding="utf-8")
    npm = "npm.cmd" if sys.platform == "win32" else "npm"
    command = [npm, "run", "build", "--", "--mode", "studio", "--outDir", str(DASHBOARD_DIST), "--emptyOutDir"]
    result = subprocess.run(command, cwd=CLIENT_DIR, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if result.returncode != 0:
        raise SystemExit(f"No se pudo compilar el dashboard (¿npm install en client/eniu?):\n{result.stdout[-1500:]}{result.stderr[-1500:]}")
    return True


def _serve_dashboard(flask_app):
    """Rutas de la SPA: cualquier ruta que no sea /api devuelve el archivo
    compilado si existe y, si no, index.html (el router de React decide)."""
    from flask import abort, send_from_directory

    def spa(path=""):
        if path.startswith("api/"):
            abort(404)
        if path and (DASHBOARD_DIST / path).is_file():
            return send_from_directory(DASHBOARD_DIST, path)
        return send_from_directory(DASHBOARD_DIST, "index.html")

    flask_app.add_url_rule("/", "studio_spa_root", spa)
    flask_app.add_url_rule("/<path:path>", "studio_spa", spa)


def serve():
    flask_app = app()
    if (DASHBOARD_DIST / "index.html").exists():
        _serve_dashboard(flask_app)
        print(f"Eniu local: dashboard en {LOCAL_DASHBOARD_URL} · API en {LOCAL_BROWSER_API_URL}", flush=True)
    else:
        print(f"API local en {LOCAL_BROWSER_API_URL} (sin dashboard: corre `studio.py local build`)", flush=True)
    print(f"Base de datos: {LOCAL_DB_PATH}", flush=True)
    flask_app.run(host="127.0.0.1", port=LOCAL_API_PORT, debug=False, threaded=True, use_reloader=False)
