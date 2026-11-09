"""Rutas del repositorio, entornos de Eniu y arranque del backend.

Los entornos remotos no se escriben aquí a mano: salen de
`mobile/eniu-mobile/eas.json`, que ya es la fuente de verdad de a qué API
apunta cada build de la app.
"""

import json
import os
import site
import subprocess
import sys
from pathlib import Path

STUDIO_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = STUDIO_DIR.parent.parent
BACKEND_DIR = REPO_ROOT / "server" / "eniu-backend"
CLIENT_DIR = REPO_ROOT / "client" / "eniu"
EAS_JSON = REPO_ROOT / "mobile" / "eniu-mobile" / "eas.json"
# Estado local del estudio (base de datos, fotos subidas, sesiones). Ignorado por git.
STATE_DIR = STUDIO_DIR / ".studio"

LOCAL_API_PORT = 5055
LOCAL_API_URL = f"http://127.0.0.1:{LOCAL_API_PORT}/api"
# El servidor local sirve la API y el dashboard compilado en el mismo origen:
# el navegador habla con `localhost`, así no hay CORS de por medio.
LOCAL_DASHBOARD_URL = f"http://localhost:{LOCAL_API_PORT}"
LOCAL_BROWSER_API_URL = f"{LOCAL_DASHBOARD_URL}/api"
LOCAL_DB_PATH = STATE_DIR / "eniu-local.db"
LOCAL_DB_URL = f"sqlite:///{LOCAL_DB_PATH.as_posix()}"

ENVIRONMENTS = ("local", "staging", "prod")
EAS_PROFILE = {"staging": "staging", "prod": "production"}


def api_url(env_name):
    if env_name == "local":
        return LOCAL_API_URL
    eas = json.loads(EAS_JSON.read_text(encoding="utf-8"))
    return eas["build"][EAS_PROFILE[env_name]]["env"]["EXPO_PUBLIC_API_URL"].rstrip("/")


def public_web_url(env_name):
    """Dónde se abre un menú público (`/m/<slug>`) en cada entorno."""
    if env_name == "local":
        return LOCAL_DASHBOARD_URL
    return "https://app.eniu.app"


def remote_credentials():
    """Cuenta para staging/producción. Nunca se guarda en disco: la pone quien
    corre el comando, en variables de entorno. Se aceptan los mismos nombres
    que usa el workflow de capturas del App Store."""
    email = os.getenv("ENIU_EMAIL") or os.getenv("EXPO_SCREENSHOT_EMAIL")
    password = os.getenv("ENIU_PASSWORD") or os.getenv("EXPO_SCREENSHOT_PASSWORD")
    if not email or not password:
        raise SystemExit(
            "Faltan ENIU_EMAIL y ENIU_PASSWORD (o EXPO_SCREENSHOT_EMAIL / EXPO_SCREENSHOT_PASSWORD) "
            "con la cuenta demo de este entorno."
        )
    return email, password


# --- Dependencias del backend --------------------------------------------------

def _venv_candidates():
    yield BACKEND_DIR / "venv"
    # En un worktree de git el venv suele vivir en el checkout principal.
    try:
        common = subprocess.run(
            ["git", "-C", str(REPO_ROOT), "rev-parse", "--path-format=absolute", "--git-common-dir"],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
        yield Path(common).parent / "server" / "eniu-backend" / "venv"
    except (OSError, subprocess.CalledProcessError):
        return


def _site_packages(venv):
    windows = venv / "Lib" / "site-packages"
    if windows.is_dir():
        return windows
    found = sorted((venv / "lib").glob("python3*/site-packages"))
    return found[0] if found else None


def _venv_version(venv):
    cfg = venv / "pyvenv.cfg"
    if not cfg.exists():
        return None
    for line in cfg.read_text(encoding="utf-8").splitlines():
        key, _sep, value = line.partition("=")
        if key.strip() in {"version", "version_info"}:
            return tuple(int(part) for part in value.strip().split(".")[:2])
    return None


def ensure_backend_imports():
    """Hace importable el backend (`app`, `config`) con sus dependencias.

    Si el Python con el que se corre el estudio no las tiene, usa las del venv
    del backend siempre que sea la misma versión de Python (los paquetes
    compilados sólo sirven para la versión con la que se instalaron).
    """
    if str(BACKEND_DIR) not in sys.path:
        sys.path.insert(0, str(BACKEND_DIR))
    try:
        import flask_caching, flask_cors, flask_migrate, marshmallow  # noqa: F401
        return
    except ImportError:
        pass
    for venv in _venv_candidates():
        packages = _site_packages(venv)
        if packages and _venv_version(venv) == sys.version_info[:2]:
            site.addsitedir(str(packages))
            sys.path.remove(str(packages))
            sys.path.insert(1, str(packages))  # por delante de los paquetes globales
            import flask_caching, flask_cors, flask_migrate, marshmallow  # noqa: F401
            return
    raise SystemExit(
        "No encuentro las dependencias del backend. Corre el estudio con el Python del venv del "
        "backend (server/eniu-backend/venv) o instala server/eniu-backend/requirements.txt."
    )


def open_app(database_url, config=None):
    """App de Flask del backend apuntando a `database_url`.

    `config.py` lee DATABASE_URL al importarse, así que se fija antes de
    importar nada del backend: un `.env` olvidado nunca puede redirigir el
    estudio a otra base de datos.
    """
    ensure_backend_imports()
    os.environ["DATABASE_URL"] = database_url
    from app import create_app

    return create_app(test_config={"SQLALCHEMY_DATABASE_URI": database_url, **(config or {})})
