import json
import re
from collections import Counter, defaultdict
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

from .constants import (
    APPROVED_CITIES,
    CITY_QUESTION_TARGET,
    DEFAULT_PERIOD_CODE,
    QUIZ_DIFFICULTIES,
    TIMELINE_PERIOD_CODES,
)
from .types import ValidationIssue

_SPACE_RE = re.compile(r"\s+")
_PUNCT_RE = re.compile(r"[^\w\s]+", flags=re.UNICODE)


def load_quiz_bank_json(path: Path | str) -> list[dict[str, Any]]:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError("JSON quiz bank must be a list of quiz objects.")
    return data


def normalize_text(value: str) -> str:
    lowered = value.casefold().strip()
    lowered = _PUNCT_RE.sub(" ", lowered)
    lowered = _SPACE_RE.sub(" ", lowered)
    return lowered


def similarity_score(left: str, right: str) -> float:
    left_normalized = normalize_text(left)
    right_normalized = normalize_text(right)
    if not left_normalized or not right_normalized:
        return 0.0
    return SequenceMatcher(a=left_normalized, b=right_normalized).ratio()


def validate_quiz_bank(
    items: list[dict[str, Any]],
    approved_cities: list[str] | None = None,
) -> tuple[list[ValidationIssue], list[ValidationIssue]]:
    cities = approved_cities or APPROVED_CITIES
    city_set = set(cities)
    period_set = set(TIMELINE_PERIOD_CODES)
    period_aware = any("period_code" in item for item in items)
    errors: list[ValidationIssue] = []
    warnings: list[ValidationIssue] = []
    counts = Counter()
    seen_questions: dict[tuple[str, str], dict[str, str]] = defaultdict(dict)

    for item in items:
        city = str(item.get("city", "")).strip()
        period_code = str(item.get("period_code", DEFAULT_PERIOD_CODE)).strip()
        difficulty = str(item.get("difficulty", "easy")).strip() or "easy"
        question = str(item.get("question", "")).strip()
        options = item.get("options")
        correct_index = item.get("correct_index")
        fact = str(item.get("fact", "")).strip()

        if city not in city_set:
            errors.append(
                ValidationIssue(
                    level="error",
                    city=city,
                    question=question,
                    message="Город отсутствует в утверждённом списке.",
                )
            )
            continue

        if period_aware and period_code not in period_set:
            errors.append(
                ValidationIssue(
                    level="error",
                    city=city,
                    question=question,
                    message="Период отсутствует в утверждённом списке.",
                )
            )
            continue

        if difficulty not in QUIZ_DIFFICULTIES:
            errors.append(
                ValidationIssue(
                    level="error",
                    city=city,
                    question=question,
                    message="Поле difficulty должно быть 'easy' или 'hard'.",
                )
            )

        counts[(city, period_code)] += 1

        if not question:
            errors.append(
                ValidationIssue(
                    level="error",
                    city=city,
                    question=question,
                    message="Пустой текст вопроса.",
                )
            )

        if not isinstance(options, list) or len(options) != 4:
            errors.append(
                ValidationIssue(
                    level="error",
                    city=city,
                    question=question,
                    message="Поле options должно содержать ровно 4 варианта ответа.",
                )
            )
            continue

        normalized_options = [normalize_text(str(option)) for option in options]
        if any(not option.strip() for option in map(str, options)):
            errors.append(
                ValidationIssue(
                    level="error",
                    city=city,
                    question=question,
                    message="Один из вариантов ответа пустой.",
                )
            )

        if len(set(normalized_options)) != 4:
            errors.append(
                ValidationIssue(
                    level="error",
                    city=city,
                    question=question,
                    message="Варианты ответа должны быть уникальными.",
                )
            )

        if not isinstance(correct_index, int) or correct_index not in range(4):
            errors.append(
                ValidationIssue(
                    level="error",
                    city=city,
                    question=question,
                    message="correct_index должен быть целым числом от 0 до 3.",
                )
            )
        elif normalized_options.count(normalized_options[correct_index]) > 1:
            errors.append(
                ValidationIssue(
                    level="error",
                    city=city,
                    question=question,
                    message="Правильный ответ дублируется среди вариантов.",
                )
            )

        if not fact:
            errors.append(
                ValidationIssue(
                    level="error",
                    city=city,
                    question=question,
                    message="Поле fact не должно быть пустым.",
                )
            )

        question_key = normalize_text(question)
        scope = (city, period_code)
        if question_key in seen_questions[scope]:
            errors.append(
                ValidationIssue(
                    level="error",
                    city=city,
                    question=question,
                    message=(
                        "Найден дубликат вопроса в пределах одного города и периода: "
                        f"«{seen_questions[scope][question_key]}»."
                    ),
                )
            )
        else:
            seen_questions[scope][question_key] = question

    if period_aware:
        pass
    else:
        for city in cities:
            count = counts.get((city, DEFAULT_PERIOD_CODE), 0)
            if count != CITY_QUESTION_TARGET:
                errors.append(
                    ValidationIssue(
                        level="error",
                        city=city,
                        question="",
                        message=(
                            f"Для города должно быть ровно {CITY_QUESTION_TARGET} вопросов, "
                            f"сейчас найдено {count}."
                        ),
                    )
                )

        if len(items) != len(cities) * CITY_QUESTION_TARGET:
            errors.append(
                ValidationIssue(
                    level="error",
                    city="*",
                    question="",
                    message=(
                        "Общее число вопросов должно быть "
                        f"{len(cities) * CITY_QUESTION_TARGET}, сейчас {len(items)}."
                    ),
                )
            )

    questions_by_scope: dict[tuple[str, str], list[str]] = defaultdict(list)
    for item in items:
        city = str(item.get("city", "")).strip()
        period_code = str(item.get("period_code", DEFAULT_PERIOD_CODE)).strip()
        question = str(item.get("question", "")).strip()
        if city and question:
            questions_by_scope[(city, period_code)].append(question)

    for (city, _period_code), questions in questions_by_scope.items():
        for index, left in enumerate(questions):
            for right in questions[index + 1 :]:
                score = similarity_score(left, right)
                if score >= 0.94:
                    warnings.append(
                        ValidationIssue(
                            level="warning",
                            city=city,
                            question=left,
                            message=(
                                "Возможно слишком похожая формулировка вопроса: "
                                f"«{right}» (similarity={score:.2f})."
                            ),
                        )
                    )

    return errors, warnings


