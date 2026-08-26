# Uploaded images are stored under a fresh UUID filename on every save
# (see business/products/template services), so a given URL never changes
# its bytes. That makes them safe to cache for a long time: browsers and,
# once a CDN sits in front of the API, edge caches can serve them without
# ever coming back to the origin.
IMMUTABLE_ASSET_MAX_AGE = 31536000  # 1 year


def cache_immutable_asset(response, *, private=False):
    visibility = "private" if private else "public"
    response.headers["Cache-Control"] = f"{visibility}, max-age={IMMUTABLE_ASSET_MAX_AGE}, immutable"
    return response
