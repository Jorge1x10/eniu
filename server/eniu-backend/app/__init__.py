import os
from flask import Flask, request
from flask_cors import CORS
from flask_migrate import Migrate
from app import storage
from app.database.db import db
from app.extensions import bcrypt, cache, jwt, limiter
from config import Config


from .routes import register_routes

migrate = Migrate()

def create_app(test_config=None):
    
    app = Flask(__name__)
    app.config.from_object(Config)
    if test_config:
        app.config.update(test_config)
    if app.config.get("TESTING"):
        # Never let a cached response from one test leak into another.
        app.config["CACHE_TYPE"] = "NullCache"

    # `Config` decide los argumentos de pool cuando se define la clase, mirando
    # el DATABASE_URL del entorno. Las pruebas cambian la URI a SQLite después,
    # y se quedaban con argumentos que el pool de SQLite no acepta: quien
    # tuviera un DATABASE_URL de Postgres en su `.env` no podía correr las
    # pruebas. Se resuelve contra la URI que de verdad va a usarse.
    if not (app.config.get("SQLALCHEMY_DATABASE_URI") or "").startswith(
        ("postgres://", "postgresql://", "postgresql+")
    ):
        options = dict(app.config.get("SQLALCHEMY_ENGINE_OPTIONS") or {})
        for pool_only in ("pool_size", "max_overflow"):
            options.pop(pool_only, None)
        app.config["SQLALCHEMY_ENGINE_OPTIONS"] = options
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": app.config["CORS_ORIGINS"]
            }
        },
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    )
    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    app.config.setdefault("RATELIMIT_ENABLED", not app.config.get("TESTING", False))
    limiter.init_app(app)
    cache.init_app(app)
    storage.configure(app)

    migrate.init_app(app,db)

    from app.modules.users.model import User
    from app.modules.business.model import Business
    from app.modules.catalogue.model import Catalogue
    from app.modules.category.model import Category
    from app.modules.products.model import Product 
    from app.modules.template.model import CatalogueTemplate
    from app.modules.analytics.model import AnalyticsEvent
    from app.modules.auth.model import PasswordResetToken
    from app.modules.billing.model import BillingSubscription, StripeWebhookEvent
    from app.modules.auth.jwt_security import configure_jwt_security

    configure_jwt_security()

    register_routes(app)

    @app.after_request
    def security_headers(response):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        if request.path.startswith("/api/auth/"):
            response.headers.setdefault("Cache-Control", "no-store")
        return response
    
    
    return app
