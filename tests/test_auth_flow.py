from __future__ import annotations

import sqlite3
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

import main
from quiz_bank.database import connect_db, create_user, ensure_database, upsert_google_user


class AuthFlowTests(unittest.TestCase):
    def test_register_rejects_duplicate_email_case_insensitive(self) -> None:
        with self._client_with_temp_db() as client:
            first = client.post(
                "/api/auth/register",
                json={
                    "username": "Aldi",
                    "email": "Aldi@Example.com",
                    "password": "1234",
                },
            )
            self.assertEqual(200, first.status_code)

            duplicate = client.post(
                "/api/auth/register",
                json={
                    "username": "AldiTwo",
                    "email": "aldi@example.com",
                    "password": "1234",
                },
            )

            self.assertEqual(409, duplicate.status_code)
            self.assertIn("почтой", duplicate.json()["detail"])

    def test_auth_resolve_falls_back_to_email_after_user_merge(self) -> None:
        with self._client_with_temp_db() as client:
            created = client.post(
                "/api/auth/register",
                json={
                    "username": "Aldi",
                    "email": "aldi@example.com",
                    "password": "1234",
                },
            ).json()

            resolved = client.post(
                "/api/auth/resolve",
                json={
                    "id": "deleted-duplicate-id",
                    "email": "ALDI@example.com",
                },
            )

            self.assertEqual(200, resolved.status_code)
            self.assertEqual(created["id"], resolved.json()["id"])

    def test_legacy_duplicate_email_users_are_merged_before_unique_index(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = Path(temp_dir) / "legacy.sqlite"
            connection = sqlite3.connect(db_path)
            try:
                connection.executescript(
                    """
                    CREATE TABLE users (
                        id TEXT PRIMARY KEY,
                        username TEXT NOT NULL,
                        email TEXT NOT NULL,
                        password_hash TEXT NOT NULL,
                        password_salt TEXT NOT NULL,
                        created_at TEXT NOT NULL
                    );

                    CREATE TABLE player_city_progress (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        player_id TEXT NOT NULL,
                        city TEXT NOT NULL,
                        period_code TEXT NOT NULL,
                        passed_count INTEGER NOT NULL DEFAULT 0,
                        best_score INTEGER NOT NULL DEFAULT 0,
                        total_attempts INTEGER NOT NULL DEFAULT 0,
                        last_completed_at TEXT NULL,
                        UNIQUE(player_id, city, period_code)
                    );
                    """
                )
                connection.executemany(
                    """
                    INSERT INTO users (
                        id,
                        username,
                        email,
                        password_hash,
                        password_salt,
                        created_at
                    )
                    VALUES (?, ?, ?, '', '', ?)
                    """,
                    (
                        ("player-old", "OldAldi", "ALDI@example.com", "2026-01-01T00:00:00+00:00"),
                        ("player-new", "NewAldi", "aldi@example.com", "2026-01-02T00:00:00+00:00"),
                    ),
                )
                connection.execute(
                    """
                    INSERT INTO player_city_progress (
                        player_id,
                        city,
                        period_code,
                        passed_count,
                        best_score,
                        total_attempts,
                        last_completed_at
                    )
                    VALUES ('player-old', 'Астана', 'modern_2025', 1, 95, 2, '2026-02-01T00:00:00+00:00')
                    """
                )
                connection.commit()
            finally:
                connection.close()

            ensure_database(db_path)

            connection = sqlite3.connect(db_path)
            try:
                users = connection.execute(
                    "SELECT id, email FROM users ORDER BY id"
                ).fetchall()
                progress = connection.execute(
                    """
                    SELECT player_id, best_score, total_attempts
                    FROM player_city_progress
                    """
                ).fetchall()
            finally:
                connection.close()

            self.assertEqual([("player-old", "aldi@example.com")], users)
            self.assertEqual([("player-old", 95, 2)], progress)

    def test_google_login_reuses_existing_email_account(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = Path(temp_dir) / "google.sqlite"
            ensure_database(db_path)

            first = upsert_google_user(
                db_path,
                user_id="player-google-1",
                email="aldi@example.com",
                username="Aldi",
                google_sub="google-sub-1",
                avatar_url="https://example.com/avatar.png",
            )
            second = upsert_google_user(
                db_path,
                user_id="player-google-2",
                email="ALDI@example.com",
                username="Aldi Again",
                google_sub="google-sub-1",
                avatar_url="https://example.com/avatar-new.png",
            )

            self.assertEqual(first["id"], second["id"])
            self.assertEqual("aldi@example.com", second["email"])
            self.assertEqual("https://example.com/avatar-new.png", second["avatar_url"])

    def test_google_login_reuses_password_account_by_email(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = Path(temp_dir) / "google-password.sqlite"
            ensure_database(db_path)
            create_user(
                db_path,
                user_id="player-password",
                username="Aldi",
                email="aldi@example.com",
                password="1234",
            )

            user = upsert_google_user(
                db_path,
                user_id="player-google",
                email="ALDI@example.com",
                username="Aldi Google",
                google_sub="google-sub-2",
                avatar_url="https://example.com/google.png",
            )

            self.assertEqual("player-password", user["id"])
            self.assertEqual("Aldi", user["username"])
            self.assertEqual("aldi@example.com", user["email"])
            self.assertEqual("https://example.com/google.png", user["avatar_url"])

    def test_google_login_creates_account_when_email_is_new(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = Path(temp_dir) / "google-new.sqlite"
            ensure_database(db_path)

            user = upsert_google_user(
                db_path,
                user_id="player-google-new",
                email="new@example.com",
                username="New User",
                google_sub="google-sub-new",
                avatar_url=None,
            )

            self.assertEqual("player-google-new", user["id"])
            self.assertEqual("New User", user["username"])
            self.assertEqual("new@example.com", user["email"])
            self.assertIsNone(user["avatar_url"])

    def test_leaderboard_returns_integer_accuracy_for_multiple_city_scores(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = Path(temp_dir) / "leaderboard.sqlite"
            ensure_database(db_path)
            create_user(
                db_path,
                user_id="player-leaderboard",
                username="Leaderboard User",
                email="leaderboard@example.com",
                password="1234",
            )

            connection = connect_db(db_path)
            try:
                connection.executemany(
                    """
                    INSERT INTO player_city_progress (
                        player_id,
                        city,
                        period_code,
                        passed_count,
                        best_score,
                        total_attempts,
                        last_completed_at
                    )
                    VALUES (?, ?, ?, 1, ?, 1, '2026-04-22T00:00:00+00:00')
                    """,
                    (
                        ("player-leaderboard", "Тараз", "khanate_1465", 51),
                        ("player-leaderboard", "Сыгнак", "khanate_1465", 52),
                    ),
                )
                connection.commit()
            finally:
                connection.close()

            original_db_path = main.DB_PATH
            main.DB_PATH = str(db_path)
            try:
                with TestClient(main.app) as client:
                    response = client.get("/api/leaderboard")
            finally:
                main.DB_PATH = original_db_path

            self.assertEqual(200, response.status_code)
            entry = response.json()["entries"][0]
            self.assertEqual("Leaderboard User", entry["username"])
            self.assertEqual(52, entry["accuracy"])

    @staticmethod
    def _client_with_temp_db():
        class _Context:
            def __enter__(self_inner):
                self_inner.temp_dir = tempfile.TemporaryDirectory()
                self_inner.original_db_path = main.DB_PATH
                main.DB_PATH = str(Path(self_inner.temp_dir.name) / "quizzes.db")
                main.init_db()
                self_inner.client_context = TestClient(main.app)
                return self_inner.client_context.__enter__()

            def __exit__(self_inner, exc_type, exc, tb):
                self_inner.client_context.__exit__(exc_type, exc, tb)
                main.DB_PATH = self_inner.original_db_path
                self_inner.temp_dir.cleanup()

        return _Context()
