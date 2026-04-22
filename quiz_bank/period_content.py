from __future__ import annotations

from dataclasses import dataclass

from .constants import (
    PERIOD_EASY_QUESTION_TARGET,
    PERIOD_HARD_QUESTION_TARGET,
    PERIOD_TOTAL_QUESTION_TARGET,
    build_city_period_catalog,
)


@dataclass(frozen=True)
class CoverageEntry:
    city: str
    period_code: str
    question_count: int
    source: str
    note: str
    easy_question_count: int = PERIOD_EASY_QUESTION_TARGET
    hard_question_count: int = PERIOD_HARD_QUESTION_TARGET


def build_period_quiz_coverage_matrix() -> list[CoverageEntry]:
    return [
        CoverageEntry(
            city=str(item["city"]),
            period_code=str(item["period_code"]),
            question_count=PERIOD_TOTAL_QUESTION_TARGET,
            source="external_json",
            note="SaparQuest committed quiz bank.",
            easy_question_count=PERIOD_EASY_QUESTION_TARGET,
            hard_question_count=PERIOD_HARD_QUESTION_TARGET,
        )
        for item in build_city_period_catalog()
        if int(item.get("is_available", 1)) == 1
    ]
