from __future__ import annotations

import json
import sqlite3
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

import main
from quiz_bank.constants import (
    APPROVED_CITIES,
    CITY_QUESTION_TARGET,
    DEFAULT_DATA_PATH,
    DEFAULT_PERIOD_CODE,
)
from quiz_bank.database import ensure_database, fetch_random_quiz, replace_quiz_bank, seed_from_json_if_empty
from quiz_bank.generator import generate_quiz_bank
from quiz_bank.validation import load_quiz_bank_json, validate_quiz_bank


class QuizBankValidationTests(unittest.TestCase):
    def test_json_bank_is_valid_and_complete(self) -> None:
        items = load_quiz_bank_json(DEFAULT_DATA_PATH)
        errors, warnings = validate_quiz_bank(items)

        self.assertEqual([], errors)
        self.assertEqual([], warnings)
        self.assertEqual(len(APPROVED_CITIES) * CITY_QUESTION_TARGET, len(items))

    def test_generator_outputs_expected_structure(self) -> None:
        items = generate_quiz_bank()
        errors, warnings = validate_quiz_bank(items)

        self.assertEqual([], errors)
        self.assertEqual([], warnings)
        self.assertEqual(len(APPROVED_CITIES) * CITY_QUESTION_TARGET, len(items))
        self.assertTrue(all(item["period_code"] == DEFAULT_PERIOD_CODE for item in items))


