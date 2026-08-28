import re
import unittest
from datetime import datetime, timedelta, timezone
from uuid import UUID
from unittest.mock import patch

import jwt as pyjwt
from flask_jwt_extended import create_access_token
from sqlalchemy.exc import SQLAlchemyError

from app import create_app
from app.database.db import db
from app.extensions import bcrypt
from app.modules.auth.model import PasswordResetToken
from app.modules.business.model import Business
from app.modules.users.model import User
from tests.token_helpers import tamper_signature


class SettingsSecurityApiTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "SQLALCHEMY_TRACK_MODIFICATIONS": False,
            "JWT_SECRET_KEY": "settings-jwt-secret-at-least-32-bytes",
            "PASSWORD_RESET_SECRET_KEY": "reset-secret-separate-at-least-32-bytes",
            "PASSWORD_RESET_TOKEN_MINUTES": 15,
            "FRONTEND_URL": "http://frontend.test",
            "MAIL_SUPPRESS_SEND": True,
            "MAIL_FROM": "test@eniu.app",
        })

    def setUp(self):
        with self.app.app_context():
            db.drop_all()
            db.create_all()
            self.app.extensions["mail_outbox"] = []
            owner = User(
                email="owner@example.com",
                username="owner_user",
                phone_number="3311111111",
                password=bcrypt.generate_password_hash("CurrentPass1").decode("utf-8"),
            )
            outsider = User(
                email="outsider@example.com",
                username="outsider_user",
                phone_number="3322222222",
                password=bcrypt.generate_password_hash("OtherPass1").decode("utf-8"),
            )
            db.session.add_all([owner, outsider])
            db.session.flush()
            business = Business(name="Café ENIU", owner_id=owner.id)
            db.session.add(business)
            db.session.commit()
            self.owner_id = str(owner.id)
            self.outsider_id = str(outsider.id)
            self.business_id = str(business.id)
            self.owner_token = create_access_token(identity=self.owner_id)
            self.outsider_token = create_access_token(identity=self.outsider_id)
        self.client = self.app.test_client()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    @staticmethod
    def headers(token):
        return {"Authorization": f"Bearer {token}"}

    def request_reset(self, email="owner@example.com"):
        with self.app.app_context():
            previous_count = len(self.app.extensions["mail_outbox"])
        response = self.client.post("/api/auth/forgot-password", json={"email": email})
        with self.app.app_context():
            outbox = self.app.extensions["mail_outbox"]
            token = None
            if len(outbox) > previous_count:
                match = re.search(r"token=([^\s]+)", outbox[-1].get_content())
                token = match.group(1) if match else None
        return response, token

    def test_profile_requires_jwt_rejects_unknown_and_updates_only_current_user(self):
        self.assertEqual(self.client.patch("/api/users/me", json={"name": "Ana"}).status_code, 401)
        response = self.client.patch(
            "/api/users/me",
            headers=self.headers(self.owner_token),
            json={"name": "  Ana   María ", "username": "ana.maria", "phone_number": "3399999999"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["user"]["name"], "Ana María")
        self.assertNotIn("password", response.get_json()["user"])

        response = self.client.patch(
            "/api/users/me",
            headers=self.headers(self.owner_token),
            json={"id": self.outsider_id, "email": "changed@example.com"},
        )
        self.assertEqual(response.status_code, 400)
        with self.app.app_context():
            self.assertEqual(db.session.get(User, UUID(self.outsider_id)).email, "outsider@example.com")

    def test_duplicate_username_returns_conflict(self):
        response = self.client.patch(
            "/api/users/me",
            headers=self.headers(self.owner_token),
            json={"username": "OUTSIDER_USER"},
        )
        self.assertEqual(response.status_code, 409)

    def test_business_update_is_allowlisted_and_owner_scoped(self):
        payload = {
            "name": "Café actualizado",
            "description": "Menú de temporada",
            "phone": "3312345678",
            "whatsapp": "3398765432",
            "address": "Centro",
            "currency": "mxn",
            "timezone": "America/Mexico_City",
        }
        response = self.client.patch(
            f"/api/businesses/{self.business_id}",
            headers=self.headers(self.owner_token),
            json=payload,
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["business"]["phone"], "3312345678")
        self.assertEqual(response.get_json()["business"]["currency"], "MXN")

        response = self.client.patch(
            f"/api/businesses/{self.business_id}",
            headers=self.headers(self.outsider_token),
            json={"name": "Robado"},
        )
        self.assertEqual(response.status_code, 404)
        response = self.client.patch(
            f"/api/businesses/{self.business_id}",
            headers=self.headers(self.owner_token),
            json={"owner_id": self.outsider_id},
        )
        self.assertEqual(response.status_code, 400)

    def test_change_password_validates_current_and_invalidates_old_tokens(self):
        wrong = self.client.patch(
            "/api/auth/password",
            headers=self.headers(self.owner_token),
            json={"current_password": "WrongPass1", "new_password": "NewPassword1"},
        )
        self.assertEqual(wrong.status_code, 400)

        response = self.client.patch(
            "/api/auth/password",
            headers=self.headers(self.owner_token),
            json={"current_password": "CurrentPass1", "new_password": "NewPassword1"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("access_token", data)
        self.assertIn("refresh_token", data)
        self.assertEqual(
            self.client.get("/api/auth/me", headers=self.headers(self.owner_token)).status_code,
            401,
        )
        self.assertEqual(
            self.client.get("/api/auth/me", headers=self.headers(data["access_token"])).status_code,
            200,
        )
        with self.app.app_context():
            user = db.session.get(User, UUID(self.owner_id))
            self.assertTrue(bcrypt.check_password_hash(user.password, "NewPassword1"))
            self.assertNotEqual(user.password, "NewPassword1")

    def test_close_other_sessions_keeps_only_the_new_tokens(self):
        response = self.client.post(
            "/api/auth/sessions/revoke",
            headers=self.headers(self.owner_token),
            json={},
        )
        self.assertEqual(response.status_code, 200)
        new_token = response.get_json()["access_token"]
        self.assertEqual(self.client.get(
            "/api/auth/me", headers=self.headers(self.owner_token)
        ).status_code, 401)
        self.assertEqual(self.client.get(
            "/api/auth/me", headers=self.headers(new_token)
        ).status_code, 200)

    def test_forgot_response_is_generic_and_does_not_expose_token(self):
        existing, token = self.request_reset("  OWNER@EXAMPLE.COM ")
        missing, missing_token = self.request_reset("missing@example.com")
        self.assertEqual(existing.status_code, 200)
        self.assertEqual(existing.get_json(), missing.get_json())
        self.assertNotIn("token", existing.get_json())
        self.assertIsNotNone(token)
        self.assertIsNone(missing_token)
        with self.app.app_context():
            record = PasswordResetToken.query.one()
            self.assertEqual(len(record.jti_hash), 64)
            self.assertNotEqual(record.jti_hash, token)
            self.assertFalse(hasattr(record, "ip"))

    def test_reset_is_single_use_and_invalidates_existing_sessions(self):
        _, token = self.request_reset()
        response = self.client.post(
            "/api/auth/reset-password",
            json={"token": token, "new_password": "RecoveredPass1"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("access_token", response.get_json())
        self.assertEqual(
            self.client.get("/api/auth/me", headers=self.headers(self.owner_token)).status_code,
            401,
        )
        repeated = self.client.post(
            "/api/auth/reset-password",
            json={"token": token, "new_password": "AnotherPass1"},
        )
        self.assertEqual(repeated.status_code, 400)

    def test_new_reset_request_invalidates_previous_one(self):
        _, first = self.request_reset()
        with self.app.app_context():
            record = PasswordResetToken.query.one()
            record.created_at = datetime.now(timezone.utc) - timedelta(minutes=2)
            db.session.commit()
        _, second = self.request_reset()
        self.assertNotEqual(first, second)
        self.assertEqual(self.client.post(
            "/api/auth/reset-password",
            json={"token": first, "new_password": "RecoveredPass1"},
        ).status_code, 400)
        self.assertEqual(self.client.post(
            "/api/auth/reset-password",
            json={"token": second, "new_password": "RecoveredPass1"},
        ).status_code, 200)

    def test_invalid_expired_audience_and_purpose_tokens_are_rejected(self):
        now = datetime.now(timezone.utc)
        base = {
            "sub": self.owner_id,
            "jti": "not-persisted",
            "iat": now - timedelta(minutes=20),
            "exp": now - timedelta(minutes=1),
            "aud": "eniu-password-reset",
            "purpose": "password_reset",
        }
        secret = self.app.config["PASSWORD_RESET_SECRET_KEY"]
        expired = pyjwt.encode(base, secret, algorithm="HS256")
        self.assertIn("venció", self.client.post(
            "/api/auth/reset-password", json={"token": expired, "new_password": "RecoveredPass1"}
        ).get_json()["message"])

        for changes in ({"aud": "wrong"}, {"purpose": "access"}):
            claims = {**base, "iat": now, "exp": now + timedelta(minutes=10), **changes}
            token = pyjwt.encode(claims, secret, algorithm="HS256")
            response = self.client.post(
                "/api/auth/reset-password", json={"token": token, "new_password": "RecoveredPass1"}
            )
            self.assertEqual(response.status_code, 400)

        # Alterar el token vencido no probaba nada: el 400 llegaba por el
        # vencimiento, con firma tocada o sin ella. Se altera uno que sí
        # funcionaría, y después se comprueba que intacto funciona, para que el
        # rechazo sólo pueda venir de la firma.
        _, valid = self.request_reset()
        self.assertEqual(self.client.post(
            "/api/auth/reset-password", json={"token": tamper_signature(valid), "new_password": "RecoveredPass1"}
        ).status_code, 400)
        self.assertEqual(self.client.post(
            "/api/auth/reset-password", json={"token": valid, "new_password": "RecoveredPass1"}
        ).status_code, 200)

    def test_reset_and_access_tokens_are_not_interchangeable(self):
        _, reset_token = self.request_reset()
        self.assertEqual(
            self.client.get("/api/auth/me", headers=self.headers(reset_token)).status_code,
            401,
        )
        self.assertEqual(self.client.post(
            "/api/auth/reset-password",
            json={"token": self.owner_token, "new_password": "RecoveredPass1"},
        ).status_code, 400)

    def test_google_only_account_can_set_password_through_verified_email(self):
        with self.app.app_context():
            google_user = User(email="google@example.com", google_id="google-123", password=None)
            db.session.add(google_user)
            db.session.commit()
        _, token = self.request_reset("google@example.com")
        self.assertIsNotNone(token)
        self.assertEqual(self.client.post(
            "/api/auth/reset-password",
            json={"token": token, "new_password": "GoogleLocalPass1"},
        ).status_code, 200)
        self.assertEqual(self.client.post(
            "/api/auth/login",
            json={"identifier": "google@example.com", "password": "GoogleLocalPass1"},
        ).status_code, 200)

    def test_reset_rolls_back_password_and_token_when_commit_fails(self):
        _, token = self.request_reset()
        with self.app.app_context():
            real_commit = db.session.commit
            with patch.object(db.session, "commit", side_effect=SQLAlchemyError("private detail")):
                response = self.client.post(
                    "/api/auth/reset-password",
                    json={"token": token, "new_password": "ShouldNotPersist1"},
                )
            self.assertEqual(response.status_code, 500)
            db.session.expire_all()
            user = db.session.get(User, UUID(self.owner_id))
            record = PasswordResetToken.query.one()
            self.assertTrue(bcrypt.check_password_hash(user.password, "CurrentPass1"))
            self.assertIsNone(record.used_at)
            real_commit()


if __name__ == "__main__":
    unittest.main()
