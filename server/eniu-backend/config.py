import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY")
    
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Sin esto SQLAlchemy usa su default de 5 conexiones + 10 de overflow
    # *por proceso*: con varios workers de gunicorn son decenas de conexiones
    # contra una Postgres pequeña, que tiene un tope bajo. El pool se
    # dimensiona a los threads de cada worker (ver gunicorn.conf.py), no al
    # servicio entero.
    #
    # `pool_pre_ping` es lo que evita el error intermitente clásico de un
    # Postgres administrado: la base cierra conexiones ociosas y el pool no
    # se entera hasta que una petición real falla con "server closed the
    # connection unexpectedly". Con el ping, la conexión muerta se descarta y
    # se reemplaza antes de usarla. `pool_recycle` la rota antes de que la
    # base decida cerrarla.
    #
    # Los argumentos de pool sólo aplican a Postgres: el pool que SQLAlchemy
    # usa para SQLite (el de las pruebas) no los acepta.
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": int(os.getenv("DB_POOL_RECYCLE", "280")),
    }
    if (SQLALCHEMY_DATABASE_URI or "").startswith(("postgres://", "postgresql://", "postgresql+")):
        SQLALCHEMY_ENGINE_OPTIONS.update({
            "pool_size": int(os.getenv("DB_POOL_SIZE", "2")),
            "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "3")),
        })

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    FRONTEND_URL = os.getenv("FRONTEND_URL", os.getenv("FRONT", "http://localhost:5173")).rstrip("/")
    CORS_ORIGINS = [
        origin.strip().rstrip("/")
        for origin in os.getenv(
            "CORS_ORIGINS",
            ",".join([
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:8081",
                "http://127.0.0.1:8081",
                "http://192.168.1.165:8081",
            ]),
        ).split(",")
        if origin.strip()
    ]
    PASSWORD_RESET_SECRET_KEY = os.getenv("PASSWORD_RESET_SECRET_KEY")
    PASSWORD_RESET_TOKEN_MINUTES = int(os.getenv("PASSWORD_RESET_TOKEN_MINUTES", "15"))
    MAIL_HOST = os.getenv("MAIL_HOST")
    MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))
    MAIL_USERNAME = os.getenv("MAIL_USERNAME")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
    MAIL_FROM = os.getenv("MAIL_FROM", "no-reply@eniu.app")
    MAIL_USE_TLS = os.getenv("MAIL_USE_TLS", "true").lower() in {"1", "true", "yes", "on"}
    MAIL_SUPPRESS_SEND = False
    # Keep this value stable: changing it invalidates opaque analytics keys.
    ANALYTICS_TOKEN_SECRET = os.getenv("ANALYTICS_TOKEN_SECRET") or SECRET_KEY

    # Set REDIS_URL (e.g. redis://...) once the API runs on more than one
    # instance: it upgrades both the rate limiter and the response cache
    # below from single-process, in-memory storage to a shared backend.
    # Without it everything still works for a single-instance deployment.
    REDIS_URL = os.getenv("REDIS_URL")
    RATELIMIT_STORAGE_URI = os.getenv("RATELIMIT_STORAGE_URI") or REDIS_URL or "memory://"
    RATELIMIT_HEADERS_ENABLED = True

    # Short-lived server-side cache for the public menu endpoint, which is
    # what QR scans hit. Cuts repeat DB work during traffic spikes at the
    # cost of edits taking up to this many seconds to show publicly.
    CACHE_TYPE = "RedisCache" if REDIS_URL else "SimpleCache"
    CACHE_REDIS_URL = REDIS_URL
    PUBLIC_MENU_CACHE_SECONDS = int(os.getenv("PUBLIC_MENU_CACHE_SECONDS", "20"))

    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
    # Audiencias válidas del identity token de Apple: el bundle id en apps
    # nativas y el Services ID si algún día se agrega el flujo web. Lista
    # separada por comas.
    APPLE_CLIENT_IDS = [
        value.strip()
        for value in os.getenv("APPLE_CLIENT_IDS", "com.eniu.app").split(",")
        if value.strip()
    ]
    # Credenciales de la clave privada de Sign in with Apple (Keys, en el portal
    # de desarrollador). Apple obliga a revocar la sesión cuando el usuario
    # borra su cuenta, y su API de revocación exige firmar un client secret con
    # esta clave. Sin las tres, el borrado sigue funcionando pero no revoca.
    APPLE_TEAM_ID = os.getenv("APPLE_TEAM_ID")
    APPLE_KEY_ID = os.getenv("APPLE_KEY_ID")
    # El .p8 viaja en una variable de entorno, donde los saltos de línea suelen
    # llegar escapados; sin deshacerlos la clave no se puede leer.
    APPLE_PRIVATE_KEY = (os.getenv("APPLE_PRIVATE_KEY") or "").replace("\\n", "\n")
    # Prefer a restricted Stripe key (rk_) scoped to the resources used here.
    STRIPE_API_KEY = os.getenv("STRIPE_API_KEY")
    STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
    STRIPE_API_VERSION = os.getenv("STRIPE_API_VERSION", "2026-06-24.dahlia")
    STRIPE_ESSENTIAL_LOOKUP_KEY = os.getenv(
        "STRIPE_ESSENTIAL_LOOKUP_KEY",
        "eniu_essential_monthly",
    )
    # Base de los menús publicados: de aquí sale el `/m/<slug>` que la app mete
    # dentro del código QR. Dos condiciones que no son obvias y que ya rompieron
    # los menús una vez:
    #   - Tiene que apuntar a donde se sirve la ruta `/m/<slug>`, que es el
    #     despliegue del panel (hoy menu.eniu.app), no al sitio público.
    #   - Ese mismo origen tiene que estar en CORS_ORIGINS: el menú se dibuja en
    #     el navegador del comensal y pide sus datos a esta API.
    # Cambiarla invalida los códigos QR ya impresos, así que se decide una vez.
    PUBLIC_WEB_BASE_URL = os.getenv(
        "PUBLIC_WEB_BASE_URL",
        os.getenv("FRONT", "http://localhost:5173"),
    ).rstrip("/")

    # Local disk is fine for a single instance but doesn't survive a
    # redeploy and can't be shared across instances. Set STORAGE_BACKEND=s3
    # to store uploads in an S3-compatible bucket instead (AWS S3,
    # Cloudflare R2, Backblaze B2, DigitalOcean Spaces, ...).
    STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "local")
    S3_BUCKET = os.getenv("S3_BUCKET")
    S3_PREFIX = os.getenv("S3_PREFIX", "")
    S3_REGION = os.getenv("S3_REGION", "auto")
    S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL")
    S3_ACCESS_KEY_ID = os.getenv("S3_ACCESS_KEY_ID")
    S3_SECRET_ACCESS_KEY = os.getenv("S3_SECRET_ACCESS_KEY")
    # Whatever serves that bucket's objects publicly, e.g. a custom domain
    # on a public R2 bucket or a CloudFront distribution in front of S3.
    S3_PUBLIC_BASE_URL = os.getenv("S3_PUBLIC_BASE_URL")

    # Flask bufferea el cuerpo de la petición en memoria, así que este número
    # es también el pico de RAM que una sola subida puede reservar. En una
    # instancia de 512 MB, unas pocas subidas simultáneas al tope se comen el
    # margen entero. Se deja el valor histórico como default y se expone por
    # entorno para poder bajarlo sin desplegar código.
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_UPLOAD_MB", "26")) * 1024 * 1024
    BUSINESS_UPLOAD_FOLDER = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "uploads",
        "businesses"
    )
    PRODUCT_UPLOAD_FOLDER = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "uploads",
        "products"
    )
    CATALOGUE_COVER_FOLDER = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "uploads",
        "catalogue-covers"
    )
    CATALOGUE_BACKGROUND_FOLDER = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "uploads",
        "catalogue-backgrounds"
    )
    CATALOGUE_SPLASH_FOLDER = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "uploads",
        "catalogue-splashes"
    )
