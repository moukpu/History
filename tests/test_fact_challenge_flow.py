from __future__ import annotations

import sqlite3
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

import main
from quiz_bank.constants import APPROVED_CITIES, DEFAULT_FACT_CHALLENGE_DATA_PATH, DEFAULT_PERIOD_DATA_PATH
from quiz_bank.database import replace_quiz_bank
from quiz_bank.fact_challenge_validation import (
    build_fact_challenge_report,
    load_fact_challenges_json,
    validate_fact_challenges,
)
from quiz_bank.fact_challenges import build_fact_challenge_seed
from quiz_bank.validation import load_quiz_bank_json


class FactChallengePipelineAndApiTests(unittest.TestCase):
    def test_generated_fact_challenge_seed_matches_committed_file(self) -> None:
        generated = build_fact_challenge_seed()
        on_disk = load_fact_challenges_json(DEFAULT_FACT_CHALLENGE_DATA_PATH)
        self.assertEqual(generated, on_disk)

    def test_fact_challenge_seed_validates_cleanly(self) -> None:
        items = load_fact_challenges_json(DEFAULT_FACT_CHALLENGE_DATA_PATH)
        errors, warnings = validate_fact_challenges(items)
        report = build_fact_challenge_report(items, errors, warnings)

        self.assertEqual([], errors)
        self.assertEqual([], warnings)
        self.assertEqual([], report["missing_supported_pairs"])
        self.assertEqual(81, report["total_records"])
        self.assertEqual(6, report["active_counts_per_period"]["khanate_1465"])
        self.assertEqual(15, report["active_counts_per_period"]["modern_2025"])

    def test_start_submit_and_progress_for_unlocked_fact_challenge(self) -> None:
        with self._client_with_temp_db() as (client, db_path):
            start_response = client.post(
                "/api/fact-challenge/start",
                json={
                    "player_id": "fact-player-1",
                    "period_code": "khanate_1465",
                    "candidate_count": 4,
                },
            )
            self.assertEqual(200, start_response.status_code)
            start_payload = start_response.json()
            self.assertEqual("khanate_1465", start_payload["period_code"])
            self.assertEqual(4, len(start_payload["candidate_cities"]))

            correct_city = self._fetch_fact_session_correct_city(
                db_path, start_payload["session_id"]
            )
            submit_response = client.post(
                "/api/fact-challenge/submit",
                json={
                    "player_id": "fact-player-1",
                    "session_id": start_payload["session_id"],
                    "selected_city": correct_city,
                },
            )
            self.assertEqual(200, submit_response.status_code)
            submit_payload = submit_response.json()
            self.assertTrue(submit_payload["is_correct"])
            self.assertEqual({"fact_first_correct"}, {item["code"] for item in submit_payload["unlocked_achievements"]})

            progress_payload = client.get("/api/fact-challenge/progress/fact-player-1").json()
            self.assertEqual(1, progress_payload["total_attempts"])
            self.assertEqual(1, progress_payload["total_correct"])
            self.assertEqual("khanate_1465", progress_payload["per_period_summary"][0]["period_code"])

    def test_locked_future_period_is_rejected_for_new_player(self) -> None:
        with self._client_with_temp_db() as (client, _db_path):
            response = client.post(
                "/api/fact-challenge/start",
                json={
                    "player_id": "fact-player-2",
                    "period_code": "modern_2025",
                    "candidate_count": 4,
                },
            )
            self.assertEqual(403, response.status_code)

    def test_unlocked_future_period_can_start(self) -> None:
        with self._client_with_temp_db() as (client, db_path):
            self._unlock_periods_for_player(
                db_path,
                "fact-player-3",
                (
                    "khanate_1465",
                    "imperial_1731",
                    "imperial_1868",
                    "soviet_1925",
                    "independence_1991",
                    "transition_1998",
                ),
            )

            response = client.post(
                "/api/fact-challenge/start",
                json={
                    "player_id": "fact-player-3",
                    "period_code": "modern_2025",
                    "candidate_count": 4,
                },
            )
            self.assertEqual(200, response.status_code)
            payload = response.json()
            self.assertEqual("modern_2025", payload["period_code"])
            self.assertEqual(4, len(payload["candidate_cities"]))

    def test_submit_rejects_invalid_city_and_completed_session(self) -> None:
        with self._client_with_temp_db() as (client, db_path):
            start_payload = client.post(
                "/api/fact-challenge/start",
                json={
                    "player_id": "fact-player-4",
                    "period_code": "khanate_1465",
                    "candidate_count": 4,
                },
            ).json()

            invalid_response = client.post(
                "/api/fact-challenge/submit",
                json={
                    "player_id": "fact-player-4",
                    "session_id": start_payload["session_id"],
                    "selected_city": next(
                        city for city in APPROVED_CITIES if city not in start_payload["candidate_cities"]
                    ),
                },
            )
            self.assertEqual(400, invalid_response.status_code)

            correct_city = self._fetch_fact_session_correct_city(
                db_path, start_payload["session_id"]
            )
            first_submit = client.post(
                "/api/fact-challenge/submit",
                json={
                    "player_id": "fact-player-4",
                    "session_id": start_payload["session_id"],
                    "selected_city": correct_city,
                },
            )
            self.assertEqual(200, first_submit.status_code)

            second_submit = client.post(
                "/api/fact-challenge/submit",
                json={
                    "player_id": "fact-player-4",
                    "session_id": start_payload["session_id"],
                    "selected_city": correct_city,
                },
            )
            self.assertEqual(409, second_submit.status_code)

    def test_correct_answer_milestones_unlock_at_five_and_ten(self) -> None:
        with self._client_with_temp_db() as (client, db_path):
            fifth_unlocks: set[str] = set()
            tenth_unlocks: set[str] = set()

            for index in range(10):
                payload = client.post(
                    "/api/fact-challenge/start",
                    json={
                        "player_id": "fact-player-5",
                        "period_code": "khanate_1465",
                        "candidate_count": 4,
                    },
                ).json()
                correct_city = self._fetch_fact_session_correct_city(
                    db_path, payload["session_id"]
                )
                submit_payload = client.post(
                    "/api/fact-challenge/submit",
                    json={
                        "player_id": "fact-player-5",
                        "session_id": payload["session_id"],
                        "selected_city": correct_city,
                    },
                ).json()
                codes = {item["code"] for item in submit_payload["unlocked_achievements"]}
                if index == 4:
                    fifth_unlocks = codes
                if index == 9:
                    tenth_unlocks = codes

            self.assertIn("fact_correct_5", fifth_unlocks)
            self.assertIn("fact_correct_10", tenth_unlocks)

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
        # Period N is considered "unlocked for the next period" only if the
        # minigame gate associated with period N has also been completed.
        # Simulate that here so these helpers keep working after the
        # minigame-gate feature was introduced.
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


if __name__ == "__main__":
    unittest.main()
