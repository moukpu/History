from __future__ import annotations

import sqlite3
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

import main
from quiz_bank.city_content import build_city_period_content_seed
from quiz_bank.city_content_validation import (
    build_city_period_content_report,
    load_city_period_content_json,
    validate_city_period_content,
)
from quiz_bank.constants import DEFAULT_CITY_PERIOD_CONTENT_PATH


class CityPeriodContentPipelineTests(unittest.TestCase):
    def test_generated_city_period_content_matches_committed_seed(self) -> None:
        generated = build_city_period_content_seed()
        on_disk = load_city_period_content_json(DEFAULT_CITY_PERIOD_CONTENT_PATH)
        self.assertEqual(generated, on_disk)

    def test_city_period_content_seed_is_valid_and_complete(self) -> None:
        items = load_city_period_content_json(DEFAULT_CITY_PERIOD_CONTENT_PATH)
        errors, warnings = validate_city_period_content(items)
        report = build_city_period_content_report(items, errors, warnings)

        self.assertEqual([], errors)
        self.assertEqual([], warnings)
        self.assertEqual([], report["missing_supported_pairs"])
        self.assertEqual(0, report["duplicate_pair_count"])
        self.assertEqual(81, report["total_records"])

    def test_city_content_endpoints_return_seeded_period_data(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = Path(temp_dir) / "quizzes.db"
            original_db_path = main.DB_PATH
            main.DB_PATH = str(db_path)
            try:
                main.init_db()
                main.init_db()

                connection = sqlite3.connect(db_path)
                try:
                    content_count = connection.execute(
                        "SELECT COUNT(*) FROM city_period_content"
                    ).fetchone()[0]
                finally:
                    connection.close()
                self.assertEqual(81, content_count)

                with TestClient(main.app) as client:
                    summary_response = client.get("/api/city-content/khanate_1465")
                    self.assertEqual(200, summary_response.status_code)
                    summary_payload = summary_response.json()["cities"]
                    self.assertEqual(6, len(summary_payload))
                    self.assertEqual(
                        {
                            "Сыгнак",
                            "Яссы",
                            "Отрар",
                            "Сауран",
                            "Сайрам",
                            "Тараз",
                        },
                        {item["city"] for item in summary_payload},
                    )
                    taraz_summary = next(
                        item for item in summary_payload if item["city"] == "Тараз"
                    )
                    self.assertEqual("khanate_1465", taraz_summary["period_code"])
                    self.assertTrue(taraz_summary["short_description"])
                    self.assertEqual(
                        {
                            "city",
                            "period_code",
                            "display_name",
                            "subtitle",
                            "short_description",
                            "quiz_available",
                            "fact_challenge_available",
                        },
                        set(taraz_summary),
                    )

                    yassy_response = client.get("/api/city-content/khanate_1465/Яссы")
                    self.assertEqual(200, yassy_response.status_code)
                    yassy_payload = yassy_response.json()["content"]
                    self.assertEqual("khanate_1465", yassy_payload["period_code"])
                    self.assertEqual("Яссы", yassy_payload["display_name"])
                    self.assertEqual("Шавгар", yassy_payload["old_name"])
                    self.assertTrue(yassy_payload["history_summary"])
                    self.assertEqual(3, len(yassy_payload["image_keys"]))

                    detail_response = client.get("/api/city-content/modern_2025/Астана")
                    self.assertEqual(200, detail_response.status_code)
                    detail_payload = detail_response.json()["content"]
                    self.assertEqual("Астана", detail_payload["city"])
                    self.assertEqual("modern_2025", detail_payload["period_code"])
                    self.assertEqual("Акмола", detail_payload["old_name"])
                    self.assertTrue(detail_payload["history_summary"])
                    self.assertEqual(3, len(detail_payload["image_keys"]))

                    transition_response = client.get("/api/city-content/transition_1998/Актобе")
                    self.assertEqual(200, transition_response.status_code)
                    transition_payload = transition_response.json()["content"]
                    self.assertEqual("transition_1998", transition_payload["period_code"])
                    self.assertEqual("Актюбинск", transition_payload["display_name"])
                    self.assertTrue(transition_payload["short_description"])

                    independence_response = client.get("/api/city-content/independence_1991/Астана")
                    self.assertEqual(200, independence_response.status_code)
                    independence_payload = independence_response.json()["content"]
                    self.assertEqual("independence_1991", independence_payload["period_code"])
                    self.assertEqual("Целиноград", independence_payload["display_name"])
                    self.assertTrue(independence_payload["short_description"])

                    soviet_response = client.get("/api/city-content/soviet_1925/Кызылорда")
                    self.assertEqual(200, soviet_response.status_code)
                    soviet_payload = soviet_response.json()["content"]
                    self.assertEqual("soviet_1925", soviet_payload["period_code"])
                    self.assertEqual("Кзыл-Орда", soviet_payload["display_name"])
                    self.assertTrue(soviet_payload["short_description"])

                    imperial_response = client.get("/api/city-content/imperial_1731/Туркестан")
                    self.assertEqual(200, imperial_response.status_code)
                    imperial_payload = imperial_response.json()["content"]
                    self.assertEqual("imperial_1731", imperial_payload["period_code"])
                    self.assertEqual("Туркестан", imperial_payload["display_name"])
                    self.assertEqual("Ясы", imperial_payload["old_name"])
                    self.assertTrue(imperial_payload["short_description"])
                    self.assertEqual(3, len(imperial_payload["image_keys"]))

                    imperial_1868_response = client.get("/api/city-content/imperial_1868/Верный")
                    self.assertEqual(200, imperial_1868_response.status_code)
                    imperial_1868_payload = imperial_1868_response.json()["content"]
                    self.assertEqual("imperial_1868", imperial_1868_payload["period_code"])
                    self.assertEqual("Верный", imperial_1868_payload["display_name"])
                    self.assertEqual("Заилийское", imperial_1868_payload["old_name"])
                    self.assertTrue(imperial_1868_payload["short_description"])
                    self.assertEqual(3, len(imperial_1868_payload["image_keys"]))

                    missing_response = client.get(
                        "/api/city-content/imperial_1731/Алматы"
                    )
                    self.assertEqual(404, missing_response.status_code)
            finally:
                main.DB_PATH = original_db_path


if __name__ == "__main__":
    unittest.main()
