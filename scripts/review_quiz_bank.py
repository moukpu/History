from __future__ import annotations

import argparse
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from quiz_bank.constants import DEFAULT_DATA_PATH
from quiz_bank.validation import build_review_report, load_quiz_bank_json, validate_quiz_bank


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Показать сводку по качеству статического банка вопросов.",
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=DEFAULT_DATA_PATH,
        help="Путь к JSON-файлу с вопросами.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    records = load_quiz_bank_json(args.input)
    errors, warnings = validate_quiz_bank(records)
    report = build_review_report(records, errors, warnings)

    print(f"Всего вопросов: {report['total_questions']}")
    print("Количество по городам:")
    for city, count in report["counts_per_city"].items():
        print(f"- {city}: {count}")

    print(f"\nОшибки: {len(errors)}")
    for issue in errors:
        print(f"- {issue.city}: {issue.message}")

    print(f"\nПредупреждения: {len(warnings)}")
    for issue in warnings:
        print(f"- {issue.city}: {issue.message}")


if __name__ == "__main__":
    main()
