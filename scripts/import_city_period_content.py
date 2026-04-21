from __future__ import annotations

import argparse
import os
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from quiz_bank.city_content_validation import (
    load_city_period_content_json,
    validate_city_period_content,
)
from quiz_bank.constants import DEFAULT_CITY_PERIOD_CONTENT_PATH
from quiz_bank.database import replace_city_period_content


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Импортировать city period content в SQLite. "
            "Импорт управляемый: содержимое city_period_content заменяется целиком."
        ),
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=DEFAULT_CITY_PERIOD_CONTENT_PATH,
        help="Путь к JSON-файлу с city period content.",
    )
    parser.add_argument(
        "--db",
        default=os.getenv("DB_PATH", "quizzes.db"),
        help="Путь к SQLite базе данных.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    records = load_city_period_content_json(args.input)
    errors, warnings = validate_city_period_content(records)

    if errors:
        raise SystemExit(
            "Импорт city period content остановлен из-за ошибок:\n"
            + "\n".join(
                f"- {issue.city}/{issue.period_code} [{issue.field}]: {issue.message}"
                for issue in errors
            )
        )

    replace_city_period_content(args.db, records)
    print(f"Импортировано {len(records)} записей city period content в {args.db}")

    if warnings:
        print("\nПредупреждения:")
        for issue in warnings:
            print(f"- {issue.city}/{issue.period_code} [{issue.field}]: {issue.message}")


if __name__ == "__main__":
    main()
