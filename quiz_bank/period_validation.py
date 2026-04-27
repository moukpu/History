from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any

from .period_content import CoverageEntry, build_period_quiz_coverage_matrix
from .constants import QUIZ_DIFFICULTIES, SUPPORTED_CITIES
from .types import ValidationIssue
from .validation import normalize_text, validate_quiz_bank

DOUBTFUL_MARKERS = (
    "примерно",
    "предположительно",
    "вероятно",
    "по одной из версий",
    "часто считают",
    "иногда считают",
)

AMBIGUOUS_OPTION_MARKERS = (
    "все перечисленное",
    "все ответы верны",
    "несколько вариантов",
)


def _issue(
    level: str,
    city: str,
    period_code: str,
    question: str,
    message: str,
) -> ValidationIssue:
    return ValidationIssue(
        level=level,
        city=f"{city} [{period_code}]",
        question=question,
        message=message,
    )


def validate_period_quiz_bank(
    items: list[dict[str, Any]],
    coverage: list[CoverageEntry] | None = None,
) -> tuple[list[ValidationIssue], list[ValidationIssue]]:
    errors, warnings = validate_quiz_bank(items, approved_cities=SUPPORTED_CITIES)
    coverage_entries = coverage or build_period_quiz_coverage_matrix()
    coverage_map = {(entry.city, entry.period_code): entry for entry in coverage_entries}
    counts = Counter()
    difficulty_counts = Counter()

    for item in items:
        city = str(item.get("city", "")).strip()
        period_code = str(item.get("period_code", "")).strip()
        difficulty = str(item.get("difficulty", "easy")).strip() or "easy"
        question = str(item.get("question", "")).strip()
        fact = str(item.get("fact", "")).strip()
        options = [str(option).strip() for option in item.get("options", [])]
        pair = (city, period_code)
        counts[pair] += 1
        difficulty_counts[(city, period_code, difficulty)] += 1

        if pair not in coverage_map:
            errors.append(
                _issue(
                    "error",
                    city,
                    period_code,
                    question,
                    "Пара город-период отсутствует в матрице покрытия.",
                )
            )

        normalized_blob = f" {normalize_text(' '.join([question, fact, *options]))} "
        marker = next(
            (
                text
                for text in DOUBTFUL_MARKERS
                if f" {normalize_text(text)} " in normalized_blob
            ),
            None,
        )
        if marker is not None:
            errors.append(
                _issue(
                    "error",
                    city,
                    period_code,
                    question,
                    f"Найдена сомнительная формулировка: «{marker}».",
                )
            )

        option_marker = next(
            (
                text
                for text in AMBIGUOUS_OPTION_MARKERS
                if any(text in normalize_text(option) for option in options)
            ),
            None,
        )
        if option_marker is not None:
            errors.append(
                _issue(
                    "error",
                    city,
                    period_code,
                    question,
                    f"Недопустимый неоднозначный вариант ответа: «{option_marker}».",
                )
            )

        if len(question) < 12:
            warnings.append(
                _issue(
                    "warning",
                    city,
                    period_code,
                    question,
                    "Слишком короткий текст вопроса, стоит проверить формулировку.",
                )
            )

        if len(fact) < 12:
            warnings.append(
                _issue(
                    "warning",
                    city,
                    period_code,
                    question,
                    "Слишком короткое пояснение fact, стоит усилить образовательную ценность.",
                )
            )

    for entry in coverage_entries:
        actual = counts.get((entry.city, entry.period_code), 0)
        if actual != entry.question_count:
            errors.append(
                _issue(
                    "error",
                    entry.city,
                    entry.period_code,
                    "",
                    (
                        f"По матрице покрытия ожидается {entry.question_count} вопросов, "
                        f"фактически найдено {actual}."
                    ),
                )
            )
        easy_actual = difficulty_counts.get((entry.city, entry.period_code, "easy"), 0)
        if easy_actual != entry.easy_question_count:
            errors.append(
                _issue(
                    "error",
                    entry.city,
                    entry.period_code,
                    "",
                    (
                        f"Для difficulty=easy ожидается {entry.easy_question_count} вопросов, "
                        f"фактически найдено {easy_actual}."
                    ),
                )
            )
        hard_actual = difficulty_counts.get((entry.city, entry.period_code, "hard"), 0)
        if hard_actual != entry.hard_question_count:
            errors.append(
                _issue(
                    "error",
                    entry.city,
                    entry.period_code,
                    "",
                    (
                        f"Для difficulty=hard ожидается {entry.hard_question_count} вопросов, "
                        f"фактически найдено {hard_actual}."
                    ),
                )
            )

    errors = sorted(errors, key=lambda issue: (issue.city, issue.question, issue.message))
    warnings = sorted(warnings, key=lambda issue: (issue.city, issue.question, issue.message))
    return errors, warnings


