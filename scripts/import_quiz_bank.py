from __future__ import annotations

import argparse
import os
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from quiz_bank.constants import DEFAULT_DATA_PATH
from quiz_bank.database import replace_quiz_bank
from quiz_bank.validation import load_quiz_bank_json, validate_quiz_bank


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Импортировать валидный JSON-банк вопросов в SQLite.",
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=DEFAULT_DATA_PATH,
        help="Путь к JSON-файлу с вопросами.",
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
    errors, warnings = validate_quiz_bank(records)

    if errors:
        raise SystemExit(
            "Quiz bank import stopped because of validation errors:\n"
            + "\n".join(f"- {issue.city}: {issue.message}" for issue in errors)
        )

    replace_quiz_bank(args.db, records)
    print(f"Imported {len(records)} quiz questions into {args.db}")

    if warnings:
        print("\nWarnings:")
        for issue in warnings:
            print(f"- {issue.city}: {issue.message}")


if __name__ == "__main__":
    main()
