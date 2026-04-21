from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from quiz_bank.constants import DEFAULT_DATA_PATH, PROJECT_ROOT
from quiz_bank.generator import export_quiz_bank, generate_quiz_bank
from quiz_bank.validation import build_review_report, validate_quiz_bank


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Сгенерировать и проверить статический банк вопросов.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_DATA_PATH,
        help="Куда сохранить итоговый JSON-файл с вопросами.",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=PROJECT_ROOT / "data" / "quizzes_ru_report.json",
        help="Куда сохранить JSON-отчёт по валидации.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    records = generate_quiz_bank()
    errors, warnings = validate_quiz_bank(records)
    report = build_review_report(records, errors, warnings)

    if errors:
        raise SystemExit(
            "Quiz bank generation failed:\n"
            + "\n".join(f"- {issue.city}: {issue.message}" for issue in errors)
        )

    export_path = export_quiz_bank(args.output)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Saved quiz bank to: {export_path}")
    print(f"Saved review report to: {args.report}")
    for city, count in report["counts_per_city"].items():
        print(f"- {city}: {count}")

    if warnings:
        print("\nWarnings:")
        for issue in warnings:
            print(f"- {issue.city}: {issue.message}")


if __name__ == "__main__":
    main()