def build_review_report(
    items: list[dict[str, Any]],
    errors: list[ValidationIssue],
    warnings: list[ValidationIssue],
) -> dict[str, Any]:
    period_aware = any("period_code" in item for item in items)
    report: dict[str, Any] = {
        "total_questions": len(items),
        "errors": [issue.to_dict() for issue in errors],
        "warnings": [issue.to_dict() for issue in warnings],
    }
    if period_aware:
        counts = Counter(
            f"{item['city']}|{item.get('period_code', DEFAULT_PERIOD_CODE)}"
            for item in items
        )
        report["counts_per_city_period"] = dict(sorted(counts.items()))
        difficulty_counts = Counter(
            f"{item['city']}|{item.get('period_code', DEFAULT_PERIOD_CODE)}|"
            f"{item.get('difficulty', 'easy') or 'easy'}"
            for item in items
        )
        report["counts_per_city_period_difficulty"] = dict(sorted(difficulty_counts.items()))
        report["counts_per_difficulty"] = dict(
            sorted(
                Counter(
                    str(item.get("difficulty", "easy")).strip() or "easy"
                    for item in items
                ).items()
            )
        )
    else:
        counts = Counter(item["city"] for item in items)
        report["counts_per_city"] = dict(sorted(counts.items()))
        report["counts_per_difficulty"] = dict(
            sorted(
                Counter(
                    str(item.get("difficulty", "easy")).strip() or "easy"
                    for item in items
                ).items()
            )
        )
    return report
