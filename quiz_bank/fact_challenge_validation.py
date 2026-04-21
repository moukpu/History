from __future__ import annotations

import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from .constants import (
    SUPPORTED_CITIES,
    TIMELINE_PERIOD_CODES,
    build_city_period_catalog,
    build_timeline_period_catalog,
)
from .fact_challenges import build_supported_fact_challenge_pairs
from .types import ContentValidationIssue
from .validation import normalize_text, similarity_score


def load_fact_challenges_json(path: Path | str) -> list[dict[str, Any]]:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError("JSON fact challenge bank must be a list of objects.")
    return data


def validate_fact_challenges(
    items: list[dict[str, Any]],
) -> tuple[list[ContentValidationIssue], list[ContentValidationIssue]]:
    city_set = set(SUPPORTED_CITIES)
    period_set = set(TIMELINE_PERIOD_CODES)
    available_pairs = {
        (item["city"], item["period_code"])
        for item in build_city_period_catalog()
        if int(item["is_available"]) == 1
    }
    supported_pairs = set(build_supported_fact_challenge_pairs())

    errors: list[ContentValidationIssue] = []
    warnings: list[ContentValidationIssue] = []
    seen_texts_by_scope: dict[tuple[str, str], dict[str, str]] = defaultdict(dict)
    active_counts = Counter()
    facts_by_period: dict[str, list[tuple[str, str]]] = defaultdict(list)

    for item in items:
        city = str(item.get("city", "")).strip()
        period_code = str(item.get("period_code", "")).strip()
        fact_text = str(item.get("fact_text", "")).strip()
        difficulty = item.get("difficulty")
        is_active = item.get("is_active", 1)
        scope = (city, period_code)

        if city not in city_set:
            errors.append(
                ContentValidationIssue(
                    level="error",
                    city=city,
                    period_code=period_code,
                    field="city",
                    message="Город отсутствует в утверждённом списке.",
                )
            )
            continue

        if period_code not in period_set:
            errors.append(
                ContentValidationIssue(
                    level="error",
                    city=city,
                    period_code=period_code,
                    field="period_code",
                    message="Период отсутствует в утверждённом списке.",
                )
            )
            continue

        if scope not in available_pairs:
            errors.append(
                ContentValidationIssue(
                    level="error",
                    city=city,
                    period_code=period_code,
                    field="city_period",
                    message="Пара город-период недоступна в текущем каталоге city_periods.",
                )
            )
            continue

        if not fact_text:
            errors.append(
                ContentValidationIssue(
                    level="error",
                    city=city,
                    period_code=period_code,
                    field="fact_text",
                    message="Поле fact_text не должно быть пустым.",
                )
            )
        elif len(fact_text) < 20:
            warnings.append(
                ContentValidationIssue(
                    level="warning",
                    city=city,
                    period_code=period_code,
                    field="fact_text",
                    message="Факт выглядит слишком коротким; стоит проверить, не слишком ли он общий.",
                )
            )

        if difficulty is not None and not str(difficulty).strip():
            errors.append(
                ContentValidationIssue(
                    level="error",
                    city=city,
                    period_code=period_code,
                    field="difficulty",
                    message="Если difficulty указан, он должен быть непустой строкой.",
                )
            )

        if is_active not in (0, 1, False, True):
            errors.append(
                ContentValidationIssue(
                    level="error",
                    city=city,
                    period_code=period_code,
                    field="is_active",
                    message="Поле is_active должно быть равно 0 или 1.",
                )
            )
            continue

        normalized_fact = normalize_text(fact_text)
        if normalized_fact in seen_texts_by_scope[scope]:
            errors.append(
                ContentValidationIssue(
                    level="error",
                    city=city,
                    period_code=period_code,
                    field="fact_text",
                    message=(
                        "Найден дубликат fact_text в пределах одной пары город-период: "
                        f"«{seen_texts_by_scope[scope][normalized_fact]}»."
                    ),
                )
            )
        else:
            seen_texts_by_scope[scope][normalized_fact] = fact_text

        if int(is_active) == 1:
            active_counts[scope] += 1
            if scope not in supported_pairs:
                errors.append(
                    ContentValidationIssue(
                        level="error",
                        city=city,
                        period_code=period_code,
                        field="is_active",
                        message=(
                            "Активный факт должен относиться к текущему поддерживаемому покрытию fact challenge режима."
                        ),
                    )
                )
            facts_by_period[period_code].append((city, fact_text))

    for period_code, entries in facts_by_period.items():
        for index, (left_city, left_text) in enumerate(entries):
            for right_city, right_text in entries[index + 1 :]:
                score = similarity_score(left_text, right_text)
                if score >= 0.95:
                    errors.append(
                        ContentValidationIssue(
                            level="error",
                            city=left_city,
                            period_code=period_code,
                            field="fact_text",
                            message=(
                                "Активные факты в одном периоде слишком похожи и могут быть неоднозначными: "
                                f"«{left_text}» / «{right_text}»."
                            ),
                        )
                    )
                elif score >= 0.88:
                    warnings.append(
                        ContentValidationIssue(
                            level="warning",
                            city=left_city,
                            period_code=period_code,
                            field="fact_text",
                            message=(
                                "Формулировки двух фактов в одном периоде заметно похожи; стоит проверить их на неоднозначность."
                            ),
                        )
                    )

    for city, period_code in build_supported_fact_challenge_pairs():
        if active_counts.get((city, period_code), 0) == 0:
            errors.append(
                ContentValidationIssue(
                    level="error",
                    city=city,
                    period_code=period_code,
                    field="coverage",
                    message="Для поддерживаемой пары город-период нет активного fact challenge.",
                )
            )

    for period in build_timeline_period_catalog():
        period_code = str(period["code"])
        if not any(
            pair_period == period_code and count > 0
            for (_city, pair_period), count in active_counts.items()
        ):
            errors.append(
                ContentValidationIssue(
                    level="error",
                    city="*",
                    period_code=period_code,
                    field="coverage",
                    message="В этом периоде нет ни одного активного fact challenge.",
                )
            )

    return errors, warnings


def build_fact_challenge_report(
    items: list[dict[str, Any]],
    errors: list[ContentValidationIssue],
    warnings: list[ContentValidationIssue],
) -> dict[str, Any]:
    counts_per_period = Counter()
    active_counts_per_period = Counter()
    counts_per_city_period = Counter()

    for item in items:
        city = str(item.get("city", "")).strip()
        period_code = str(item.get("period_code", "")).strip()
        pair = f"{city}|{period_code}"
        counts_per_period[period_code] += 1
        counts_per_city_period[pair] += 1
        if int(item.get("is_active", 1)) == 1:
            active_counts_per_period[period_code] += 1

    missing_supported_pairs = [
        {"city": city, "period_code": period_code}
        for city, period_code in build_supported_fact_challenge_pairs()
        if not any(
            str(item.get("city", "")).strip() == city
            and str(item.get("period_code", "")).strip() == period_code
            and int(item.get("is_active", 1)) == 1
            for item in items
        )
    ]

    return {
        "total_records": len(items),
        "counts_per_period": dict(sorted(counts_per_period.items())),
        "active_counts_per_period": dict(sorted(active_counts_per_period.items())),
        "counts_per_city_period": dict(sorted(counts_per_city_period.items())),
        "missing_supported_pairs": missing_supported_pairs,
        "error_count": len(errors),
        "warning_count": len(warnings),
    }
