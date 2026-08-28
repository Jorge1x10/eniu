import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY")
    
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")

    SQLALCHEMY_TRACK_MODIFICATIONS = False

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
    # Prefer a restricted Stripe key (rk_) scoped to the resources used here.
    STRIPE_API_KEY = os.getenv("STRIPE_API_KEY")
    STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
    STRIPE_API_VERSION = os.getenv("STRIPE_API_VERSION", "2026-06-24.dahlia")
    STRIPE_ESSENTIAL_LOOKUP_KEY = os.getenv(
        "STRIPE_ESSENTIAL_LOOKUP_KEY",
        "eniu_essential_monthly",
    )
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

    MAX_CONTENT_LENGTH = 26 * 1024 * 1024
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
