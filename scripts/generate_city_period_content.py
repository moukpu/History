from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from quiz_bank.city_content import build_city_period_content_seed
from quiz_bank.city_content_validation import (
    build_city_period_content_report,
    validate_city_period_content,
)
from quiz_bank.constants import DEFAULT_CITY_PERIOD_CONTENT_PATH


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Сгенерировать period-aware контент для карточек городов.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_CITY_PERIOD_CONTENT_PATH,
        help="Куда сохранить JSON-файл с city period content.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    records = build_city_period_content_seed()
    errors, warnings = validate_city_period_content(records)
    report = build_city_period_content_report(records, errors, warnings)

    if errors:
        raise SystemExit(
            "Генерация city period content остановлена из-за ошибок:\n"
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

    print(f"Сохранён city period content: {args.output}")
    print(f"Всего записей: {report['total_records']}")
    print("Количество по периодам:")
    for period_code, count in report["counts_per_period"].items():
        print(f"- {period_code}: {count}")

    if warnings:
        print("\nПредупреждения:")
        for issue in warnings:
            print(f"- {issue.city}/{issue.period_code} [{issue.field}]: {issue.message}")


if __name__ == "__main__":
    main()
