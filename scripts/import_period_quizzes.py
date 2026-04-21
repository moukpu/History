from __future__ import annotations

import argparse
import os
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from quiz_bank.constants import DEFAULT_PERIOD_DATA_PATH
from quiz_bank.database import replace_quiz_bank
from quiz_bank.period_validation import validate_period_quiz_bank
from quiz_bank.validation import load_quiz_bank_json


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Импортировать period-aware банк вопросов в SQLite. "
            "Импорт управляемый: существующие записи quizzes заменяются целиком."
        ),
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=DEFAULT_PERIOD_DATA_PATH,
        help="Путь к JSON-файлу с period-aware вопросами.",
    )
    parser.add_argument(
        "--db",
        default=os.getenv("DB_PATH", "quizzes.db"),
        help="Путь к SQLite базе данных.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    records = load_quiz_bank_json(args.input)
    errors, warnings = validate_period_quiz_bank(records)

    if errors:
        raise SystemExit(
            "Импорт period-aware банка остановлен из-за ошибок:\n"
            + "\n".join(f"- {issue.city}: {issue.message}" for issue in errors)
        )

    replace_quiz_bank(args.db, records)
    print(f"Импортировано {len(records)} period-aware вопросов в {args.db}")

    if warnings:
        print("\nПредупреждения:")
        for issue in warnings:
            print(f"- {issue.city}: {issue.message}")


if __name__ == "__main__":
    main()
