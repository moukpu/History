from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from quiz_bank.constants import DEFAULT_FACT_CHALLENGE_DATA_PATH
from quiz_bank.fact_challenge_validation import (
    build_fact_challenge_report,
    validate_fact_challenges,
)
from quiz_bank.fact_challenges import build_fact_challenge_seed


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Сгенерировать seed-файл для period-aware режима fact challenge.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_FACT_CHALLENGE_DATA_PATH,
        help="Куда сохранить JSON-файл с факт-челленджами.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    records = build_fact_challenge_seed()
    errors, warnings = validate_fact_challenges(records)
    report = build_fact_challenge_report(records, errors, warnings)

    if errors:
        raise SystemExit(
            "Генерация fact challenges остановлена из-за ошибок:\n"
            + "\n".join(
                f"- {issue.city}/{issue.period_code} [{issue.field}]: {issue.message}"
                for issue in errors
            )
        )

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(records, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Сохранён fact challenge seed: {args.output}")
    print(f"Всего записей: {report['total_records']}")
    print("Активные записи по периодам:")
    for period_code, count in report["active_counts_per_period"].items():
        print(f"- {period_code}: {count}")

    if warnings:
        print("\nПредупреждения:")
        for issue in warnings:
            print(f"- {issue.city}/{issue.period_code} [{issue.field}]: {issue.message}")


if __name__ == "__main__":
    main()
