"""Smoke tests for the Level-1 security work (PBKDF2 + JWT + ownership guards).

Self-contained: each test gets a fresh temp DB so order/sharing won't matter.
Rate limiting is the one shared-state concern; we keep the number of POST
calls per endpoint small to stay under the 3-5 / 60s limits.
"""

from __future__ import annotations

import importlib
import os
import sys
import tempfile
import unittest
from pathlib import Path

# Force a stable JWT secret for the entire test run BEFORE we import main,
# so create_jwt/verify_jwt round-trip on the same secret.
os.environ.setdefault("JWT_SECRET", "smoke-test-secret-" + "x" * 40)

# Make sure we re-import main against the env vars set above.
if "main" in sys.modules:
    del sys.modules["main"]
import main  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from quiz_bank.database import ensure_database  # noqa: E402


class _TempDb:
    def __enter__(self):
        self._tmp = tempfile.TemporaryDirectory()
        self._original = main.DB_PATH
        path = Path(self._tmp.name) / "smoke.db"
        ensure_database(path)
        main.DB_PATH = str(path)
        return TestClient(main.app)

    def __exit__(self, *exc):
        main.DB_PATH = self._original
        self._tmp.cleanup()


class SecuritySmokeTests(unittest.TestCase):
    def setUp(self) -> None:
        # Smoke tests share the in-memory rate-limit and ENT-session stores;
        # wipe both between tests to keep results deterministic.
        main._rate_limit_buckets.clear()
        main._ent_sessions.clear()

    def _register(self, client: TestClient, *, email: str, username: str = "Smoke") -> dict:
        response = client.post(
            "/api/auth/register",
            json={"username": username, "email": email, "password": "pw1234"},
        )
        self.assertEqual(200, response.status_code, response.text)
        body = response.json()
        self.assertTrue(isinstance(body.get("token"), str) and len(body["token"]) > 30)
        return body

    def test_register_and_login_issue_tokens(self) -> None:
        with _TempDb() as client:
            user = self._register(client, email="reg@gmail.com")
            response = client.post(
                "/api/auth/login",
                json={"email": "reg@gmail.com", "password": "pw1234"},
            )
            self.assertEqual(200, response.status_code)
            self.assertTrue(response.json().get("token"))
            self.assertEqual(user["id"], response.json()["id"])

    def test_login_rejects_wrong_password(self) -> None:
        with _TempDb() as client:
            self._register(client, email="rej@gmail.com")
            response = client.post(
                "/api/auth/login",
                json={"email": "rej@gmail.com", "password": "WRONG"},
            )
            self.assertEqual(401, response.status_code)

    def test_avatar_requires_matching_token(self) -> None:
        with _TempDb() as client:
            user = self._register(client, email="avt@gmail.com")
            uid, token = user["id"], user["token"]
            payload = {"user_id": uid, "avatar_url": "https://x.test/a.png"}

            # No header => 401
            response = client.post("/api/auth/avatar", json=payload)
            self.assertEqual(401, response.status_code)

            # Garbage token => 401
            response = client.post(
                "/api/auth/avatar",
                json=payload,
                headers={"Authorization": "Bearer not.a.real.token"},
            )
            self.assertEqual(401, response.status_code)

            # Non-Bearer scheme => 401
            response = client.post(
                "/api/auth/avatar",
                json=payload,
                headers={"Authorization": "Token " + token},
            )
            self.assertEqual(401, response.status_code)

            # Good token but mismatched user_id => 403
            response = client.post(
                "/api/auth/avatar",
                json={"user_id": "player-evil", "avatar_url": "x"},
                headers={"Authorization": f"Bearer {token}"},
            )
            self.assertEqual(403, response.status_code)

            # Good token + matching user_id => 200
            response = client.post(
                "/api/auth/avatar",
                json=payload,
                headers={"Authorization": f"Bearer {token}"},
            )
            self.assertEqual(200, response.status_code)

    def test_minigame_complete_requires_token(self) -> None:
        with _TempDb() as client:
            user = self._register(client, email="mg@gmail.com")
            payload = {
                "player_id": user["id"],
                "game_id": "tenge-catch",
                "score": 100,
                "elapsed_seconds": 10,
            }
            response = client.post("/api/minigames/complete", json=payload)
            self.assertEqual(401, response.status_code)

    def test_minigame_complete_with_valid_token(self) -> None:
        with _TempDb() as client:
            user = self._register(client, email="mg2@gmail.com")
            payload = {
                "player_id": user["id"],
                "game_id": "tenge-catch",
                "score": 800,
                "elapsed_seconds": 42,
            }
            response = client.post(
                "/api/minigames/complete",
                json=payload,
                headers={"Authorization": f"Bearer {user['token']}"},
            )
            # The endpoint may return 200 (recorded) or 4xx if the player has
            # not unlocked the prerequisite period — either way we're verifying
            # the token gate didn't reject it (no 401/403).
            self.assertNotIn(response.status_code, (401, 403))

    def test_minigame_complete_rejects_other_users_player_id(self) -> None:
        with _TempDb() as client:
            owner = self._register(client, email="owner@gmail.com", username="Owner")
            payload = {
                "player_id": "player-someone-else",
                "game_id": "tenge-catch",
                "score": 100,
                "elapsed_seconds": 5,
            }
            response = client.post(
                "/api/minigames/complete",
                json=payload,
                headers={"Authorization": f"Bearer {owner['token']}"},
            )
            self.assertEqual(403, response.status_code)

    def test_ent_session_ttl_evicts_expired_entries(self) -> None:
        """Sessions older than ENT_SESSION_TTL_SECONDS are removed by the
        sweep that runs on every put().
        """
        with _TempDb() as client:
            response = client.post("/api/ent/start", json={"question_count": 2})
            self.assertEqual(200, response.status_code)
            first_sid = response.json()["test_session_id"]
            self.assertIn(first_sid, main._ent_sessions)

            # Backdate the entry so the sweep treats it as expired.
            main._ent_sessions[first_sid]["created_at"] -= (
                main.ENT_SESSION_TTL_SECONDS + 60
            )

            # A new start triggers the sweep before inserting.
            response = client.post("/api/ent/start", json={"question_count": 2})
            self.assertEqual(200, response.status_code)
            second_sid = response.json()["test_session_id"]
            self.assertIn(second_sid, main._ent_sessions)
            self.assertNotIn(first_sid, main._ent_sessions)

            # Submitting against the expired session id is a 404.
            response = client.post(
                "/api/ent/submit",
                json={"test_session_id": first_sid, "answers": []},
            )
            self.assertEqual(404, response.status_code)

    def test_ent_session_replay_attack_returns_404(self) -> None:
        """Once a session has been submitted, the same id cannot be reused."""
        with _TempDb() as client:
            response = client.post("/api/ent/start", json={"question_count": 2})
            sid = response.json()["test_session_id"]

            response = client.post(
                "/api/ent/submit",
                json={"test_session_id": sid, "answers": []},
            )
            self.assertEqual(200, response.status_code)
            self.assertNotIn(sid, main._ent_sessions)

            response = client.post(
                "/api/ent/submit",
                json={"test_session_id": sid, "answers": []},
            )
            self.assertEqual(404, response.status_code)

    def test_legacy_sha256_password_still_logs_in(self) -> None:
        """Existing rows hashed with the old SHA-256+salt scheme must keep
        working AND get auto-upgraded to PBKDF2 on the first successful login.
        """
        import hashlib

        from quiz_bank.database import (
            _PBKDF2_PREFIX,
            authenticate_user,
            connect_db,
        )

        with tempfile.TemporaryDirectory() as tmp:
            db_path = Path(tmp) / "legacy.db"
            ensure_database(db_path)
            salt = "legacy-salt-xyz"
            password = "legacy-pwd-1234"
            legacy_hash = hashlib.sha256((salt + password).encode()).hexdigest()

            conn = connect_db(db_path)
            try:
                with conn:
                    conn.execute(
                        """
                        INSERT INTO users (id, username, email, password_hash,
                                           password_salt, auth_provider, created_at)
                        VALUES (?, ?, ?, ?, ?, 'password', ?)
                        """,
                        (
                            "player-legacy",
                            "Legacy",
                            "legacy@gmail.com",
                            legacy_hash,
                            salt,
                            "2024-01-01T00:00:00+00:00",
                        ),
                    )
            finally:
                conn.close()

            user = authenticate_user(db_path, "legacy@gmail.com", password)
            self.assertIsNotNone(user)

            conn = connect_db(db_path)
            try:
                row = conn.execute(
                    "SELECT password_hash, password_salt FROM users WHERE id = ?",
                    ("player-legacy",),
                ).fetchone()
            finally:
                conn.close()

            self.assertTrue(row["password_hash"].startswith(_PBKDF2_PREFIX))
            self.assertEqual("", row["password_salt"])

            # Re-login on the upgraded hash works.
            self.assertIsNotNone(
                authenticate_user(db_path, "legacy@gmail.com", password)
            )
            # Wrong password still rejected.
            self.assertIsNone(authenticate_user(db_path, "legacy@gmail.com", "x"))


if __name__ == "__main__":
    unittest.main()
