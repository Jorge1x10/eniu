"""La segmentación del export de campaña.

Se prueba porque un error aquí no se ve: manda el correo equivocado a la
persona equivocada y no hay forma de deshacerlo. En particular, escribirle
"contrata Esencial" a alguien que ya paga.
"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import create_app
from app.database.db import db
from app.modules.billing.model import BillingSubscription
from app.modules.business.model import Business
from app.modules.catalogue.model import Catalogue
from app.modules.users.model import User

from scripts.export_campaign_audience import PUBLICADO, SIN_PUBLICAR, audiencia, filas


class CampaignAudienceTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "SQLALCHEMY_TRACK_MODIFICATIONS": False,
            "JWT_SECRET_KEY": "campaign-jwt-secret-at-least-32-bytes",
        })

    def setUp(self):
        with self.app.app_context():
            db.drop_all()
            db.create_all()

            def cuenta(email, *, publicado=False, plan_status=None, name=None, language="es"):
                user = User(email=email, name=name, language=language)
                db.session.add(user)
                db.session.flush()
                business = Business(name=f"Negocio de {email}", owner_id=user.id)
                db.session.add(business)
                db.session.flush()
                db.session.add(Catalogue(
                    name="Menú de la casa",
                    business_id=business.id,
                    is_published=publicado,
                ))
                if plan_status:
                    db.session.add(BillingSubscription(
                        user_id=user.id,
                        plan_key="essential",
                        status=plan_status,
                    ))
                return user

            cuenta("publico@example.com", publicado=True, name="Ana López")
            cuenta("nopublico@example.com", publicado=False)
            cuenta("paga@example.com", publicado=True, plan_status="active")
            cuenta("prueba@example.com", publicado=True, plan_status="trialing")
            cuenta("cancelado@example.com", publicado=True, plan_status="canceled")
            db.session.commit()

    def emails(self, segmento):
        with self.app.app_context():
            return {usuario.email for usuario in audiencia(segmento)}

    def test_publicado_incluye_solo_a_quien_publico_y_no_paga(self):
        self.assertEqual(
            self.emails(PUBLICADO),
            {"publico@example.com", "cancelado@example.com"},
        )

    def test_sin_publicar_es_el_complemento(self):
        self.assertEqual(self.emails(SIN_PUBLICAR), {"nopublico@example.com"})

    def test_nunca_se_escribe_a_quien_tiene_acceso_de_pago(self):
        # `active` y `trialing` son los dos estados con acceso: el cupón se
        # canjea en la pantalla de pago, por la que un suscriptor no pasa.
        todos = self.emails(PUBLICADO) | self.emails(SIN_PUBLICAR)
        self.assertNotIn("paga@example.com", todos)
        self.assertNotIn("prueba@example.com", todos)

    def test_quien_canceló_vuelve_a_ser_audiencia(self):
        # Es justo a quien más sentido tiene ofrecerle un mes gratis.
        self.assertIn("cancelado@example.com", self.emails(PUBLICADO))

    def test_ninguna_cuenta_aparece_en_los_dos_segmentos(self):
        self.assertEqual(self.emails(PUBLICADO) & self.emails(SIN_PUBLICAR), set())

    def test_la_fila_lleva_solo_el_nombre_de_pila_y_vacío_si_no_hay(self):
        with self.app.app_context():
            porNombre = {fila["email"]: fila for fila in filas(audiencia(PUBLICADO), PUBLICADO)}
        self.assertEqual(porNombre["publico@example.com"]["nombre"], "Ana")
        self.assertEqual(porNombre["cancelado@example.com"]["nombre"], "")
        self.assertEqual(porNombre["publico@example.com"]["idioma"], "es")


if __name__ == "__main__":
    unittest.main()
