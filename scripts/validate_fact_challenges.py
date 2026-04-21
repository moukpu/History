from __future__ import annotations

import argparse
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from quiz_bank.constants import DEFAULT_FACT_CHALLENGE_DATA_PATH
from quiz_bank.fact_challenge_validation import (
    build_fact_challenge_report,
    load_fact_challenges_json,
    validate_fact_challenges,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Проверить seed-файл для period-aware fact challenge режима.",
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=DEFAULT_FACT_CHALLENGE_DATA_PATH,
        help="Путь к JSON-файлу с факт-челленджами.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    records = load_fact_challenges_json(args.input)
    errors, warnings = validate_fact_challenges(records)
    report = build_fact_challenge_report(records, errors, warnings)

    print(f"Всего записей: {report['total_records']}")
    print("Количество по периодам:")
    for period_code, count in report["counts_per_period"].items():
        print(f"- {period_code}: {count}")

    print("\nАктивные записи по периодам:")
    for period_code, count in report["active_counts_per_period"].items():
        print(f"- {period_code}: {count}")

    print(f"\nОшибки: {len(errors)}")
    for issue in errors:
        print(f"- {issue.city}/{issue.period_code} [{issue.field}]: {issue.message}")

    print(f"\nПредупреждения: {len(warnings)}")
    for issue in warnings:
        print(f"- {issue.city}/{issue.period_code} [{issue.field}]: {issue.message}")

    if report["missing_supported_pairs"]:
        print("\nНедостающие поддерживаемые пары:")
        for item in report["missing_supported_pairs"]:
            print(f"- {item['city']}|{item['period_code']}")

    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
