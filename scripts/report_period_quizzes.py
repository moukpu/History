from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from quiz_bank.constants import DEFAULT_PERIOD_DATA_PATH
from quiz_bank.period_validation import build_period_quiz_report, validate_period_quiz_bank
from quiz_bank.validation import load_quiz_bank_json


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Показать сводку по period-aware банку вопросов и, при необходимости, по live DB.",
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=DEFAULT_PERIOD_DATA_PATH,
        help="Путь к JSON-файлу с period-aware вопросами.",
    )
    parser.add_argument(
        "--db",
        default=None,
        help="Необязательный путь к SQLite базе для сравнения с seed-файлом.",
    )
    return parser.parse_args()


def _print_db_summary(db_path: str) -> None:
    connection = sqlite3.connect(db_path)
    try:
        period_rows = connection.execute(
            """
            SELECT period_code, COUNT(*) AS quiz_count
            FROM quizzes
            GROUP BY period_code
            ORDER BY period_code
            """
        ).fetchall()
        pair_rows = connection.execute(
            """
            SELECT city, period_code, COUNT(*) AS quiz_count
            FROM quizzes
            GROUP BY city, period_code
            ORDER BY period_code, city
            """
        ).fetchall()
    finally:
        connection.close()

    print(f"\nСводка по базе {db_path}:")
    print("Количество по периодам:")
    for period_code, count in period_rows:
        print(f"- {period_code}: {count}")

    print("\nКоличество по парам город-период:")
    for city, period_code, count in pair_rows:
        print(f"- {city}|{period_code}: {count}")


def main() -> None:
    args = parse_args()
    records = load_quiz_bank_json(args.input)
    errors, warnings = validate_period_quiz_bank(records)
    report = build_period_quiz_report(records, errors, warnings)

    print(f"Всего вопросов в seed-файле: {report['total_questions']}")
    print("Количество по периодам:")
    for period_code, count in report["counts_per_period"].items():
        print(f"- {period_code}: {count}")

    print("\nКоличество по парам город-период:")
    for pair, count in report["counts_per_city_period"].items():
        print(f"- {pair}: {count}")

    print(f"\nТочных дубликатов: {report['exact_duplicate_count']}")
    print(f"Предупреждений о близких формулировках: {report['near_duplicate_warning_count']}")
    print(f"Ошибок валидации: {len(errors)}")
    print(f"Предупреждений валидации: {len(warnings)}")

    if report["missing_pairs"]:
        print("\nНедостающие пары покрытия:")
        for item in report["missing_pairs"]:
            print(
                f"- {item['city']}|{item['period_code']}: "
                f"ожидалось {item['expected_count']}, есть {item['actual_count']}"
            )

    if report["unexpected_pairs"]:
        print("\nНеожиданные пары:")
        for item in report["unexpected_pairs"]:
            print(f"- {item['city']}|{item['period_code']}: {item['actual_count']}")

    if args.db:
        _print_db_summary(args.db)


if __name__ == "__main__":
    main()
