from __future__ import annotations

import argparse
import json
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
        description="Проверить period-aware JSON-банк вопросов.",
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=DEFAULT_PERIOD_DATA_PATH,
        help="Путь к JSON-файлу с period-aware вопросами.",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=None,
        help="Необязательный путь, куда сохранить JSON-отчёт.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    records = load_quiz_bank_json(args.input)
    errors, warnings = validate_period_quiz_bank(records)
    report = build_period_quiz_report(records, errors, warnings)

    print(f"Всего вопросов: {report['total_questions']}")
    print("Количество по периодам:")
    for period_code, count in report["counts_per_period"].items():
        print(f"- {period_code}: {count}")

    print("\nКоличество по парам город-период:")
    for pair, count in report["counts_per_city_period"].items():
        print(f"- {pair}: {count}")

    print(f"\nОшибки: {len(errors)}")
    for issue in errors:
        print(f"- {issue.city}: {issue.message}")

    print(f"\nПредупреждения: {len(warnings)}")
    for issue in warnings:
        print(f"- {issue.city}: {issue.message}")

    if report["missing_pairs"]:
        print("\nНедостающие пары покрытия:")
        for item in report["missing_pairs"]:
            print(
                f"- {item['city']}|{item['period_code']}: "
                f"ожидалось {item['expected_count']}, есть {item['actual_count']}"
            )

    if args.report is not None:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(
            json.dumps(report, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"\nJSON-отчёт сохранён: {args.report}")

    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
