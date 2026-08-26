# Only true when the request URL itself embeds the content-addressed
# filename (e.g. /products/<id>/images/<uuid>.jpg): a changed file then
# always gets a new URL, so a far-future cache lifetime is safe.
#
# Endpoints keyed by a stable id instead (business_id, catalogue_id, a
# public menu slug, or a product's position in the menu) point at whatever
# file is *currently* attached to that id — the underlying filename can
# change on every re-upload while the URL stays the same, so those must use
# a short, revalidated lifetime instead or browsers/CDNs would keep serving
# the old image long after it was replaced.
IMMUTABLE_ASSET_MAX_AGE = 31536000  # 1 year
REVALIDATED_ASSET_MAX_AGE = 60


def asset_cache_control(*, private=False, immutable=False):
    visibility = "private" if private else "public"
    if immutable:
        return f"{visibility}, max-age={IMMUTABLE_ASSET_MAX_AGE}, immutable"
    return f"{visibility}, max-age={REVALIDATED_ASSET_MAX_AGE}"