def build_period_quiz_report(
    items: list[dict[str, Any]],
    errors: list[ValidationIssue],
    warnings: list[ValidationIssue],
    coverage: list[CoverageEntry] | None = None,
) -> dict[str, Any]:
    coverage_entries = coverage or build_period_quiz_coverage_matrix()
    coverage_map = {(entry.city, entry.period_code): entry for entry in coverage_entries}
    counts_by_period = Counter()
    counts_by_pair = Counter()
    counts_by_difficulty = Counter()
    counts_by_pair_difficulty = Counter()
    normalized_questions: dict[tuple[str, str], list[str]] = defaultdict(list)

    for item in items:
        city = str(item.get("city", "")).strip()
        period_code = str(item.get("period_code", "")).strip()
        difficulty = str(item.get("difficulty", "easy")).strip() or "easy"
        question = str(item.get("question", "")).strip()
        counts_by_period[period_code] += 1
        counts_by_pair[(city, period_code)] += 1
        counts_by_difficulty[difficulty] += 1
        counts_by_pair_difficulty[(city, period_code, difficulty)] += 1
        normalized_questions[(city, period_code)].append(normalize_text(question))

    for difficulty in QUIZ_DIFFICULTIES:
        counts_by_difficulty.setdefault(difficulty, 0)

    for entry in coverage_entries:
        for difficulty in QUIZ_DIFFICULTIES:
            counts_by_pair_difficulty.setdefault((entry.city, entry.period_code, difficulty), 0)

    missing_pairs = []
    for entry in coverage_entries:
        actual = counts_by_pair.get((entry.city, entry.period_code), 0)
        if actual < entry.question_count:
            missing_pairs.append(
                {
                    "city": entry.city,
                    "period_code": entry.period_code,
                    "expected_count": entry.question_count,
                    "actual_count": actual,
                    "missing_count": entry.question_count - actual,
                }
            )

    unexpected_pairs = []
    for city, period_code in sorted(counts_by_pair):
        if (city, period_code) not in coverage_map:
            unexpected_pairs.append(
                {
                    "city": city,
                    "period_code": period_code,
                    "actual_count": counts_by_pair[(city, period_code)],
                }
            )

    exact_duplicate_count = 0
    for questions in normalized_questions.values():
        question_counts = Counter(questions)
        exact_duplicate_count += sum(count - 1 for count in question_counts.values() if count > 1)

    difficulty_mismatches = []
    for entry in coverage_entries:
        easy_actual = counts_by_pair_difficulty.get((entry.city, entry.period_code, "easy"), 0)
        hard_actual = counts_by_pair_difficulty.get((entry.city, entry.period_code, "hard"), 0)
        if easy_actual != entry.easy_question_count or hard_actual != entry.hard_question_count:
            difficulty_mismatches.append(
                {
                    "city": entry.city,
                    "period_code": entry.period_code,
                    "expected_easy": entry.easy_question_count,
                    "actual_easy": easy_actual,
                    "expected_hard": entry.hard_question_count,
                    "actual_hard": hard_actual,
                }
            )

    return {
        "total_questions": len(items),
        "coverage_pairs_total": len(coverage_entries),
        "counts_per_period": dict(sorted(counts_by_period.items())),
        "counts_per_difficulty": dict(sorted(counts_by_difficulty.items())),
        "counts_per_city_period": {
            f"{city}|{period_code}": count
            for (city, period_code), count in sorted(counts_by_pair.items())
        },
        "counts_per_city_period_difficulty": {
            f"{city}|{period_code}|{difficulty}": count
            for (city, period_code, difficulty), count in sorted(counts_by_pair_difficulty.items())
        },
        "missing_pairs": missing_pairs,
        "unexpected_pairs": unexpected_pairs,
        "difficulty_mismatches": difficulty_mismatches,
        "exact_duplicate_count": exact_duplicate_count,
        "near_duplicate_warning_count": len(
            [issue for issue in warnings if "похожая формулировка" in issue.message]
        ),
        "errors": [issue.to_dict() for issue in errors],
        "warnings": [issue.to_dict() for issue in warnings],
    }
