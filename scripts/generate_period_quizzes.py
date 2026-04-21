from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from quiz_bank.constants import DEFAULT_PERIOD_DATA_PATH
from quiz_bank.period_content import generate_period_quiz_bank
from quiz_bank.period_validation import build_period_quiz_report, validate_period_quiz_bank


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Сгенерировать первый period-aware банк вопросов по истории и городам.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_PERIOD_DATA_PATH,
        help="Куда сохранить JSON-файл с period-aware вопросами.",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=PROJECT_ROOT / "data" / "quizzes_period_ru_report.json",
        help="Куда сохранить JSON-отчёт по покрытию и валидации.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    records = generate_period_quiz_bank()
    errors, warnings = validate_period_quiz_bank(records)
    report = build_period_quiz_report(records, errors, warnings)

    if errors:
        raise SystemExit(
            "Поколение period-aware банка остановлено из-за ошибок:\n"
            + "\n".join(f"- {issue.city}: {issue.message}" for issue in errors)
        )

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(records, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Сохранён period-aware банк: {args.output}")
    print(f"Сохранён отчёт: {args.report}")
    print(f"Всего вопросов: {len(records)}")
    print("Количество по периодам:")
    for period_code, count in report["counts_per_period"].items():
        print(f"- {period_code}: {count}")

    if warnings:
        print("\nПредупреждения:")
        for issue in warnings:
            print(f"- {issue.city}: {issue.message}")


if __name__ == "__main__":
    main()
