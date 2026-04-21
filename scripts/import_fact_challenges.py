from __future__ import annotations

import argparse
import os
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from quiz_bank.constants import DEFAULT_FACT_CHALLENGE_DATA_PATH
from quiz_bank.database import replace_fact_challenges
from quiz_bank.fact_challenge_validation import (
    load_fact_challenges_json,
    validate_fact_challenges,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Импортировать fact challenges в SQLite. "
            "Импорт управляемый: таблица fact_challenges заменяется целиком."
        ),
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=DEFAULT_FACT_CHALLENGE_DATA_PATH,
        help="Путь к JSON-файлу с факт-челленджами.",
    )
    parser.add_argument(
        "--db",
        default=os.getenv("DB_PATH", "quizzes.db"),
        help="Путь к SQLite базе данных.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    records = load_fact_challenges_json(args.input)
    errors, warnings = validate_fact_challenges(records)

    if errors:
        raise SystemExit(
            "Импорт fact challenges остановлен из-за ошибок:\n"
            + "\n".join(
                f"- {issue.city}/{issue.period_code} [{issue.field}]: {issue.message}"
                for issue in errors
            )
        )

    replace_fact_challenges(args.db, records)
    print(f"Импортировано {len(records)} fact challenges в {args.db}")

    if warnings:
        print("\nПредупреждения:")
        for issue in warnings:
            print(f"- {issue.city}/{issue.period_code} [{issue.field}]: {issue.message}")


if __name__ == "__main__":
    main()
