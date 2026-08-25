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

    # In-memory limiter is fine for a single-instance beta; point this at a
    # shared Redis URL (e.g. redis://...) once the API runs on more than one
    # instance, otherwise each instance tracks its own counters.
    RATELIMIT_STORAGE_URI = os.getenv("RATELIMIT_STORAGE_URI", "memory://")
    RATELIMIT_HEADERS_ENABLED = True

    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
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
