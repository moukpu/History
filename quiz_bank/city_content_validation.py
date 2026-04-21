from __future__ import annotations

import json
from collections import Counter
from pathlib import Path
from typing import Any

from .city_content import build_supported_city_content_pairs
from .constants import SUPPORTED_CITIES, TIMELINE_PERIOD_CODES, build_city_period_catalog
from .types import ContentValidationIssue
from .validation import normalize_text


def load_city_period_content_json(path: Path | str) -> list[dict[str, Any]]:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError("JSON city period content must be a list of objects.")
    return data


def validate_city_period_content(
    items: list[dict[str, Any]],
) -> tuple[list[ContentValidationIssue], list[ContentValidationIssue]]:
    city_set = set(SUPPORTED_CITIES)
    period_set = set(TIMELINE_PERIOD_CODES)
    available_pairs = {
        (item["city"], item["period_code"])
        for item in build_city_period_catalog()
        if int(item["is_available"]) == 1
    }
    supported_quiz_pairs = set(build_supported_city_content_pairs())

    errors: list[ContentValidationIssue] = []
    warnings: list[ContentValidationIssue] = []
    seen_pairs: set[tuple[str, str]] = set()
    counts = Counter()

    for item in items:
        city = str(item.get("city", "")).strip()
        period_code = str(item.get("period_code", "")).strip()
        pair = (city, period_code)
        counts[pair] += 1

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

        if pair not in available_pairs:
            errors.append(
                ContentValidationIssue(
                    level="error",
                    city=city,
                    period_code=period_code,
                    field="city_period",
                    message="Пара город-период не найдена среди доступных city_periods.",
                )
            )
            continue

        if pair in seen_pairs:
            errors.append(
                ContentValidationIssue(
                    level="error",
                    city=city,
                    period_code=period_code,
                    field="city_period",
                    message="Найден дубликат записи для пары город-период.",
                )
            )
        else:
            seen_pairs.add(pair)

        display_name = str(item.get("display_name", "")).strip()
        short_description = str(item.get("short_description", "")).strip()
        history_summary = str(item.get("history_summary", "")).strip()
        interesting_fact = str(item.get("interesting_fact", "")).strip()

        for field_name, value in (
            ("display_name", display_name),
            ("short_description", short_description),
            ("history_summary", history_summary),
            ("interesting_fact", interesting_fact),
        ):
            if not value:
                errors.append(
                    ContentValidationIssue(
                        level="error",
                        city=city,
                        period_code=period_code,
                        field=field_name,
                        message="Обязательное текстовое поле не должно быть пустым.",
                    )
                )

        for field_name in ("subtitle", "old_name", "importance_reason"):
            value = item.get(field_name)
            if value is not None and not str(value).strip():
                errors.append(
                    ContentValidationIssue(
                        level="error",
                        city=city,
                        period_code=period_code,
                        field=field_name,
                        message="Необязательное поле должно быть либо null, либо непустой строкой.",
                    )
                )

        image_keys = item.get("image_keys")
        if image_keys is not None:
            if not isinstance(image_keys, list):
                errors.append(
                    ContentValidationIssue(
                        level="error",
                        city=city,
                        period_code=period_code,
                        field="image_keys",
                        message="image_keys должно быть массивом строк или null.",
                    )
                )
            else:
                normalized_keys = [str(value).strip() for value in image_keys]
                if any(not value for value in normalized_keys):
                    errors.append(
                        ContentValidationIssue(
                            level="error",
                            city=city,
                            period_code=period_code,
                            field="image_keys",
                            message="Ключи изображений не должны быть пустыми.",
                        )
                    )
                if len(set(normalized_keys)) != len(normalized_keys):
                    errors.append(
                        ContentValidationIssue(
                            level="error",
                            city=city,
                            period_code=period_code,
                            field="image_keys",
                            message="Ключи изображений должны быть уникальными в рамках записи.",
                        )
                    )

        for flag_name in ("quiz_available", "fact_challenge_available"):
            value = item.get(flag_name)
            if value not in (0, 1, False, True):
                errors.append(
                    ContentValidationIssue(
                        level="error",
                        city=city,
                        period_code=period_code,
                        field=flag_name,
                        message="Флаг должен быть равен 0 или 1.",
                    )
                )

        if int(item.get("quiz_available", 1)) == 1 and pair not in supported_quiz_pairs:
            errors.append(
                ContentValidationIssue(
                    level="error",
                    city=city,
                    period_code=period_code,
                    field="quiz_available",
                    message=(
                        "Пара отмечена как quiz_available, но отсутствует в текущем period-aware покрытии викторин."
                    ),
                )
            )

        if short_description and history_summary:
            if normalize_text(short_description) == normalize_text(history_summary):
                warnings.append(
                    ContentValidationIssue(
                        level="warning",
                        city=city,
                        period_code=period_code,
                        field="history_summary",
                        message=(
                            "history_summary почти полностью совпадает с short_description; "
                            "лучше добавить чуть больше контекста."
                        ),
                    )
                )

    missing_supported_pairs = [
        {"city": city, "period_code": period_code}
        for city, period_code in build_supported_city_content_pairs()
        if (city, period_code) not in seen_pairs
    ]
    for item in missing_supported_pairs:
        errors.append(
            ContentValidationIssue(
                level="error",
                city=item["city"],
                period_code=item["period_code"],
                field="coverage",
                message="Для поддерживаемой пары город-период нет записи city_period_content.",
            )
        )

    return errors, warnings


def build_city_period_content_report(
    items: list[dict[str, Any]],
    errors: list[ContentValidationIssue],
    warnings: list[ContentValidationIssue],
) -> dict[str, Any]:
    counts_per_period = Counter()
    counts_per_city_period = Counter()
    duplicate_pairs: list[str] = []

    pair_counts = Counter(
        (str(item.get("city", "")).strip(), str(item.get("period_code", "")).strip())
        for item in items
    )

    for (city, period_code), count in sorted(pair_counts.items()):
        counts_per_period[period_code] += count
        counts_per_city_period[f"{city}|{period_code}"] = count
        if count > 1:
            duplicate_pairs.append(f"{city}|{period_code}")

    available_pairs = [
        {"city": city, "period_code": period_code}
        for city, period_code in build_supported_city_content_pairs()
        if pair_counts.get((city, period_code), 0) == 0
    ]

    return {
        "total_records": len(items),
        "counts_per_period": dict(sorted(counts_per_period.items())),
        "counts_per_city_period": dict(sorted(counts_per_city_period.items())),
        "missing_supported_pairs": available_pairs,
        "duplicate_pair_count": len(duplicate_pairs),
        "duplicate_pairs": duplicate_pairs,
        "error_count": len(errors),
        "warning_count": len(warnings),
    }
