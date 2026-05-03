from __future__ import annotations

import sqlite3
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

import main
from quiz_bank.constants import DEFAULT_PERIOD_DATA_PATH
from quiz_bank.database import replace_quiz_bank
from quiz_bank.validation import load_quiz_bank_json


YASSY = "Яссы"
SYGNAK = "Сыгнак"
OTRAR = "Отрар"
SAURAN = "Сауран"
SAIRAM = "Сайрам"
TARAZ = "Тараз"
ASTANA = "Астана"


class AchievementFlowApiTests(unittest.TestCase):
    def test_perfect_first_khanate_pass_unlocks_core_achievements(self) -> None:
        with self._client_with_temp_db() as (client, db_path):
            start_response = client.post(
                "/api/test/start",
                json={
                    "player_id": "player-1",
                    "city": YASSY,
                    "period_code": "khanate_1465",
                    "question_count": 5,
                },
            )
            self.assertEqual(200, start_response.status_code)
            start_payload = start_response.json()

            submit_response = client.post(
                "/api/test/submit",
                json={
                    "player_id": "player-1",
                    "test_session_id": start_payload["test_session_id"],
                    "answers": self._build_correct_answers(
                        db_path,
                        [question["id"] for question in start_payload["questions"]],
                    ),
                },
            )
            self.assertEqual(200, submit_response.status_code)
            submit_payload = submit_response.json()

            self.assertTrue(submit_payload["passed"])
            self.assertEqual("khanate_1465", submit_payload["period_code"])
            self.assertEqual(100, submit_payload["score_percent"])
            # The achievement catalog now emits per-period city codes like
            # `city_yassy_khanate_1465` and additionally awards the timing
            # achievements (`fast_city_test`, `steady_city_test`,
            # `perfect_fast_city_test`) on a perfect pass. Assert the set the
            # test cares about is a subset of what was actually awarded.
            awarded = {item["code"] for item in submit_payload["unlocked_achievements"]}
            self.assertIn("first_city_pass", awarded)
            self.assertIn("perfect_city_test", awarded)
            self.assertIn("city_yassy_khanate_1465", awarded)
            self.assertGreaterEqual(submit_payload["all_player_achievements_count"], 3)

            progress_payload = client.get("/api/progress/player-1").json()
            self.assertEqual(1, progress_payload["total_tests_completed"])
            self.assertEqual(1, progress_payload["total_passed_tests"])
            self.assertEqual(["khanate_1465"], progress_payload["unlocked_period_codes"])
            self.assertEqual([], progress_payload["completed_period_codes"])
            self.assertEqual("khanate_1465", progress_payload["current_period_code"])

    def test_failed_test_records_attempt_without_unlocks(self) -> None:
        with self._client_with_temp_db() as (client, db_path):
            start_payload = client.post(
                "/api/test/start",
                json={
                    "player_id": "player-2",
                    "city": YASSY,
                    "period_code": "khanate_1465",
                    "question_count": 5,
                },
            ).json()

            submit_response = client.post(
                "/api/test/submit",
                json={
                    "player_id": "player-2",
                    "test_session_id": start_payload["test_session_id"],
                    "answers": self._build_wrong_answers(
                        db_path,
                        [question["id"] for question in start_payload["questions"]],
                    ),
                },
            )
            self.assertEqual(200, submit_response.status_code)
            submit_payload = submit_response.json()
            self.assertFalse(submit_payload["passed"])
            self.assertEqual([], submit_payload["unlocked_achievements"])

            progress_payload = client.get("/api/progress/player-2").json()
            self.assertEqual(1, progress_payload["total_tests_completed"])
            self.assertEqual(0, progress_payload["total_passed_tests"])
            self.assertEqual(0, progress_payload["total_achievements_unlocked"])
            self.assertEqual(1, progress_payload["city_progress"][0]["total_attempts"])

    def test_progress_lists_ent_attempts_separately(self) -> None:
        with self._client_with_temp_db() as (client, db_path):
            connection = sqlite3.connect(db_path)
            try:
                connection.executemany(
                    """
                    INSERT INTO test_results (
                        player_id,
                        city,
                        period_code,
                        total_questions,
                        correct_answers,
                        passed,
                        completed_at
                    )
                    VALUES (?, 'ЕНТ', 'ENT', ?, ?, ?, ?)
                    """,
                    (
                        ("player-ent", 20, 14, 1, "2026-01-01T10:00:00+00:00"),
                        ("player-ent", 20, 17, 1, "2026-01-02T10:00:00+00:00"),
                    ),
                )
                connection.commit()
            finally:
                connection.close()

            progress_payload = client.get("/api/progress/player-ent").json()

            self.assertEqual(2, len(progress_payload["ent_attempts"]))
            self.assertEqual([85, 70], [item["score_percent"] for item in progress_payload["ent_attempts"]])
            self.assertEqual(
                ["2026-01-02T10:00:00+00:00", "2026-01-01T10:00:00+00:00"],
                [item["completed_at"] for item in progress_payload["ent_attempts"]],
            )

    def test_completing_first_period_unlocks_1731(self) -> None:
        with self._client_with_temp_db() as (client, db_path):
            # Real prod traffic on /api/minigames/complete carries a JWT for an
            # actually-registered user, and the validate_session middleware now
            # 401s when the JWT references a user row that no longer exists.
            # Insert a minimal `users` row for player-3 so the middleware sees
            # a live account and lets the test request through.
            self._ensure_user_row(db_path, "player-3")

            unlock_codes: set[str] = set()
            for city in (SYGNAK, YASSY, OTRAR, SAURAN, SAIRAM, TARAZ):
                unlock_codes.update(
                    self._submit_perfect_test(
                        client=client,
                        db_path=db_path,
                        player_id="player-3",
                        city=city,
                        period_code="khanate_1465",
                    )
                )

            self.assertIn("first_period_complete", unlock_codes)
            self.assertIn("khanate_complete_1465", unlock_codes)

            # Imperial 1731 is now gated by the `caravan-runner` minigame.
            # Simulate completing it so the period can unlock. The
            # `/api/minigames/complete` endpoint requires a matching JWT.
            minigame_response = client.post(
                "/api/minigames/complete",
                json={"player_id": "player-3", "game_id": "caravan-runner"},
                headers={"Authorization": f"Bearer {main.create_jwt('player-3')}"},
            )
            self.assertEqual(200, minigame_response.status_code)

            bootstrap_payload = client.get("/api/app/bootstrap/player-3").json()
            self.assertEqual("imperial_1731", bootstrap_payload["default_period_code"])
            self.assertEqual(2, bootstrap_payload["quest_summary"]["unlocked_periods_count"])
            self.assertEqual(1, bootstrap_payload["quest_summary"]["completed_periods_count"])

            progress_payload = client.get("/api/progress/player-3").json()
            self.assertEqual(
                ["khanate_1465", "imperial_1731"],
                progress_payload["unlocked_period_codes"],
            )
            self.assertEqual(["khanate_1465"], progress_payload["completed_period_codes"])

    def test_locked_future_period_rejects_new_player(self) -> None:
        with self._client_with_temp_db() as (client, _db_path):
            response = client.post(
                "/api/test/start",
                json={
                    "player_id": "player-4",
                    "city": ASTANA,
                    "period_code": "modern_2025",
                    "question_count": 5,
                },
            )
            self.assertEqual(403, response.status_code)

    def test_unavailable_city_period_still_returns_400_when_period_is_unlocked(self) -> None:
        with self._client_with_temp_db() as (client, db_path):
            self._unlock_periods_for_player(
                db_path,
                "player-5",
                (
                    "khanate_1465",
                    "imperial_1731",
                    "imperial_1868",
                    "soviet_1925",
                    "independence_1991",
                    "transition_1998",
                ),
            )

            connection = sqlite3.connect(db_path)
            try:
                connection.execute(
                    """
                    UPDATE city_periods
                    SET is_available = 0
                    WHERE city = ? AND period_code = ?
                    """,
                    (ASTANA, "modern_2025"),
                )
                connection.commit()
            finally:
                connection.close()

            response = client.post(
                "/api/test/start",
                json={
                    "player_id": "player-5",
                    "city": ASTANA,
                    "period_code": "modern_2025",
                    "question_count": 5,
                },
            )
            self.assertEqual(400, response.status_code)

    def test_unavailable_city_periods_do_not_create_impossible_achievements(self) -> None:
        with self._client_with_temp_db() as (_client, db_path):
            connection = sqlite3.connect(db_path)
            try:
                rows = connection.execute(
                    """
                    SELECT city_periods.city, city_periods.period_code, achievements.code
                    FROM city_periods
                    JOIN achievements
                      ON achievements.city = city_periods.city
                     AND achievements.period_code = city_periods.period_code
                    WHERE city_periods.is_available = 0
                    """
                ).fetchall()
            finally:
                connection.close()

            self.assertEqual([], rows)

    @staticmethod
    def _ensure_user_row(db_path: Path, user_id: str) -> None:
        """Insert a minimal `users` row so server-side session validation
        treats this id as an active account.
        """
        connection = sqlite3.connect(db_path)
        try:
            with connection:
                connection.execute(
                    """
                    INSERT OR IGNORE INTO users (
                        id, username, email, password_hash, password_salt,
                        auth_provider, created_at
                    ) VALUES (?, ?, ?, '', '', 'password', '2026-01-01T00:00:00+00:00')
                    """,
                    (user_id, f"test-{user_id}", f"{user_id}@test.local"),
                )
        finally:
            connection.close()

    @staticmethod
    def _build_correct_answers(db_path: Path, question_ids: list[int]) -> list[dict[str, int]]:
        return [
            {"question_id": question_id, "selected_index": correct_index}
            for question_id, correct_index in AchievementFlowApiTests._fetch_correct_indices(
                db_path,
                question_ids,
            )
        ]

    @staticmethod
    def _build_wrong_answers(db_path: Path, question_ids: list[int]) -> list[dict[str, int]]:
        return [
            {"question_id": question_id, "selected_index": (correct_index + 1) % 4}
            for question_id, correct_index in AchievementFlowApiTests._fetch_correct_indices(
                db_path,
                question_ids,
            )
        ]

    @staticmethod
    def _fetch_correct_indices(db_path: Path, question_ids: list[int]) -> list[tuple[int, int]]:
        placeholders = ", ".join("?" for _ in question_ids)
        connection = sqlite3.connect(db_path)
        try:
            rows = connection.execute(
                f"""
                SELECT id, correct_index
                FROM quizzes
                WHERE id IN ({placeholders})
                """,
                tuple(question_ids),
            ).fetchall()
        finally:
            connection.close()

        by_id = {row[0]: row[1] for row in rows}
        return [(question_id, by_id[question_id]) for question_id in question_ids]

    @staticmethod
    def _submit_perfect_test(
        client: TestClient,
        db_path: Path,
        player_id: str,
        city: str,
        period_code: str,
    ) -> set[str]:
        start_payload = client.post(
            "/api/test/start",
            json={
                "player_id": player_id,
                "city": city,
                "period_code": period_code,
                "question_count": 5,
            },
        ).json()
        submit_payload = client.post(
            "/api/test/submit",
            json={
                "player_id": player_id,
                "test_session_id": start_payload["test_session_id"],
                "answers": AchievementFlowApiTests._build_correct_answers(
                    db_path,
                    [question["id"] for question in start_payload["questions"]],
                ),
            },
        ).json()
        return {item["code"] for item in submit_payload["unlocked_achievements"]}

    @staticmethod
    def _unlock_periods_for_player(
        db_path: Path,
        player_id: str,
        period_codes: tuple[str, ...],
    ) -> None:
        from quiz_bank.services import MINIGAME_BY_FROM_PERIOD
        connection = sqlite3.connect(db_path)
        try:
            for period_code in period_codes:
                cities = connection.execute(
                    """
                    SELECT city
                    FROM city_periods
                    WHERE period_code = ? AND is_available = 1
                    """,
                    (period_code,),
                ).fetchall()
                for (city,) in cities:
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
                        VALUES (?, ?, ?, 1, 100, 1, '2026-01-01T00:00:00+00:00')
                        ON CONFLICT(player_id, city, period_code) DO UPDATE SET
                            passed_count = excluded.passed_count,
                            best_score = excluded.best_score,
                            total_attempts = excluded.total_attempts,
                            last_completed_at = excluded.last_completed_at
                        """,
                        (player_id, city, period_code),
                    )
                game_id = MINIGAME_BY_FROM_PERIOD.get(period_code)
                if game_id:
                    connection.execute(
                        """
                        INSERT INTO player_minigame_progress (
                            player_id, game_id, completed_at,
                            best_score, best_elapsed_seconds, attempts
                        )
                        VALUES (?, ?, '2026-01-01T00:00:00+00:00', 100, 30, 1)
                        ON CONFLICT(player_id, game_id) DO UPDATE SET
                            completed_at = excluded.completed_at,
                            best_score = excluded.best_score,
                            best_elapsed_seconds = excluded.best_elapsed_seconds,
                            attempts = excluded.attempts
                        """,
                        (player_id, game_id),
                    )
            connection.commit()
        finally:
            connection.close()

    def _client_with_temp_db(self):
        return _TempDbClientContext()


class _TempDbClientContext:
    def __enter__(self) -> tuple[TestClient, Path]:
        self._temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self._temp_dir.name) / "quizzes.db"
        self.original_db_path = main.DB_PATH
        main.DB_PATH = str(self.db_path)
        main.init_db()
        replace_quiz_bank(self.db_path, load_quiz_bank_json(DEFAULT_PERIOD_DATA_PATH))
        self.client = TestClient(main.app)
        self.client.__enter__()
        return self.client, self.db_path

    def __exit__(self, exc_type, exc, tb) -> None:
        self.client.__exit__(exc_type, exc, tb)
        main.DB_PATH = self.original_db_path
        self._temp_dir.cleanup()
