from __future__ import annotations

import sqlite3
import tempfile
import unittest
from collections import Counter
from pathlib import Path

from fastapi.testclient import TestClient

import main
from quiz_bank.constants import (
    DEFAULT_PERIOD_DATA_PATH,
    PERIOD_EASY_QUESTION_TARGET,
    PERIOD_HARD_QUESTION_TARGET,
    PERIOD_TOTAL_QUESTION_TARGET,
)
from quiz_bank.database import replace_quiz_bank
from quiz_bank.period_content import build_period_quiz_coverage_matrix
from quiz_bank.period_validation import build_period_quiz_report, validate_period_quiz_bank
from quiz_bank.validation import load_quiz_bank_json


YASSY = "Яссы"
VERNY = "Верный"
ASTANA = "Астана"
AKTOBE = "Актобе"


class PeriodQuizPipelineTests(unittest.TestCase):
    def test_period_seed_file_is_valid_and_complete_against_coverage(self) -> None:
        items = load_quiz_bank_json(DEFAULT_PERIOD_DATA_PATH)
        coverage = build_period_quiz_coverage_matrix()
        errors, warnings = validate_period_quiz_bank(items, coverage=coverage)
        report = build_period_quiz_report(items, errors, warnings, coverage=coverage)

        self.assertEqual([], errors)
        self.assertEqual([], warnings)
        self.assertEqual([], report["missing_pairs"])
        self.assertEqual([], report["unexpected_pairs"])
        self.assertEqual([], report["difficulty_mismatches"])
        self.assertEqual(81, len(report["counts_per_city_period"]))
        self.assertEqual(81 * PERIOD_TOTAL_QUESTION_TARGET, report["total_questions"])
        self.assertEqual(7, len(report["counts_per_period"]))
        self.assertEqual(
            {"easy": 81 * PERIOD_EASY_QUESTION_TARGET, "hard": 81 * PERIOD_HARD_QUESTION_TARGET},
            report["counts_per_difficulty"],
        )

        for entry in coverage:
            pair_key = f"{entry.city}|{entry.period_code}"
            self.assertEqual(PERIOD_TOTAL_QUESTION_TARGET, report["counts_per_city_period"][pair_key])
            self.assertEqual(
                PERIOD_EASY_QUESTION_TARGET,
                report["counts_per_city_period_difficulty"][f"{entry.city}|{entry.period_code}|easy"],
            )
            self.assertEqual(
                PERIOD_HARD_QUESTION_TARGET,
                report["counts_per_city_period_difficulty"][f"{entry.city}|{entry.period_code}|hard"],
            )

    def test_khanate_city_can_start_and_submit_full_score(self) -> None:
        period_records = load_quiz_bank_json(DEFAULT_PERIOD_DATA_PATH)

        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = Path(temp_dir) / "quizzes.db"
            original_db_path = main.DB_PATH
            main.DB_PATH = str(db_path)
            try:
                main.init_db()
                replace_quiz_bank(db_path, period_records)

                with TestClient(main.app) as client:
                    start_response = client.post(
                        "/api/test/start",
                        json={
                            "player_id": "period-player",
                            "city": YASSY,
                            "period_code": "khanate_1465",
                            "question_count": 5,
                        },
                    )
                    self.assertEqual(200, start_response.status_code)
                    start_payload = start_response.json()
                    question_ids = [question["id"] for question in start_payload["questions"]]

                    submit_response = client.post(
                        "/api/test/submit",
                        json={
                            "player_id": "period-player",
                            "test_session_id": start_payload["test_session_id"],
                            "answers": self._build_correct_answers(db_path, question_ids),
                        },
                    )
                    self.assertEqual(200, submit_response.status_code)
                    submit_payload = submit_response.json()
                    self.assertTrue(submit_payload["passed"])
                    self.assertEqual("khanate_1465", submit_payload["period_code"])
                    self.assertIn(
                        "city_yassy",
                        {item["code"] for item in submit_payload["unlocked_achievements"]},
                    )
            finally:
                main.DB_PATH = original_db_path

    def test_locked_future_period_is_rejected_for_new_player(self) -> None:
        period_records = load_quiz_bank_json(DEFAULT_PERIOD_DATA_PATH)

        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = Path(temp_dir) / "quizzes.db"
            original_db_path = main.DB_PATH
            main.DB_PATH = str(db_path)
            try:
                main.init_db()
                replace_quiz_bank(db_path, period_records)

                with TestClient(main.app) as client:
                    response = client.post(
                        "/api/test/start",
                        json={
                            "player_id": "locked-player",
                            "city": AKTOBE,
                            "period_code": "transition_1998",
                            "question_count": 5,
                        },
                    )
                    self.assertEqual(403, response.status_code)
            finally:
                main.DB_PATH = original_db_path

    def test_unlocked_future_period_city_can_start_and_submit(self) -> None:
        period_records = load_quiz_bank_json(DEFAULT_PERIOD_DATA_PATH)

        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = Path(temp_dir) / "quizzes.db"
            original_db_path = main.DB_PATH
            main.DB_PATH = str(db_path)
            try:
                main.init_db()
                replace_quiz_bank(db_path, period_records)
                self._unlock_periods_for_player(
                    db_path,
                    "future-player",
                    (
                        "khanate_1465",
                        "imperial_1731",
                        "imperial_1868",
                        "soviet_1925",
                        "independence_1991",
                    ),
                )

                with TestClient(main.app) as client:
                    start_response = client.post(
                        "/api/test/start",
                        json={
                            "player_id": "future-player",
                            "city": AKTOBE,
                            "period_code": "transition_1998",
                            "question_count": 5,
                        },
                    )
                    self.assertEqual(200, start_response.status_code)
                    start_payload = start_response.json()
                    question_ids = [question["id"] for question in start_payload["questions"]]

                    submit_response = client.post(
                        "/api/test/submit",
                        json={
                            "player_id": "future-player",
                            "test_session_id": start_payload["test_session_id"],
                            "answers": self._build_correct_answers(db_path, question_ids),
                        },
                    )
                    self.assertEqual(200, submit_response.status_code)
                    self.assertTrue(submit_response.json()["passed"])
            finally:
                main.DB_PATH = original_db_path

    def test_imperial_1868_pair_matches_configured_question_targets(self) -> None:
        items = load_quiz_bank_json(DEFAULT_PERIOD_DATA_PATH)
        counts = Counter(
            (item["city"], item["period_code"], item["difficulty"]) for item in items
        )
        self.assertEqual(
            PERIOD_EASY_QUESTION_TARGET,
            counts[(VERNY, "imperial_1868", "easy")],
        )
        self.assertEqual(
            PERIOD_HARD_QUESTION_TARGET,
            counts[(VERNY, "imperial_1868", "hard")],
        )
        self.assertEqual(
            PERIOD_TOTAL_QUESTION_TARGET,
            counts[(VERNY, "imperial_1868", "easy")] + counts[(VERNY, "imperial_1868", "hard")],
        )

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


if __name__ == "__main__":
    unittest.main()