class QuizBankDatabaseTests(unittest.TestCase):
    def test_import_and_fetch_random_quiz(self) -> None:
        items = load_quiz_bank_json(DEFAULT_DATA_PATH)

        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = Path(temp_dir) / "quizzes.db"
            ensure_database(db_path)
            replace_quiz_bank(db_path, items)

            payload = fetch_random_quiz(db_path, "Актау")

            self.assertIsNotNone(payload)
            assert payload is not None
            self.assertEqual(4, len(payload["options"]))
            self.assertIn(payload["correct_index"], range(4))
            self.assertTrue(payload["question"])
            self.assertIsNone(fetch_random_quiz(db_path, "Несуществующий город"))

    def test_seed_from_json_if_empty_is_idempotent(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = Path(temp_dir) / "quizzes.db"
            seed_from_json_if_empty(db_path, DEFAULT_DATA_PATH)
            first_count = self._row_count(db_path)

            seed_from_json_if_empty(db_path, DEFAULT_DATA_PATH)
            second_count = self._row_count(db_path)

            expected = len(APPROVED_CITIES) * CITY_QUESTION_TARGET
            self.assertEqual(expected, first_count)
            self.assertEqual(first_count, second_count)

    def test_ensure_database_migrates_legacy_schema_to_period_aware(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = Path(temp_dir) / "quizzes.db"
            connection = sqlite3.connect(db_path)
            try:
                connection.executescript(
                    """
                    CREATE TABLE quizzes (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        city TEXT NOT NULL COLLATE NOCASE,
                        question TEXT NOT NULL,
                        options TEXT NOT NULL,
                        correct_index INTEGER NOT NULL,
                        fact TEXT NOT NULL
                    );
                    CREATE UNIQUE INDEX quizzes_city_question_uq
                    ON quizzes(city, question);

                    CREATE TABLE achievements (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        code TEXT NOT NULL UNIQUE,
                        name TEXT NOT NULL,
                        description TEXT NOT NULL,
                        city TEXT NULL,
                        threshold INTEGER NULL,
                        created_at TEXT NOT NULL
                    );

                    CREATE TABLE test_results (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        player_id TEXT NOT NULL,
                        city TEXT NOT NULL,
                        total_questions INTEGER NOT NULL,
                        correct_answers INTEGER NOT NULL,
                        passed INTEGER NOT NULL,
                        completed_at TEXT NOT NULL
                    );

                    CREATE TABLE player_city_progress (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        player_id TEXT NOT NULL,
                        city TEXT NOT NULL,
                        passed_count INTEGER NOT NULL DEFAULT 0,
                        best_score INTEGER NOT NULL DEFAULT 0,
                        total_attempts INTEGER NOT NULL DEFAULT 0,
                        last_completed_at TEXT NULL,
                        UNIQUE(player_id, city)
                    );

                    CREATE TABLE test_sessions (
                        id TEXT PRIMARY KEY,
                        player_id TEXT NOT NULL,
                        city TEXT NOT NULL,
                        question_ids TEXT NOT NULL,
                        created_at TEXT NOT NULL
                    );
                    """
                )
                connection.execute(
                    """
                    INSERT INTO quizzes (city, question, options, correct_index, fact)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (
                        "Астана",
                        "Тестовый вопрос",
                        json.dumps(["1", "2", "3", "4"], ensure_ascii=False),
                        0,
                        "Факт",
                    ),
                )
                connection.execute(
                    """
                    INSERT INTO achievements (code, name, description, city, threshold, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    ("city_astana", "Астана", "desc", "Астана", None, "2026-01-01T00:00:00+00:00"),
                )
                connection.execute(
                    """
                    INSERT INTO test_results (
                        player_id,
                        city,
                        total_questions,
                        correct_answers,
                        passed,
                        completed_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    ("player-1", "Астана", 5, 4, 1, "2026-01-01T00:00:00+00:00"),
                )
                connection.execute(
                    """
                    INSERT INTO player_city_progress (
                        player_id,
                        city,
                        passed_count,
                        best_score,
                        total_attempts,
                        last_completed_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    ("player-1", "Астана", 1, 80, 1, "2026-01-01T00:00:00+00:00"),
                )
                connection.execute(
                    """
                    INSERT INTO test_sessions (
                        id,
                        player_id,
                        city,
                        question_ids,
                        created_at
                    )
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    ("session-1", "player-1", "Астана", "[1]", "2026-01-01T00:00:00+00:00"),
                )
                connection.commit()
            finally:
                connection.close()

            ensure_database(db_path)

            connection = sqlite3.connect(db_path)
            try:
                quizzes_columns = {
                    row[1] for row in connection.execute("PRAGMA table_info(quizzes)").fetchall()
                }
                self.assertIn("period_code", quizzes_columns)
                self.assertIn("difficulty", quizzes_columns)

                achievements_columns = {
                    row[1] for row in connection.execute("PRAGMA table_info(achievements)").fetchall()
                }
                self.assertIn("period_code", achievements_columns)

                progress_columns = {
                    row[1]
                    for row in connection.execute("PRAGMA table_info(player_city_progress)").fetchall()
                }
                self.assertIn("period_code", progress_columns)

                test_results_columns = {
                    row[1] for row in connection.execute("PRAGMA table_info(test_results)").fetchall()
                }
                self.assertIn("period_code", test_results_columns)

                test_sessions_columns = {
                    row[1] for row in connection.execute("PRAGMA table_info(test_sessions)").fetchall()
                }
                self.assertIn("period_code", test_sessions_columns)

                quiz_period_code = connection.execute(
                    "SELECT period_code FROM quizzes WHERE city = 'Астана'"
                ).fetchone()[0]
                self.assertEqual(DEFAULT_PERIOD_CODE, quiz_period_code)
                quiz_difficulty = connection.execute(
                    "SELECT difficulty FROM quizzes LIMIT 1"
                ).fetchone()[0]
                self.assertEqual("easy", quiz_difficulty)

                session_period_code = connection.execute(
                    "SELECT period_code FROM test_sessions WHERE id = 'session-1'"
                ).fetchone()[0]
                self.assertEqual(DEFAULT_PERIOD_CODE, session_period_code)

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
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        "player-1",
                        "Астана",
                        "independence_1991",
                        1,
                        90,
                        1,
                        "2026-01-02T00:00:00+00:00",
                    ),
                )
                connection.commit()

                count = connection.execute(
                    """
                    SELECT COUNT(*)
                    FROM player_city_progress
                    WHERE player_id = ? AND city = ?
                    """,
                    ("player-1", "Астана"),
                ).fetchone()[0]
                self.assertEqual(2, count)
            finally:
                connection.close()

    @staticmethod
    def _row_count(db_path: Path) -> int:
        connection = sqlite3.connect(db_path)
        try:
            return connection.execute("SELECT COUNT(*) FROM quizzes").fetchone()[0]
        finally:
            connection.close()


class StaticQuizApiTests(unittest.TestCase):
    def test_static_quiz_endpoint_returns_question_from_seed_bank(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = Path(temp_dir) / "quizzes.db"
            original_db_path = main.DB_PATH
            main.DB_PATH = str(db_path)
            try:
                main.init_db()
                with TestClient(main.app) as client:
                    response = client.get("/api/quiz/static/Актау")
                    self.assertEqual(200, response.status_code)

                    payload = response.json()
                    self.assertEqual(4, len(payload["options"]))
                    self.assertIn(payload["correct_index"], range(4))
                    self.assertTrue(payload["question"])
                    self.assertTrue(payload["fact"])

                    missing = client.get("/api/quiz/static/Несуществующий город")
                    self.assertEqual(404, missing.status_code)
            finally:
                main.DB_PATH = original_db_path


if __name__ == "__main__":
    unittest.main()
