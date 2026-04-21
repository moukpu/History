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


ASTANA = "Астана"
SYGNAK = "Сыгнак"
YASSY = "Яссы"
OTRAR = "Отрар"
SAURAN = "Сауран"
SAIRAM = "Сайрам"
TARAZ = "Тараз"


class FrontendIntegrationApiTests(unittest.TestCase):
    def test_bootstrap_for_new_player_starts_at_1465(self) -> None:
        with self._client_with_temp_db() as (client, _db_path):
            payload = client.get("/api/app/bootstrap/ui-player-1").json()

            self.assertEqual("khanate_1465", payload["default_period_code"])
            self.assertEqual(7, len(payload["periods"]))
            self.assertEqual(6, len(payload["available_cities_for_default_period"]))
            self.assertEqual(1, payload["quest_summary"]["unlocked_periods_count"])
            self.assertEqual(0, payload["quest_summary"]["completed_periods_count"])
            self.assertTrue(all(item["has_content"] for item in payload["available_cities_for_default_period"]))
            self.assertTrue(payload["periods"][0]["is_unlocked"])
            self.assertFalse(payload["periods"][1]["is_unlocked"])

    def test_locked_future_period_remains_visible_but_view_only(self) -> None:
        with self._client_with_temp_db() as (client, _db_path):
            payload = client.get("/api/map-state/ui-player-2/modern_2025").json()
            self.assertEqual("modern_2025", payload["period_code"])
            self.assertFalse(payload["summary"]["is_unlocked_for_progression"])
            self.assertTrue(all(item["is_locked_for_testing"] for item in payload["cities"]))

    def test_khanate_map_state_is_limited_to_svg_cities(self) -> None:
        with self._client_with_temp_db() as (client, _db_path):
            payload = client.get("/api/map-state/ui-player-3/khanate_1465").json()

            self.assertEqual(6, payload["summary"]["total_cities"])
            self.assertEqual(
                {SYGNAK, YASSY, OTRAR, SAURAN, SAIRAM, TARAZ},
                {item["city"] for item in payload["cities"]},
            )
            self.assertTrue(all(not item["is_locked_for_testing"] for item in payload["cities"]))

    def test_bootstrap_and_map_state_reflect_modern_activity_after_unlock(self) -> None:
        with self._client_with_temp_db() as (client, db_path):
            self._unlock_periods_for_player(
                db_path,
                "ui-player-4",
                (
                    "khanate_1465",
                    "imperial_1731",
                    "imperial_1868",
                    "soviet_1925",
                    "independence_1991",
                    "transition_1998",
                ),
            )

            quiz_session = client.post(
                "/api/test/start",
                json={
                    "player_id": "ui-player-4",
                    "city": ASTANA,
                    "period_code": "modern_2025",
                    "question_count": 5,
                },
            ).json()
            question_ids = [item["id"] for item in quiz_session["questions"]]
            client.post(
                "/api/test/submit",
                json={
                    "player_id": "ui-player-4",
                    "test_session_id": quiz_session["test_session_id"],
                    "answers": self._build_correct_answers(db_path, question_ids),
                },
            )

            fact_session = client.post(
                "/api/fact-challenge/start",
                json={
                    "player_id": "ui-player-4",
                    "period_code": "modern_2025",
                    "candidate_count": 4,
                },
            ).json()
            fact_correct_city = self._fetch_fact_session_correct_city(
                db_path, fact_session["session_id"]
            )
            client.post(
                "/api/fact-challenge/submit",
                json={
                    "player_id": "ui-player-4",
                    "session_id": fact_session["session_id"],
                    "selected_city": fact_correct_city,
                },
            )

            bootstrap_payload = client.get("/api/app/bootstrap/ui-player-4").json()
            self.assertEqual("modern_2025", bootstrap_payload["default_period_code"])
            self.assertEqual(1, bootstrap_payload["player_summary"]["total_tests_completed"])
            self.assertEqual(1, bootstrap_payload["player_summary"]["fact_challenge_attempts"])

            map_state_payload = client.get("/api/map-state/ui-player-4/modern_2025").json()
            self.assertTrue(map_state_payload["summary"]["is_unlocked_for_progression"])
            self.assertEqual(15, map_state_payload["summary"]["total_cities"])
            self.assertEqual(1, map_state_payload["summary"]["cities_passed"])
            self.assertEqual(1, map_state_payload["summary"]["fact_correct_count"])

            astana_row = next(item for item in map_state_payload["cities"] if item["city"] == ASTANA)
            self.assertTrue(astana_row["passed_quiz_in_this_period"])
            self.assertEqual(100, astana_row["best_score_in_this_period"])

    @staticmethod
    def _build_correct_answers(db_path: Path, question_ids: list[int]) -> list[dict[str, int]]:
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
        return [
            {"question_id": question_id, "selected_index": by_id[question_id]}
            for question_id in question_ids
        ]

    @staticmethod
    def _fetch_fact_session_correct_city(db_path: Path, session_id: str) -> str:
        connection = sqlite3.connect(db_path)
        try:
            row = connection.execute(
                """
                SELECT fact_challenges.city
                FROM fact_challenge_sessions
                JOIN fact_challenges
                    ON fact_challenges.id = fact_challenge_sessions.challenge_id
                WHERE fact_challenge_sessions.id = ?
                """,
                (session_id,),
            ).fetchone()
        finally:
            connection.close()
        assert row is not None
        return str(row[0])

    @staticmethod
    def _unlock_periods_for_player(
        db_path: Path,
        player_id: str,
        period_codes: tuple[str, ...],
    ) -> None:
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
            connection.commit()
        finally:
            connection.close()

    @staticmethod
    def _client_with_temp_db():
        class _Context:
            def __enter__(self_inner):
                self_inner.temp_dir = tempfile.TemporaryDirectory()
                self_inner.db_path = Path(self_inner.temp_dir.name) / "quizzes.db"
                self_inner.original_db_path = main.DB_PATH
                main.DB_PATH = str(self_inner.db_path)
                main.init_db()
                replace_quiz_bank(
                    self_inner.db_path,
                    load_quiz_bank_json(DEFAULT_PERIOD_DATA_PATH),
                )
                self_inner.client_context = TestClient(main.app)
                self_inner.client = self_inner.client_context.__enter__()
                return self_inner.client, self_inner.db_path

            def __exit__(self_inner, exc_type, exc, tb):
                self_inner.client_context.__exit__(exc_type, exc, tb)
                main.DB_PATH = self_inner.original_db_path
                self_inner.temp_dir.cleanup()

        return _Context()
