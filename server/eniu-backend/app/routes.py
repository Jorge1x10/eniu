from app.modules.auth.routes import auth_bp
from app.modules.business.routes import business_bp
from app.modules.catalogue.routes import catalogue_bp
from app.modules.category.routes import category_bp
from app.modules.products.routes import product_bp
from app.modules.template.routes import template_bp
from app.modules.publication.routes import publication_bp
from app.modules.analytics.routes import analytics_bp
from app.modules.users.routes import users_bp
from app.modules.system.routes import system_bp
from app.modules.billing.routes import billing_bp
from app.modules.promotion.routes import promotion_bp

def register_routes(app):
    app.register_blueprint(auth_bp)
    app.register_blueprint(business_bp)
    app.register_blueprint(catalogue_bp)
    app.register_blueprint(category_bp)
    app.register_blueprint(product_bp)
    app.register_blueprint(template_bp)
    app.register_blueprint(publication_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(system_bp)
    app.register_blueprint(billing_bp)
    app.register_blueprint(promotion_bp)
