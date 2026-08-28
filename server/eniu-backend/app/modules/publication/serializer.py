from app.modules.billing import plans
from app.modules.billing.guards import plan_key_for_owner_id
from app.modules.template.services import default_configuration
from app.modules.analytics.security import tracking_key


def _main_picture(product):
    pictures = product.picture_metadata()
    return next((picture for picture in pictures if picture.get("is_default")), pictures[0] if pictures else None)


def _product_data(catalogue, product, image_url):
    return {
        "tracking_key": tracking_key(catalogue.id, "product", product.id),
        "name": product.name,
        "description": product.description,
        "price": format(product.price, ".2f") if product.price is not None else None,
        "image_url": image_url if _main_picture(product) else None,
        "is_available": product.is_available,
    }


def serialize_public_menu(catalogue):
    configuration = (
        catalogue.template_config.to_dict()
        if catalogue.template_config else default_configuration()
    )
    slug = catalogue.public_slug
    categories = sorted(
        (category for category in catalogue.categories if category.is_visible),
        key=lambda category: (category.display_order, category.created_at),
    )
    products = sorted(
        catalogue.products,
        key=lambda product: (product.display_order, product.created_at),
    )
    category_payload = []
    for section_index, category in enumerate(categories):
        category_products = [product for product in products if product.category_id == category.id]
        category_payload.append({
            "tracking_key": tracking_key(catalogue.id, "category", category.id),
            "name": category.name,
            "description": category.description,
            "products": [
                _product_data(
                    catalogue,
                    product,
                    f"/api/public/menus/{slug}/product-images/{section_index}/{product_index}"
                    if slug and catalogue.is_published else None,
                )
                for product_index, product in enumerate(category_products)
            ],
        })
    uncategorized = [product for product in products if product.category_id is None]
    uncategorized_payload = [
        _product_data(
            catalogue,
            product,
            f"/api/public/menus/{slug}/product-images/{len(categories)}/{product_index}"
            if slug and catalogue.is_published else None,
        )
        for product_index, product in enumerate(uncategorized)
    ]
    theme = dict(configuration["theme"])
    theme["cover_image_url"] = (
        f"/api/public/menus/{slug}/cover"
        if slug and catalogue.is_published and catalogue.template_config and catalogue.template_config.cover_filename
        else None
    )
    theme["background_image_url"] = (
        f"/api/public/menus/{slug}/background"
        if slug and catalogue.is_published and catalogue.template_config and catalogue.template_config.background_filename
        else None
    )
    plan_key = plan_key_for_owner_id(catalogue.business.owner_id)
    template_key, theme = plans.sanitize_public_theme(
        plan_key, configuration["template_key"], theme
    )
    return {
        "business": {
            "name": catalogue.business.name,
            "description": catalogue.business.description,
        },
        "catalogue": {
            "name": catalogue.name,
            "description": catalogue.description,
        },
        "template": {
            "key": template_key,
            "theme": theme,
        },
        "branding": {
            "show_eniu_badge": plans.limits_for(plan_key)["show_eniu_badge"],
        },
        "categories": category_payload,
        "uncategorized_products": uncategorized_payload,
    }
