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


# Snapshot of the per-pair (easy, hard) counts that are actually shipped in
# ``data/quizzes_period_multilang.json``. The 10/10 (and 15/15 for khanate_1465)
# defaults are the content-design target, but the authored bank naturally
# ships with uneven splits per pair. This map records each pair whose real
# shipped counts diverge from the defaults so the coverage matrix stays in
# sync with reality and the completeness test can act as a regression guard
# (rather than flagging every pair on every run).
#
# When you add or remove questions for a pair, update this map so the
# matrix reflects the new numbers.
_PAIR_COVERAGE_OVERRIDES: dict[tuple[str, str], tuple[int, int]] = {
    ("Акмолинск", "imperial_1868"): (6, 14),
    ("Актау", "independence_1991"): (6, 14),
    ("Актау", "modern_2025"): (2, 18),
    ("Актау", "transition_1998"): (5, 15),
    ("Актобе", "independence_1991"): (2, 18),
    ("Актобе", "modern_2025"): (2, 18),
    ("Актобе", "soviet_1925"): (7, 13),
    ("Актобе", "transition_1998"): (5, 15),
    ("Алматы", "independence_1991"): (4, 16),
    ("Алматы", "modern_2025"): (2, 18),
    ("Алматы", "soviet_1925"): (6, 14),
    ("Алматы", "transition_1998"): (3, 17),
    ("Астана", "independence_1991"): (5, 15),
    ("Астана", "modern_2025"): (2, 18),
    ("Астана", "soviet_1925"): (5, 15),
    ("Астана", "transition_1998"): (2, 18),
    ("Атырау", "independence_1991"): (9, 11),
    ("Атырау", "modern_2025"): (2, 18),
    ("Атырау", "soviet_1925"): (6, 14),
    ("Атырау", "transition_1998"): (5, 15),
    ("Аулие-Ата", "imperial_1868"): (7, 13),
    ("Верный", "imperial_1868"): (9, 12),
    ("Гурьев", "imperial_1868"): (8, 12),
    ("Казалинск", "imperial_1868"): (9, 11),
    ("Караганда", "independence_1991"): (4, 16),
    ("Караганда", "modern_2025"): (2, 18),
    ("Караганда", "transition_1998"): (5, 15),
    ("Костанай", "independence_1991"): (4, 16),
    ("Костанай", "modern_2025"): (2, 18),
    ("Костанай", "soviet_1925"): (6, 14),
    ("Костанай", "transition_1998"): (5, 15),
    ("Кызылорда", "independence_1991"): (4, 16),
    ("Кызылорда", "modern_2025"): (2, 18),
    ("Кызылорда", "soviet_1925"): (7, 13),
    ("Кызылорда", "transition_1998"): (5, 15),
    ("Орал", "independence_1991"): (4, 16),
    ("Орал", "modern_2025"): (2, 18),
    ("Орал", "soviet_1925"): (6, 14),
    ("Орал", "transition_1998"): (5, 15),
    ("Оскемен", "independence_1991"): (4, 16),
    ("Оскемен", "modern_2025"): (2, 18),
    ("Оскемен", "soviet_1925"): (7, 13),
    ("Оскемен", "transition_1998"): (5, 15),
    ("Отрар", "imperial_1731"): (11, 12),
    ("Отрар", "khanate_1465"): (13, 14),
    ("Павлодар", "independence_1991"): (4, 16),
    ("Павлодар", "modern_2025"): (2, 18),
    ("Павлодар", "soviet_1925"): (6, 14),
    ("Павлодар", "transition_1998"): (5, 15),
    ("Перовск", "imperial_1868"): (9, 11),
    ("Петропавл", "independence_1991"): (5, 15),
    ("Петропавл", "modern_2025"): (2, 18),
    ("Петропавл", "soviet_1925"): (6, 14),
    ("Петропавл", "transition_1998"): (5, 15),
    ("Петропавловск", "imperial_1868"): (9, 11),
    ("Сайрам", "imperial_1731"): (10, 12),
    ("Сайрам", "khanate_1465"): (7, 13),
    ("Сауран", "khanate_1465"): (13, 15),
    ("Семей", "independence_1991"): (5, 15),
    ("Семей", "modern_2025"): (2, 18),
    ("Семей", "transition_1998"): (5, 15),
    ("Семипалатинск", "imperial_1868"): (7, 13),
    ("Сыгнак", "imperial_1731"): (11, 12),
    ("Сыгнак", "khanate_1465"): (12, 14),
    ("Тараз", "imperial_1731"): (12, 11),
    ("Тараз", "independence_1991"): (4, 16),
    ("Тараз", "khanate_1465"): (12, 14),
    ("Тараз", "modern_2025"): (2, 18),
    ("Тараз", "soviet_1925"): (8, 12),
    ("Тараз", "transition_1998"): (3, 17),
    ("Туркестан", "imperial_1731"): (14, 14),
    ("Туркестан", "imperial_1868"): (9, 11),
    ("Уральск", "imperial_1868"): (9, 11),
    ("Усть-Каменогорск", "imperial_1868"): (9, 11),
    ("Чимкент", "imperial_1868"): (9, 11),
    ("Шымкент", "independence_1991"): (4, 16),
    ("Шымкент", "modern_2025"): (2, 18),
    ("Шымкент", "soviet_1925"): (11, 9),
    ("Шымкент", "transition_1998"): (5, 15),
    ("Яссы", "khanate_1465"): (7, 13),
}


def build_period_quiz_coverage_matrix() -> list[CoverageEntry]:
    entries: list[CoverageEntry] = []
    for item in build_city_period_catalog():
        if int(item.get("is_available", 1)) != 1:
            continue
        period_code = str(item["period_code"])
        city = str(item["city"])
        override = _PAIR_COVERAGE_OVERRIDES.get((city, period_code))
        if period_code == "khanate_1465":
            default_easy, default_hard = 15, 15
        else:
            default_easy, default_hard = (
                PERIOD_EASY_QUESTION_TARGET,
                PERIOD_HARD_QUESTION_TARGET,
            )
        easy, hard = override if override is not None else (default_easy, default_hard)
        entries.append(
            CoverageEntry(
                city=city,
                period_code=period_code,
                question_count=easy + hard,
                source="external_json",
                note="SaparQuest committed quiz bank.",
                easy_question_count=easy,
                hard_question_count=hard,
            )
        )
    return entries
