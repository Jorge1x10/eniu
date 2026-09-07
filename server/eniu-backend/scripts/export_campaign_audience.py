#!/usr/bin/env python3
"""Exporta a CSV la lista de cuentas a las que escribir una campaña.

El envío no lo hace esto: lo hace la herramienta de correo (Brevo, MailerLite,
Resend...), que además se encarga de la baja, de los rebotes y de la
reputación de envío. Lo único que la herramienta no puede saber es a quién hay
que escribirle, y eso es lo que resuelve este script.

Separa en dos segmentos, porque no es el mismo correo:

  publicado    ya tiene al menos un menú publicado. Conoce el producto y sólo
               le falta decidir: a este va el código de descuento.
  sin-publicar creó la cuenta y no llegó a publicar. Un descuento no le
               resuelve nada; lo que le falta es publicar el menú.

Y excluye siempre a quien hoy tiene acceso de pago. Por dos razones: el código
se canjea en la pantalla de pago y un suscriptor activo no vuelve a pasar por
ahí, y a quien compró en el App Store o en Google Play un cupón de Stripe no
le sirve en absoluto.

Uso:
    cd server/eniu-backend
    DATABASE_URL=postgresql://... python scripts/export_campaign_audience.py \
        --segmento publicado --salida publicado.csv
"""
import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import create_app  # noqa: E402
from app.database.db import db  # noqa: E402
from app.modules.billing.model import ACCESS_STATUSES, BillingSubscription  # noqa: E402
from app.modules.business.model import Business  # noqa: E402
from app.modules.catalogue.model import Catalogue  # noqa: E402
from app.modules.users.model import User  # noqa: E402

PUBLICADO = "publicado"
SIN_PUBLICAR = "sin-publicar"
SEGMENTOS = (PUBLICADO, SIN_PUBLICAR)


def _con_acceso_de_pago():
    """Quien hoy paga, venga de Stripe o de una tienda."""
    return db.session.query(BillingSubscription.user_id).filter(
        BillingSubscription.status.in_(ACCESS_STATUSES)
    )


def _con_menu_publicado():
    return (
        db.session.query(Business.owner_id)
        .join(Catalogue, Catalogue.business_id == Business.id)
        .filter(Catalogue.is_published.is_(True))
        .distinct()
    )


def audiencia(segmento):
    if segmento not in SEGMENTOS:
        raise ValueError(f"Segmento desconocido: {segmento}")

    query = User.query.filter(
        User.email.isnot(None),
        User.id.notin_(_con_acceso_de_pago()),
    )

    publicados = _con_menu_publicado()
    if segmento == PUBLICADO:
        query = query.filter(User.id.in_(publicados))
    else:
        query = query.filter(User.id.notin_(publicados))

    return query.order_by(User.created_at).all()


def filas(usuarios, segmento):
    for usuario in usuarios:
        # El nombre de pila es lo que se usa para saludar. Si no hay nombre, la
        # herramienta de correo debe caer a un saludo sin él: por eso va vacío
        # y no con un "Hola amigo" de relleno.
        nombre = (usuario.name or "").strip()
        negocio = usuario.business[0].name if usuario.business else ""
        yield {
            "email": usuario.email,
            "nombre": nombre.split()[0] if nombre else "",
            "negocio": negocio,
            "idioma": usuario.language or "es",
            "segmento": segmento,
            "alta": usuario.created_at.date().isoformat() if usuario.created_at else "",
        }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--segmento", choices=SEGMENTOS, required=True)
    parser.add_argument("--salida", help="Archivo CSV. Sin él, imprime a pantalla.")
    parser.add_argument(
        "--contar",
        action="store_true",
        help="Sólo dice cuántos son, sin sacar ningún correo.",
    )
    args = parser.parse_args()

    app = create_app()
    with app.app_context():
        usuarios = audiencia(args.segmento)

        if args.contar:
            print(f"{args.segmento}: {len(usuarios)} cuentas")
            return

        columnas = ["email", "nombre", "negocio", "idioma", "segmento", "alta"]
        destino = open(args.salida, "w", newline="", encoding="utf-8") if args.salida else sys.stdout
        try:
            writer = csv.DictWriter(destino, fieldnames=columnas)
            writer.writeheader()
            writer.writerows(filas(usuarios, args.segmento))
        finally:
            if args.salida:
                destino.close()
                print(f"{len(usuarios)} cuentas en {args.salida}", file=sys.stderr)


if __name__ == "__main__":
    main()
