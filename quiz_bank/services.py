import math
import json
import random
import sqlite3
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException

from .api_models import (
    AchievementCatalogItem,
    AchievementCatalogResponse,
    AppBootstrapCityItem,
    AppBootstrapPlayerSummary,
    AppBootstrapQuestSummary,
    AppBootstrapResponse,
    CityContentItem,
    CityContentResponse,
    CityContentSummariesResponse,
    CityContentSummaryItem,
    CompleteMinigameRequest,
    CompleteMinigameResponse,
    FactChallengeProgressResponse,
    FactChallengePeriodProgressItem,
    MinigameGateInfo,
    MapInitialResponse,
    MapStateCityItem,
    MapStatePeriodSummary,
    MapStateResponse,
    PlayerAchievementsResponse,
    PlayerProgressResponse,
    ProfileDashboardResponse,
    QuestPeriodStateItem,
    StartFactChallengeRequest,
    StartFactChallengeResponse,
    StartTestRequest,
    StartTestResponse,
    SubmitFactChallengeRequest,
    SubmitFactChallengeResponse,
    SubmitTestRequest,
    SubmitTestResponse,
    TestQuestion,
    TimelineCitiesResponse,
    TimelineCityItem,
    TimelinePeriodItem,
    TimelinePeriodsResponse,
    UnlockedAchievement,
)
from .constants import (
    CITY_MILESTONE_ACHIEVEMENTS,
    DEFAULT_PERIOD_DATA_PATH,
    DEFAULT_PERIOD_MULTILANG_DATA_PATH,
    DEFAULT_PERIOD_CODE,
    FACT_MILESTONE_ACHIEVEMENTS,
    PASS_THRESHOLD,
    PERIOD_ACHIEVEMENT_CODES,
    PERIOD_MASTER_ACHIEVEMENT_CODES,
    QUEST_START_PERIOD_CODE,
    PERIOD_UNLOCK_SEQUENCE,
    get_city_period_achievement_code,
)
from .database import (
    count_player_correct_fact_challenges,
    connect_db,
    count_distinct_cities_passed,
    count_player_achievements,
    count_player_passed_tests,
    create_fact_challenge_session,
    create_test_session,
    delete_test_session,
    ensure_database,
    fetch_city_period,
    fetch_city_period_content,
    fetch_fact_challenge_by_id,
    fetch_fact_challenge_session,
    fetch_player_achievement,
    fetch_quizzes_by_ids,
    fetch_random_active_fact_challenge,
    fetch_random_quizzes,
    fetch_test_session,
    get_fact_challenge_progress,
    get_player_progress,
    insert_player_achievement,
    insert_fact_challenge_result,
    insert_test_result,
    list_completed_minigames,
    list_achievement_catalog,
    list_city_period_content_summaries,
    list_period_cities,
    list_player_fact_success_cities,
    list_player_achievements,
    list_timeline_periods,
    mark_fact_challenge_session_completed,
    timeline_period_exists,
    upsert_player_city_progress,
    upsert_player_minigame_progress,
)


# Temporary review mode: all timeline periods are open without passing earlier tests.
TEMP_UNLOCK_ALL_PERIODS_FOR_REVIEW = False

MINIGAME_TRANSITIONS = {
    "caravan-runner": {
        "from_period_code": "khanate_1465",
        "to_period_code": "imperial_1731",
    },
    "fortress-defense": {
        "from_period_code": "imperial_1731",
        "to_period_code": "imperial_1868",
    },
    "monument-puzzle": {
        "from_period_code": "imperial_1868",
        "to_period_code": "soviet_1925",
    },
    "figures-memory": {
        "from_period_code": "soviet_1925",
        "to_period_code": "independence_1991",
    },
    "tenge-catch": {
        "from_period_code": "independence_1991",
        "to_period_code": "transition_1998",
    },
    "timeline-sort": {
        "from_period_code": "transition_1998",
        "to_period_code": "modern_2025",
    },
}

MINIGAME_BY_FROM_PERIOD = {
    str(item["from_period_code"]): game_id
    for game_id, item in MINIGAME_TRANSITIONS.items()
}

SUPPORTED_QUIZ_LANGUAGES = {"ru", "en", "kk"}


def _normalize_quiz_language(language: str | None) -> str:
    normalized = (language or "ru").strip().lower()
    return normalized if normalized in SUPPORTED_QUIZ_LANGUAGES else "ru"


@lru_cache(maxsize=1)
def _load_multilang_quiz_index() -> dict[tuple[str, str, str], dict[str, object]]:
    multilang_items = json.loads(DEFAULT_PERIOD_MULTILANG_DATA_PATH.read_text(encoding="utf-8"))
    index: dict[tuple[str, str, str], dict[str, object]] = {}

    for item in multilang_items:
        translations = item.get("translations", {})
        ru_translation = translations.get("ru", {}) if isinstance(translations, dict) else {}
        index[
            (
                str(item.get("city", "")),
                str(item.get("period_code", "")),
                str(ru_translation.get("question", "")),
            )
        ] = item

    return index


def _build_response_quiz_questions(
    questions: list[dict[str, object]],
    language: str | None,
) -> list[dict[str, object]]:
    normalized = _normalize_quiz_language(language)
    multilang_index = _load_multilang_quiz_index()
    response_questions: list[dict[str, object]] = []
    for question in questions:
        key = (
            str(question.get("city", "")),
            str(question.get("period_code", "")),
            str(question.get("question", "")),
        )
        multilang = multilang_index.get(key)
        if not multilang:
            response_questions.append(question)
            continue

        translations = multilang.get("translations", {})
        localized = translations.get(normalized) or translations.get("ru") or {}
        row = dict(question)
        row["question"] = localized.get("question", question.get("question"))
        row["options"] = localized.get("options", question.get("options"))
        row["fact"] = localized.get("fact", question.get("fact"))
        row["translations"] = translations
        response_questions.append(row)

    return response_questions


def _db_cache_key(db_path: str | Path) -> str:
    return str(Path(db_path).resolve())


@lru_cache(maxsize=8)
def _cached_timeline_periods(db_path_key: str) -> tuple[tuple[tuple[str, object], ...], ...]:
    return tuple(
        tuple(dict(item).items())
        for item in list_timeline_periods(db_path_key)
    )


@lru_cache(maxsize=128)
def _cached_period_cities(
    db_path_key: str,
    period_code: str,
    only_available: bool,
) -> tuple[tuple[tuple[str, object], ...], ...]:
    return tuple(
        tuple(dict(item).items())
        for item in list_period_cities(db_path_key, period_code, only_available=only_available)
    )


@lru_cache(maxsize=128)
def _cached_city_content_summaries(
    db_path_key: str,
    period_code: str,
) -> tuple[tuple[tuple[str, object], ...], ...]:
    return tuple(
        tuple(dict(item).items())
        for item in list_city_period_content_summaries(db_path_key, period_code)
    )


def _list_timeline_periods_cached(db_path: str | Path) -> list[dict[str, object]]:
    return [dict(item) for item in _cached_timeline_periods(_db_cache_key(db_path))]


def _list_period_cities_cached(
    db_path: str | Path,
    period_code: str,
    only_available: bool = True,
) -> list[dict[str, object]]:
    return [
        dict(item)
        for item in _cached_period_cities(_db_cache_key(db_path), period_code, only_available)
    ]


def _list_city_period_content_summaries_cached(
    db_path: str | Path,
    period_code: str,
) -> list[dict[str, object]]:
    return [
        dict(item)
        for item in _cached_city_content_summaries(_db_cache_key(db_path), period_code)
    ]


@lru_cache(maxsize=8)
def _cached_achievement_catalog(db_path_key: str) -> tuple[tuple[tuple[str, object], ...], ...]:
    return tuple(
        tuple(dict(item).items())
        for item in list_achievement_catalog(db_path_key)
    )


def _list_achievement_catalog_cached(db_path: str | Path) -> list[dict[str, object]]:
    return [dict(item) for item in _cached_achievement_catalog(_db_cache_key(db_path))]


@lru_cache(maxsize=256)
def _cached_city_period_content(
    db_path_key: str,
    city: str,
    period_code: str,
) -> tuple[tuple[str, object], ...] | None:
    content = fetch_city_period_content(db_path_key, city, period_code)
    return tuple(dict(content).items()) if content is not None else None


def _fetch_city_period_content_cached(
    db_path: str | Path,
    city: str,
    period_code: str,
) -> dict[str, object] | None:
    cached = _cached_city_period_content(_db_cache_key(db_path), city, period_code)
    return dict(cached) if cached is not None else None


def _period_exists_cached(db_path: str | Path, period_code: str) -> bool:
    return any(str(period["code"]) == period_code for period in _list_timeline_periods_cached(db_path))


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _list_unlocked_period_overrides(db_path: str | Path, player_id: str) -> set[str]:
    connection = connect_db(db_path)
    try:
        rows = connection.execute(
            """
            SELECT period_code
            FROM player_period_overrides
            WHERE player_id = ? AND is_unlocked = 1
            """,
            (player_id,),
        ).fetchall()
        return {str(row["period_code"]) for row in rows}
    finally:
        connection.close()


def _list_unlocked_period_overrides_from_connection(
    connection: sqlite3.Connection,
    player_id: str,
) -> set[str]:
    rows = connection.execute(
        """
        SELECT period_code
        FROM player_period_overrides
        WHERE player_id = ? AND is_unlocked = 1
        """,
        (player_id,),
    ).fetchall()
    return {str(row["period_code"]) for row in rows}


def _normalize_player_id(player_id: str) -> str:
    normalized = player_id.strip()
    if not normalized:
        raise HTTPException(status_code=400, detail="player_id must not be empty.")
    return normalized


def _calculate_score_percent(correct_answers: int, total_questions: int) -> int:
    return round((correct_answers / total_questions) * 100)


def _calculate_timed_city_points(
    correct_answers: int,
    total_questions: int,
    elapsed_seconds: int | None,
) -> int:
    if total_questions <= 0 or correct_answers <= 0:
        return 0

    elapsed = max(0, int(elapsed_seconds or 0))
    if elapsed < 30:
        speed_points = 50
    elif elapsed < 50:
        speed_points = 40
    else:
        speed_points = 20

    accuracy_ratio = min(1, max(0, correct_answers / total_questions))
    return round(speed_points * accuracy_ratio)


def _require_period(connection, period_code: str) -> None:
    if not timeline_period_exists(connection, period_code):
        raise HTTPException(
            status_code=404,
            detail=f"Timeline period '{period_code}' was not found.",
        )


def _require_city_period_available(
    connection,
    city: str,
    period_code: str,
) -> dict[str, object]:
    city_period = fetch_city_period(connection, city, period_code)
    if city_period is None or not int(city_period["is_available"]):
        raise HTTPException(
            status_code=400,
            detail=f"City '{city}' is not available for period '{period_code}'.",
        )
    return city_period


def _build_period_progress_snapshot(
    db_path: str | Path,
    player_id: str,
    player_progress: dict[str, object] | None = None,
) -> dict[str, object]:
    periods = sorted(
        _list_timeline_periods_cached(db_path),
        key=lambda item: int(item["sort_order"]),
    )
    if player_progress is None:
        player_progress = get_player_progress(db_path, player_id)
    progress_by_pair = {
        (str(item["period_code"]), str(item["city"])): item
        for item in player_progress["city_progress"]
    }
    manual_unlocked_periods = _list_unlocked_period_overrides(db_path, player_id)
    connection = connect_db(db_path)
    try:
        completed_minigames = list_completed_minigames(connection, player_id)
    finally:
        connection.close()

    states: list[dict[str, object]] = []
    for index, period in enumerate(periods):
        period_code = str(period["code"])
        cities = _list_period_cities_cached(db_path, period_code, only_available=True)
        total_cities = len(cities)
        passed_cities = sum(
            1
            for city_row in cities
            if (
                progress_by_pair.get((period_code, str(city_row["city"])))
                and int(progress_by_pair[(period_code, str(city_row["city"]))]["passed_count"]) > 0
            )
        )
        completed = total_cities > 0 and passed_cities >= total_cities
        previous_state = states[index - 1] if index > 0 else None
        required_game_id = (
            MINIGAME_BY_FROM_PERIOD.get(str(previous_state["code"]))
            if previous_state
            else None
        )
        gate_satisfied = (
            not required_game_id
            or required_game_id in completed_minigames
        )
        is_unlocked = (
            TEMP_UNLOCK_ALL_PERIODS_FOR_REVIEW
            or period_code in manual_unlocked_periods
            or index == 0
            or (
                bool(previous_state and previous_state["is_unlocked"])
                and gate_satisfied
            )
        )

        states.append(
            {
                "code": period_code,
                "year_label": str(period["year_label"]),
                "title": str(period["title"]),
                "sort_order": int(period["sort_order"]),
                "description": str(period["description"]),
                "is_unlocked": is_unlocked,
                "is_completed": completed,
                "total_cities": total_cities,
                "passed_cities": passed_cities,
                "remaining_cities": max(total_cities - passed_cities, 0),
            }
        )

    current_period_code = next(
        (
            str(state["code"])
            for state in states
            if bool(state["is_unlocked"]) and not bool(state["is_completed"])
        ),
        "",
    )
    if not current_period_code and states:
        current_period_code = str(states[-1]["code"])

    unlocked_period_codes = [
        str(state["code"]) for state in states if bool(state["is_unlocked"])
    ]
    completed_period_codes = [
        str(state["code"]) for state in states if bool(state["is_completed"])
    ]

    for index, state in enumerate(states):
        next_state = states[index + 1] if index + 1 < len(states) else None
        state["is_current"] = str(state["code"]) == current_period_code
        state["next_period_code"] = str(next_state["code"]) if next_state else None
        state["next_period_title"] = str(next_state["title"]) if next_state else None

    return {
        "states": states,
        "current_period_code": current_period_code,
        "unlocked_period_codes": unlocked_period_codes,
        "completed_period_codes": completed_period_codes,
    }


def _get_player_progress_from_connection(
    connection: sqlite3.Connection,
    player_id: str,
) -> dict[str, object]:
    total_tests_completed = connection.execute(
        """
        SELECT COUNT(*)
        FROM test_results
        WHERE player_id = ? AND city != 'ЕНТ'
        """,
        (player_id,),
    ).fetchone()[0]
    total_passed_tests = connection.execute(
        """
        SELECT COUNT(*)
        FROM test_results
        WHERE player_id = ? AND passed = 1 AND city != 'ЕНТ'
        """,
        (player_id,),
    ).fetchone()[0]
    distinct_cities_passed = connection.execute(
        """
        SELECT COUNT(DISTINCT city)
        FROM player_city_progress
        WHERE player_id = ? AND passed_count > 0 AND city != 'ЕНТ'
        """,
        (player_id,),
    ).fetchone()[0]
    total_achievements_unlocked = connection.execute(
        """
        SELECT COUNT(*)
        FROM player_achievements
        WHERE player_id = ?
        """,
        (player_id,),
    ).fetchone()[0]
    city_rows = connection.execute(
        """
        SELECT
            player_city_progress.city,
            player_city_progress.period_code,
            player_city_progress.passed_count,
            player_city_progress.best_score,
            player_city_progress.total_attempts,
            player_city_progress.last_completed_at
        FROM player_city_progress
        LEFT JOIN timeline_periods
            ON timeline_periods.code = player_city_progress.period_code
        WHERE player_city_progress.player_id = ?
        ORDER BY player_city_progress.city ASC, timeline_periods.sort_order ASC
        """,
        (player_id,),
    ).fetchall()
    total_score = connection.execute(
        """
        SELECT COALESCE(SUM(correct_answers), 0)
        FROM test_results
        WHERE player_id = ? AND city != 'ЕНТ'
        """,
        (player_id,),
    ).fetchone()[0]

    return {
        "total_tests_completed": total_tests_completed,
        "total_passed_tests": total_passed_tests,
        "distinct_cities_passed": distinct_cities_passed,
        "city_progress": [dict(row) for row in city_rows],
        "total_achievements_unlocked": total_achievements_unlocked,
        "total_score": total_score,
    }


def _has_progress_in_period_or_later(
    states: list[dict[str, object]],
    progress_by_pair: dict[tuple[str, str], dict[str, object]],
    period_code: str,
) -> bool:
    period_indexes = {str(state["code"]): index for index, state in enumerate(states)}
    start_index = period_indexes.get(period_code)
    if start_index is None:
        return False

    later_codes = {
        str(state["code"])
        for state in states
        if period_indexes[str(state["code"])] >= start_index
    }
    return any(
        pair_period_code in later_codes
        and (
            int(progress.get("passed_count") or 0) > 0
            or int(progress.get("total_attempts") or 0) > 0
        )
        for (pair_period_code, _city), progress in progress_by_pair.items()
    )


def _is_minigame_gate_satisfied(
    connection: sqlite3.Connection,
    player_id: str,
    previous_period_code: str,
    next_period_code: str,
    states: list[dict[str, object]],
    progress_by_pair: dict[tuple[str, str], dict[str, object]],
) -> bool:
    game_id = MINIGAME_BY_FROM_PERIOD.get(previous_period_code)
    if not game_id:
        return True

    if game_id in list_completed_minigames(connection, player_id):
        return True

    # Strict gate: the next period stays locked until the required minigame
    # is completed. No bypass for partial progress in later periods.
    return False


def _build_period_progress_snapshot_from_connection(
    connection: sqlite3.Connection,
    player_id: str,
) -> dict[str, object]:
    periods = [
        dict(row)
        for row in connection.execute(
            """
            SELECT code, year_label, title, sort_order, description
            FROM timeline_periods
            ORDER BY sort_order ASC, code ASC
            """
        ).fetchall()
    ]
    player_progress = _get_player_progress_from_connection(connection, player_id)
    progress_by_pair = {
        (str(item["period_code"]), str(item["city"])): item
        for item in player_progress["city_progress"]
    }
    manual_unlocked_periods = _list_unlocked_period_overrides_from_connection(
        connection,
        player_id,
    )

    states: list[dict[str, object]] = []
    for index, period in enumerate(periods):
        period_code = str(period["code"])
        cities = [
            dict(row)
            for row in connection.execute(
                """
                SELECT city, period_code, display_name, subtitle, is_available
                FROM city_periods
                WHERE period_code = ? AND is_available = 1
                ORDER BY display_name ASC, city ASC
                """,
                (period_code,),
            ).fetchall()
        ]
        total_cities = len(cities)
        passed_cities = sum(
            1
            for city_row in cities
            if (
                progress_by_pair.get((period_code, str(city_row["city"])))
                and int(progress_by_pair[(period_code, str(city_row["city"]))]["passed_count"]) > 0
            )
        )
        completed = total_cities > 0 and passed_cities >= total_cities
        previous_state = states[index - 1] if index > 0 else None
        gate_satisfied = (
            True
            if not previous_state
            else _is_minigame_gate_satisfied(
                connection,
                player_id,
                str(previous_state["code"]),
                period_code,
                [*states, {"code": period_code}],
                progress_by_pair,
            )
        )
        is_unlocked = (
            TEMP_UNLOCK_ALL_PERIODS_FOR_REVIEW
            or period_code in manual_unlocked_periods
            or index == 0
            or (
                bool(previous_state and previous_state["is_unlocked"])
                and gate_satisfied
            )
        )
        states.append(
            {
                "code": period_code,
                "year_label": str(period["year_label"]),
                "title": str(period["title"]),
                "sort_order": int(period["sort_order"]),
                "description": str(period["description"]),
                "is_unlocked": is_unlocked,
                "is_completed": completed,
                "total_cities": total_cities,
                "passed_cities": passed_cities,
                "remaining_cities": max(total_cities - passed_cities, 0),
            }
        )

    current_period_code = next(
        (
            str(state["code"])
            for state in states
            if bool(state["is_unlocked"]) and not bool(state["is_completed"])
        ),
        "",
    )
    if not current_period_code and states:
        current_period_code = str(states[-1]["code"])

    unlocked_period_codes = [
        str(state["code"]) for state in states if bool(state["is_unlocked"])
    ]
    completed_period_codes = [
        str(state["code"]) for state in states if bool(state["is_completed"])
    ]

    return {
        "states": states,
        "current_period_code": current_period_code,
        "unlocked_period_codes": unlocked_period_codes,
        "completed_period_codes": completed_period_codes,
    }


def _get_period_state(
    snapshot: dict[str, object],
    period_code: str,
) -> dict[str, object]:
    for state in snapshot["states"]:
        if str(state["code"]) == period_code:
            return state
    raise HTTPException(status_code=404, detail=f"Timeline period '{period_code}' was not found.")


def _require_period_unlocked(
    snapshot: dict[str, object],
    period_code: str,
) -> None:
    if TEMP_UNLOCK_ALL_PERIODS_FOR_REVIEW:
        _get_period_state(snapshot, period_code)
        return

    period_state = _get_period_state(snapshot, period_code)
    if bool(period_state["is_unlocked"]):
        return

    previous_period_code = None
    current_index = PERIOD_UNLOCK_SEQUENCE.index(period_code)
    if current_index > 0:
        previous_period_code = PERIOD_UNLOCK_SEQUENCE[current_index - 1]
    raise HTTPException(
        status_code=403,
        detail=(
            "Этот период пока заблокирован. "
            + (
                f"Сначала завершите все тесты периода '{previous_period_code}'."
                if previous_period_code
                else "Сначала завершите текущий игровой этап."
            )
        ),
    )


def _build_minigame_gate_info(
    states: list[dict[str, object]],
    from_period_code: str,
) -> MinigameGateInfo | None:
    game_id = MINIGAME_BY_FROM_PERIOD.get(from_period_code)
    if not game_id:
        return None

    transition = MINIGAME_TRANSITIONS[game_id]
    to_period_code = str(transition["to_period_code"])
    to_state = next(
        (state for state in states if str(state["code"]) == to_period_code),
        None,
    )
    if not to_state:
        return None

    return MinigameGateInfo(
        game_id=game_id,
        from_period_code=from_period_code,
        to_period_code=to_period_code,
        to_period_title=str(to_state["title"]),
    )


def _find_pending_minigame_gate(
    connection: sqlite3.Connection,
    player_id: str,
    completed_period_code: str,
) -> MinigameGateInfo | None:
    game_id = MINIGAME_BY_FROM_PERIOD.get(completed_period_code)
    if not game_id:
        return None

    snapshot = _build_period_progress_snapshot_from_connection(connection, player_id)
    states = list(snapshot["states"])
    from_state = next(
        (state for state in states if str(state["code"]) == completed_period_code),
        None,
    )
    if not from_state or not bool(from_state["is_completed"]):
        return None

    transition = MINIGAME_TRANSITIONS[game_id]
    to_period_code = str(transition["to_period_code"])
    to_state = next(
        (state for state in states if str(state["code"]) == to_period_code),
        None,
    )
    if to_state and bool(to_state["is_unlocked"]):
        return None

    return _build_minigame_gate_info(states, completed_period_code)


def complete_minigame(
    db_path: str | Path,
    payload: CompleteMinigameRequest,
) -> CompleteMinigameResponse:
    ensure_database(db_path)
    player_id = _normalize_player_id(payload.player_id)
    game_id = payload.game_id.strip()
    transition = MINIGAME_TRANSITIONS.get(game_id)
    if not transition:
        raise HTTPException(status_code=404, detail="Мини-игра не найдена.")

    completed_at = _utc_now_iso()
    connection = connect_db(db_path)
    try:
        with connection:
            snapshot = _build_period_progress_snapshot_from_connection(connection, player_id)
            from_period_code = str(transition["from_period_code"])
            from_state = _get_period_state(snapshot, from_period_code)
            if not from_state or not bool(from_state["is_unlocked"]):
                raise HTTPException(
                    status_code=403,
                    detail="Период для этой мини-игры пока заблокирован.",
                )

            upsert_player_minigame_progress(
                connection=connection,
                player_id=player_id,
                game_id=game_id,
                completed_at=completed_at,
                score=int(payload.score or 0),
                elapsed_seconds=int(payload.elapsed_seconds or 0),
            )

            updated_snapshot = _build_period_progress_snapshot_from_connection(
                connection,
                player_id,
            )
            to_period_code = str(transition["to_period_code"])
            to_state = _get_period_state(updated_snapshot, to_period_code)
    finally:
        connection.close()

    return CompleteMinigameResponse(
        game_id=game_id,
        completed=True,
        unlocked_period_code=to_period_code if bool(to_state["is_unlocked"]) else None,
        unlocked_period_title=str(to_state["title"]) if bool(to_state["is_unlocked"]) else None,
    )


def _is_period_mastered(
    player_progress: dict[str, object],
    db_path: str | Path,
    period_code: str,
) -> bool:
    period_cities = _list_period_cities_cached(db_path, period_code, only_available=True)
    progress_by_city = {
        str(item["city"]): item
        for item in player_progress["city_progress"]
        if str(item["period_code"]) == period_code
    }
    if not period_cities:
        return False

    for city_row in period_cities:
        city_progress = progress_by_city.get(str(city_row["city"]))
        if not city_progress:
            return False
        if int(city_progress["passed_count"]) <= 0 or int(city_progress["best_score"]) < 100:
            return False
    return True


def _is_period_mastered_from_connection(
    connection: sqlite3.Connection,
    player_progress: dict[str, object],
    period_code: str,
) -> bool:
    period_cities = [
        dict(row)
        for row in connection.execute(
            """
            SELECT city
            FROM city_periods
            WHERE period_code = ? AND is_available = 1
            ORDER BY display_name ASC, city ASC
            """,
            (period_code,),
        ).fetchall()
    ]
    progress_by_city = {
        str(item["city"]): item
        for item in player_progress["city_progress"]
        if str(item["period_code"]) == period_code
    }
    if not period_cities:
        return False

    for city_row in period_cities:
        city_progress = progress_by_city.get(str(city_row["city"]))
        if not city_progress:
            return False
        if int(city_progress["passed_count"]) <= 0 or int(city_progress["best_score"]) < 100:
            return False
    return True


def start_test(db_path: str | Path, payload: StartTestRequest) -> StartTestResponse:
    ensure_database(db_path)
    player_id = _normalize_player_id(payload.player_id)
    session_id = str(uuid4())
    created_at = _utc_now_iso()
    progression_snapshot = _build_period_progress_snapshot(db_path, player_id)

    connection = connect_db(db_path)
    try:
        with connection:
            _require_period(connection, payload.period_code)
            _require_period_unlocked(progression_snapshot, payload.period_code)
            _require_city_period_available(connection, payload.city, payload.period_code)

            questions = fetch_random_quizzes(
                connection,
                payload.city,
                payload.period_code,
                payload.question_count,
            )
            if not questions:
                raise HTTPException(
                    status_code=404,
                    detail=(
                        f"No quizzes found for city '{payload.city}' in period "
                        f"'{payload.period_code}'."
                    ),
                )

            if len(questions) < payload.question_count:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Not enough questions for city '{payload.city}' in period "
                        f"'{payload.period_code}'. Requested {payload.question_count}, "
                        f"found {len(questions)}."
                    ),
                )

            response_questions = _build_response_quiz_questions(questions, payload.language)

            create_test_session(
                connection=connection,
                session_id=session_id,
                player_id=player_id,
                city=payload.city,
                period_code=payload.period_code,
                question_ids=[str(question["id"]) for question in questions],
                created_at=created_at,
            )
    finally:
        connection.close()

    return StartTestResponse(
        test_session_id=session_id,
        city=payload.city,
        period_code=payload.period_code,
        questions=[
            TestQuestion(
                id=question["id"],
                question=question["question"],
                options=question["options"],
                translations=question.get("translations"),
            )
            for question in response_questions
        ],
    )


def _build_unlock_candidates(
    connection,
    player_id: str,
    city: str,
    period_code: str,
    correct_answers: int,
    total_questions: int,
    elapsed_seconds: int,
) -> list[str]:
    candidates: list[str] = []
    player_progress = _get_player_progress_from_connection(connection, player_id)
    progression_snapshot = _build_period_progress_snapshot_from_connection(connection, player_id)
    city_achievement_code = get_city_period_achievement_code(city, period_code)

    if count_player_passed_tests(connection, player_id) == 1:
        candidates.append("first_city_pass")

    if city_achievement_code and correct_answers >= min(4, total_questions):
        candidates.append(city_achievement_code)

    if correct_answers >= min(4, total_questions) and elapsed_seconds < 50:
        candidates.append("steady_city_test")

    if correct_answers >= min(4, total_questions) and elapsed_seconds < 30:
        candidates.append("fast_city_test")

    if correct_answers == total_questions and elapsed_seconds < 30:
        candidates.append("perfect_fast_city_test")

    distinct_cities_passed = count_distinct_cities_passed(connection, player_id)
    for threshold in sorted(CITY_MILESTONE_ACHIEVEMENTS):
        if distinct_cities_passed >= threshold:
            candidates.append(CITY_MILESTONE_ACHIEVEMENTS[threshold])

    if correct_answers == total_questions:
        candidates.append("perfect_city_test")

    completed_period_codes = set(progression_snapshot["completed_period_codes"])
    if completed_period_codes:
        candidates.append("first_period_complete")

    periods_with_progress = {
        str(item["period_code"])
        for item in player_progress["city_progress"]
        if int(item["passed_count"]) > 0
    }
    if len(periods_with_progress) >= 3:
        candidates.append("timeline_explorer")

    if set(PERIOD_UNLOCK_SEQUENCE).issubset(completed_period_codes):
        candidates.append("full_timeline_complete")

    if period_code in completed_period_codes:
        candidates.append(PERIOD_ACHIEVEMENT_CODES[period_code])

    if _is_period_mastered_from_connection(connection, player_progress, period_code):
        candidates.append(PERIOD_MASTER_ACHIEVEMENT_CODES[period_code])

    return candidates


def _build_fact_unlock_candidates(
    connection,
    player_id: str,
) -> list[str]:
    candidates: list[str] = []
    correct_total = count_player_correct_fact_challenges(connection, player_id)

    if correct_total == 1:
        candidates.append("fact_first_correct")

    for threshold in sorted(FACT_MILESTONE_ACHIEVEMENTS):
        if correct_total >= threshold:
            candidates.append(FACT_MILESTONE_ACHIEVEMENTS[threshold])

    return candidates


def _unlock_achievement_codes(
    connection,
    player_id: str,
    achievement_codes: list[str],
    unlocked_at: str,
) -> list[UnlockedAchievement]:
    unlocked: list[UnlockedAchievement] = []
    seen_codes: set[str] = set()

    for achievement_code in achievement_codes:
        if achievement_code in seen_codes:
            continue
        seen_codes.add(achievement_code)

        inserted = insert_player_achievement(
            connection=connection,
            player_id=player_id,
            achievement_code=achievement_code,
            unlocked_at=unlocked_at,
        )
        if not inserted:
            continue

        achievement = fetch_player_achievement(
            connection=connection,
            player_id=player_id,
            achievement_code=achievement_code,
        )
        if achievement is None:
            continue

        unlocked.append(UnlockedAchievement(**achievement))

    return unlocked


def submit_test(db_path: str | Path, payload: SubmitTestRequest) -> SubmitTestResponse:
    ensure_database(db_path)
    player_id = _normalize_player_id(payload.player_id)
    connection = connect_db(db_path)

    try:
        with connection:
            session = fetch_test_session(connection, payload.test_session_id)
            if session is None:
                raise HTTPException(status_code=404, detail="Test session not found.")

            if session["player_id"] != player_id:
                raise HTTPException(
                    status_code=403,
                    detail="This test session belongs to a different player.",
                )

            _require_period(connection, session["period_code"])
            if session["city"] != "ЕНТ":
                _require_city_period_available(connection, session["city"], session["period_code"])

            expected_question_ids = session["question_ids"]
            submitted_question_ids = [str(answer.question_id) for answer in payload.answers]

            if len(submitted_question_ids) != len(expected_question_ids):
                raise HTTPException(
                    status_code=400,
                    detail="Submission must include answers for all session questions.",
                )

            if len(set(submitted_question_ids)) != len(submitted_question_ids):
                raise HTTPException(
                    status_code=400,
                    detail="Submission contains duplicate question ids.",
                )

            expected_question_ids = [str(qid) for qid in expected_question_ids]
            if set(submitted_question_ids) != set(expected_question_ids):
                raise HTTPException(
                    status_code=400,
                    detail="Submitted question ids do not match the test session.",
                )

            questions = fetch_quizzes_by_ids(connection, expected_question_ids)
            if len(questions) != len(expected_question_ids):
                found_ids = {str(q["id"]) for q in questions}
                missing_ids = [qid for qid in expected_question_ids if str(qid) not in found_ids]
                raise HTTPException(
                    status_code=500,
                    detail=f"Test session contains missing quiz questions. Missing: {', '.join(missing_ids)}",
                )

            if any(
                question["city"] != session["city"]
                or question["period_code"] != session["period_code"]
                for question in questions
            ):
                raise HTTPException(
                    status_code=500,
                    detail="Test session questions do not match the stored city and period.",
                )

            answers_by_question_id = {
                str(answer.question_id): answer.selected_index for answer in payload.answers
            }
            total_questions = len(expected_question_ids)
            correct_answers = sum(
                1
                for question in questions
                if str(answers_by_question_id[str(question["id"])]) == str(question["correct_index"])
            )
            score_percent = _calculate_score_percent(correct_answers, total_questions)
            elapsed_seconds = max(0, int(payload.elapsed_seconds or 0))
            earned_points = _calculate_timed_city_points(
                correct_answers,
                total_questions,
                elapsed_seconds,
            )
            passed = correct_answers >= math.ceil(total_questions * PASS_THRESHOLD)
            completed_at = _utc_now_iso()

            insert_test_result(
                connection=connection,
                player_id=player_id,
                city=session["city"],
                period_code=session["period_code"],
                total_questions=total_questions,
                correct_answers=correct_answers,
                passed=passed,
                completed_at=completed_at,
            )

            upsert_player_city_progress(
                connection=connection,
                player_id=player_id,
                city=session["city"],
                period_code=session["period_code"],
                passed=passed,
                score_percent=score_percent,
                completed_at=completed_at,
            )

            unlocked_achievements: list[UnlockedAchievement] = []
            minigame_gate: MinigameGateInfo | None = None
            if passed:
                unlocked_achievements = _unlock_achievement_codes(
                    connection=connection,
                    player_id=player_id,
                    achievement_codes=_build_unlock_candidates(
                        connection=connection,
                        player_id=player_id,
                        city=session["city"],
                        period_code=session["period_code"],
                        correct_answers=correct_answers,
                        total_questions=total_questions,
                        elapsed_seconds=elapsed_seconds,
                    ),
                    unlocked_at=completed_at,
                )
                minigame_gate = _find_pending_minigame_gate(
                    connection,
                    player_id,
                    str(session["period_code"]),
                )

            all_player_achievements_count = count_player_achievements(connection, player_id)
            delete_test_session(connection, payload.test_session_id)
    finally:
        connection.close()

    return SubmitTestResponse(
        city=session["city"],
        period_code=session["period_code"],
        total_questions=total_questions,
        correct_answers=correct_answers,
        score_percent=score_percent,
        elapsed_seconds=elapsed_seconds,
        earned_points=earned_points,
        passed=passed,
        unlocked_achievements=unlocked_achievements,
        all_player_achievements_count=all_player_achievements_count,
        minigame_gate=minigame_gate,
    )


def start_fact_challenge(
    db_path: str | Path,
    payload: StartFactChallengeRequest,
) -> StartFactChallengeResponse:
    ensure_database(db_path)
    player_id = _normalize_player_id(payload.player_id)
    session_id = str(uuid4())
    created_at = _utc_now_iso()
    progression_snapshot = _build_period_progress_snapshot(db_path, player_id)

    connection = connect_db(db_path)
    try:
        with connection:
            _require_period(connection, payload.period_code)
            _require_period_unlocked(progression_snapshot, payload.period_code)
            challenge = fetch_random_active_fact_challenge(connection, payload.period_code)
            if challenge is None:
                raise HTTPException(
                    status_code=404,
                    detail=(
                        f"No active fact challenges were found for period "
                        f"'{payload.period_code}'."
                    ),
                )

            period_cities = _list_period_cities_cached(
                db_path,
                payload.period_code,
                only_available=True,
            )
            candidate_pool = [item["city"] for item in period_cities]
            if challenge["city"] not in candidate_pool:
                raise HTTPException(
                    status_code=500,
                    detail="Fact challenge city is not available in the selected period.",
                )

            if payload.candidate_count > len(candidate_pool):
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Not enough candidate cities for period '{payload.period_code}'. "
                        f"Requested {payload.candidate_count}, found {len(candidate_pool)}."
                    ),
                )

            distractor_pool = [
                city for city in candidate_pool if city != challenge["city"]
            ]
            candidate_cities = [
                challenge["city"],
                *random.sample(distractor_pool, k=payload.candidate_count - 1),
            ]
            random.shuffle(candidate_cities)

            create_fact_challenge_session(
                connection=connection,
                session_id=session_id,
                player_id=player_id,
                period_code=payload.period_code,
                challenge_id=challenge["id"],
                candidate_cities=candidate_cities,
                created_at=created_at,
            )
    finally:
        connection.close()

    return StartFactChallengeResponse(
        session_id=session_id,
        period_code=payload.period_code,
        fact_text=challenge["fact_text"],
        candidate_cities=candidate_cities,
    )


def submit_fact_challenge(
    db_path: str | Path,
    payload: SubmitFactChallengeRequest,
) -> SubmitFactChallengeResponse:
    ensure_database(db_path)
    player_id = _normalize_player_id(payload.player_id)
    connection = connect_db(db_path)

    try:
        with connection:
            session = fetch_fact_challenge_session(connection, payload.session_id)
            if session is None:
                raise HTTPException(
                    status_code=404,
                    detail="Fact challenge session not found.",
                )

            if session["player_id"] != player_id:
                raise HTTPException(
                    status_code=403,
                    detail="This fact challenge session belongs to a different player.",
                )

            if int(session["is_completed"]) == 1:
                raise HTTPException(
                    status_code=409,
                    detail="This fact challenge session has already been completed.",
                )

            _require_period(connection, session["period_code"])

            if payload.selected_city not in session["candidate_cities"]:
                raise HTTPException(
                    status_code=400,
                    detail="selected_city is not part of the candidate_cities list.",
                )

            challenge = fetch_fact_challenge_by_id(connection, session["challenge_id"])
            if challenge is None:
                raise HTTPException(
                    status_code=500,
                    detail="Fact challenge session contains a missing challenge.",
                )

            if challenge["period_code"] != session["period_code"]:
                raise HTTPException(
                    status_code=500,
                    detail="Fact challenge session does not match the stored period.",
                )

            is_correct = payload.selected_city == challenge["city"]
            completed_at = _utc_now_iso()

            mark_fact_challenge_session_completed(connection, payload.session_id)
            insert_fact_challenge_result(
                connection=connection,
                player_id=player_id,
                period_code=session["period_code"],
                challenge_id=challenge["id"],
                selected_city=payload.selected_city,
                correct_city=challenge["city"],
                is_correct=is_correct,
                completed_at=completed_at,
            )

            unlocked_achievements: list[UnlockedAchievement] = []
            if is_correct:
                unlocked_achievements = _unlock_achievement_codes(
                    connection=connection,
                    player_id=player_id,
                    achievement_codes=_build_fact_unlock_candidates(
                        connection=connection,
                        player_id=player_id,
                    ),
                    unlocked_at=completed_at,
                )
    finally:
        connection.close()

    return SubmitFactChallengeResponse(
        is_correct=is_correct,
        correct_city=challenge["city"],
        period_code=session["period_code"],
        fact_text=challenge["fact_text"],
        unlocked_achievements=unlocked_achievements,
    )


def get_player_achievements_response(
    db_path: str | Path,
    player_id: str,
) -> PlayerAchievementsResponse:
    normalized_player_id = _normalize_player_id(player_id)
    achievements = list_player_achievements(db_path, normalized_player_id)
    return PlayerAchievementsResponse(
        achievements=[UnlockedAchievement(**achievement) for achievement in achievements]
    )


def get_player_progress_response(
    db_path: str | Path,
    player_id: str,
) -> PlayerProgressResponse:
    normalized_player_id = _normalize_player_id(player_id)
    progress = get_player_progress(db_path, normalized_player_id)
    snapshot = _build_period_progress_snapshot(
        db_path,
        normalized_player_id,
        player_progress=progress,
    )
    return _build_player_progress_response(progress, snapshot)


def _build_player_progress_response(
    progress: dict[str, object],
    snapshot: dict[str, object],
) -> PlayerProgressResponse:
    return PlayerProgressResponse(
        **progress,
        unlocked_period_codes=list(snapshot["unlocked_period_codes"]),
        completed_period_codes=list(snapshot["completed_period_codes"]),
        current_period_code=str(snapshot["current_period_code"]) or None,
    )


def get_achievement_catalog_response(db_path: str | Path) -> AchievementCatalogResponse:
    achievements = _list_achievement_catalog_cached(db_path)
    return AchievementCatalogResponse(
        achievements=[
            AchievementCatalogItem(**achievement) for achievement in achievements
        ]
    )


def get_timeline_periods_response(db_path: str | Path) -> TimelinePeriodsResponse:
    periods = _list_timeline_periods_cached(db_path)
    return TimelinePeriodsResponse(
        periods=[TimelinePeriodItem(**period) for period in periods]
    )


def get_timeline_cities_response(
    db_path: str | Path,
    period_code: str,
) -> TimelineCitiesResponse:
    if not _period_exists_cached(db_path, period_code):
        raise HTTPException(status_code=404, detail=f"Timeline period '{period_code}' was not found.")

    cities = _list_period_cities_cached(db_path, period_code, only_available=True)
    return TimelineCitiesResponse(
        cities=[TimelineCityItem(**city) for city in cities]
    )


def get_city_content_response(
    db_path: str | Path,
    period_code: str,
    city: str,
) -> CityContentResponse:
    if not _period_exists_cached(db_path, period_code):
        raise HTTPException(status_code=404, detail=f"Timeline period '{period_code}' was not found.")

    content = _fetch_city_period_content_cached(db_path, city, period_code)
    if content is None:
        raise HTTPException(
            status_code=404,
            detail=f"City content for '{city}' in period '{period_code}' was not found.",
        )

    return CityContentResponse(content=CityContentItem(**content))


def get_city_content_summaries_response(
    db_path: str | Path,
    period_code: str,
) -> CityContentSummariesResponse:
    if not _period_exists_cached(db_path, period_code):
        raise HTTPException(status_code=404, detail=f"Timeline period '{period_code}' was not found.")

    items = _list_city_period_content_summaries_cached(db_path, period_code)
    return CityContentSummariesResponse(
        cities=[CityContentSummaryItem(**item) for item in items]
    )


def get_fact_challenge_progress_response(
    db_path: str | Path,
    player_id: str,
) -> FactChallengeProgressResponse:
    normalized_player_id = _normalize_player_id(player_id)
    progress = get_fact_challenge_progress(db_path, normalized_player_id)
    return FactChallengeProgressResponse(
        total_attempts=progress["total_attempts"],
        total_correct=progress["total_correct"],
        accuracy_percent=progress["accuracy_percent"],
        per_period_summary=[
            FactChallengePeriodProgressItem(**item)
            for item in progress["per_period_summary"]
        ],
    )


def _build_period_city_frontend_rows(
    db_path: str | Path,
    player_id: str,
    period_code: str,
    *,
    is_locked_for_testing: bool = False,
    player_achievements: list[dict[str, object]] | None = None,
    player_progress: dict[str, object] | None = None,
) -> list[dict[str, object]]:
    period_cities = _list_period_cities_cached(db_path, period_code, only_available=True)
    content_summaries = {
        item["city"]: item
        for item in _list_city_period_content_summaries_cached(db_path, period_code)
    }
    if player_progress is None:
        player_progress = get_player_progress(db_path, player_id)
    progress_by_city = {
        item["city"]: item
        for item in player_progress["city_progress"]
        if item["period_code"] == period_code
    }
    fact_success_rows = list_player_fact_success_cities(db_path, player_id, period_code)
    fact_success_by_city = {
        item["city"]: int(item["success_count"]) for item in fact_success_rows
    }
    achievements = (
        player_achievements
        if player_achievements is not None
        else list_player_achievements(db_path, player_id)
    )
    player_achievement_codes = {item["code"] for item in achievements}

    rows: list[dict[str, object]] = []
    for city_row in period_cities:
        city = str(city_row["city"])
        city_achievement_code = get_city_period_achievement_code(city, period_code)
        content = content_summaries.get(city)
        progress = progress_by_city.get(city)
        rows.append(
            {
                "city": city,
                "period_code": period_code,
                "display_name": city_row["display_name"],
                "subtitle": city_row["subtitle"],
                "quiz_available": bool(content["quiz_available"]) if content else False,
                "fact_challenge_available": bool(content["fact_challenge_available"])
                if content
                else False,
                "has_content": content is not None,
                "is_locked_for_testing": is_locked_for_testing,
                "passed_quiz_in_this_period": bool(progress and progress["passed_count"] > 0),
                "best_score_in_this_period": int(progress["best_score"]) if progress else 0,
                "total_attempts_in_this_period": int(progress["total_attempts"])
                if progress
                else 0,
                "has_fact_success_in_this_period": fact_success_by_city.get(city, 0) > 0,
                "unlocked_city_achievement": (
                    city_achievement_code in player_achievement_codes
                    if city_achievement_code
                    else False
                ),
            }
        )
    return rows


def _count_period_achievements_unlocked(
    period_code: str,
    cities: list[dict[str, object]],
    achievements: list[dict[str, object]],
) -> int:
    period_city_names = {str(item["city"]) for item in cities}
    passed_period_cities = {
        str(item["city"])
        for item in cities
        if bool(item["passed_quiz_in_this_period"])
    }

    count = 0
    for achievement in achievements:
        achievement_period = achievement.get("period_code")
        achievement_city = achievement.get("city")

        if achievement_period == period_code:
            count += 1
            continue

        if (
            achievement_city
            and str(achievement_city) in period_city_names
            and str(achievement_city) in passed_period_cities
        ):
            count += 1

    return count


def _resolve_default_period_code(progression_snapshot: dict[str, object]) -> str:
    states = list(progression_snapshot["states"])
    current_period_code = str(progression_snapshot["current_period_code"] or "").strip()
    if current_period_code and any(
        state["code"] == current_period_code and bool(state["is_unlocked"])
        for state in states
    ):
        return current_period_code

    unlocked_states = sorted(
        (state for state in states if bool(state["is_unlocked"])),
        key=lambda state: int(state["sort_order"]),
    )
    if unlocked_states:
        return str(unlocked_states[-1]["code"])
    if states:
        return str(states[0]["code"])
    return QUEST_START_PERIOD_CODE


def get_app_bootstrap_response(
    db_path: str | Path,
    player_id: str,
) -> AppBootstrapResponse:
    normalized_player_id = _normalize_player_id(player_id)
    player_progress = get_player_progress(db_path, normalized_player_id)
    fact_progress = get_fact_challenge_progress(db_path, normalized_player_id)
    achievements = list_player_achievements(db_path, normalized_player_id)
    progression_snapshot = _build_period_progress_snapshot(
        db_path,
        normalized_player_id,
        player_progress=player_progress,
    )
    return _build_app_bootstrap_response(
        db_path=db_path,
        player_id=normalized_player_id,
        player_progress=player_progress,
        fact_progress=fact_progress,
        achievements=achievements,
        progression_snapshot=progression_snapshot,
    )


def _build_app_bootstrap_response(
    *,
    db_path: str | Path,
    player_id: str,
    player_progress: dict[str, object],
    fact_progress: dict[str, object],
    achievements: list[dict[str, object]],
    progression_snapshot: dict[str, object],
    default_period_code: str | None = None,
    default_period_cities: list[dict[str, object]] | None = None,
) -> AppBootstrapResponse:
    resolved_default_period_code = default_period_code or _resolve_default_period_code(
        progression_snapshot
    )
    if default_period_cities is None:
        default_period_cities = _build_period_city_frontend_rows(
            db_path=db_path,
            player_id=player_id,
            period_code=resolved_default_period_code,
            player_achievements=achievements,
            player_progress=player_progress,
        )

    return AppBootstrapResponse(
        periods=[
            QuestPeriodStateItem(**state)
            for state in progression_snapshot["states"]
        ],
        default_period_code=resolved_default_period_code,
        player_summary=AppBootstrapPlayerSummary(
            total_tests_completed=player_progress["total_tests_completed"],
            total_passed_tests=player_progress["total_passed_tests"],
            total_achievements_unlocked=player_progress["total_achievements_unlocked"],
            fact_challenge_attempts=fact_progress["total_attempts"],
            fact_challenge_correct=fact_progress["total_correct"],
        ),
        quest_summary=AppBootstrapQuestSummary(
            current_period_code=resolved_default_period_code,
            current_period_title=str(
                _get_period_state(progression_snapshot, resolved_default_period_code)["title"]
            ),
            unlocked_periods_count=len(progression_snapshot["unlocked_period_codes"]),
            completed_periods_count=len(progression_snapshot["completed_period_codes"]),
            total_periods_count=len(progression_snapshot["states"]),
        ),
        achievements_preview=[
            UnlockedAchievement(**achievement) for achievement in achievements[:5]
        ],
        available_cities_for_default_period=[
            AppBootstrapCityItem(
                city=str(item["city"]),
                period_code=str(item["period_code"]),
                display_name=str(item["display_name"]),
                subtitle=item["subtitle"],
                quiz_available=bool(item["quiz_available"]),
                fact_challenge_available=bool(item["fact_challenge_available"]),
                has_content=bool(item["has_content"]),
            )
            for item in default_period_cities
        ],
    )


def get_profile_dashboard_response(
    db_path: str | Path,
    player_id: str,
) -> ProfileDashboardResponse:
    normalized_player_id = _normalize_player_id(player_id)
    player_progress = get_player_progress(db_path, normalized_player_id)
    fact_progress = get_fact_challenge_progress(db_path, normalized_player_id)
    achievements = list_player_achievements(db_path, normalized_player_id)
    progression_snapshot = _build_period_progress_snapshot(
        db_path,
        normalized_player_id,
        player_progress=player_progress,
    )

    return ProfileDashboardResponse(
        bootstrap=_build_app_bootstrap_response(
            db_path=db_path,
            player_id=normalized_player_id,
            player_progress=player_progress,
            fact_progress=fact_progress,
            achievements=achievements,
            progression_snapshot=progression_snapshot,
        ),
        progress=_build_player_progress_response(player_progress, progression_snapshot),
        achievements=PlayerAchievementsResponse(
            achievements=[UnlockedAchievement(**achievement) for achievement in achievements]
        ),
        catalog=get_achievement_catalog_response(db_path),
    )


def _build_map_state_response(
    *,
    db_path: str | Path,
    player_id: str,
    period_code: str,
    player_progress: dict[str, object],
    achievements: list[dict[str, object]],
    progression_snapshot: dict[str, object],
    period_cities: list[dict[str, object]] | None = None,
) -> MapStateResponse:
    period_state = _get_period_state(progression_snapshot, period_code)
    cities = (
        period_cities
        if period_cities is not None
        else _build_period_city_frontend_rows(
            db_path,
            player_id,
            period_code,
            is_locked_for_testing=not bool(period_state["is_unlocked"]),
            player_achievements=achievements,
            player_progress=player_progress,
        )
    )
    total_cities = len(cities)
    cities_passed = sum(1 for item in cities if bool(item["passed_quiz_in_this_period"]))
    fact_correct_count = sum(
        1 for item in cities if bool(item["has_fact_success_in_this_period"])
    )
    period_achievements_unlocked = _count_period_achievements_unlocked(
        period_code,
        cities,
        achievements,
    )
    completion_percent = round((cities_passed / total_cities) * 100) if total_cities else 0

    return MapStateResponse(
        period_code=period_code,
        summary=MapStatePeriodSummary(
            period_code=period_code,
            total_cities=total_cities,
            cities_passed=cities_passed,
            fact_correct_count=fact_correct_count,
            period_achievements_unlocked=period_achievements_unlocked,
            completion_percent=completion_percent,
            is_unlocked_for_progression=bool(period_state["is_unlocked"]),
            is_completed=bool(period_state["is_completed"]),
            is_current_quest_period=bool(period_state["is_current"]),
            remaining_cities=int(period_state["remaining_cities"]),
            next_period_code=period_state["next_period_code"],
            next_period_title=period_state["next_period_title"],
            next_period_unlocked=bool(
                period_state["next_period_code"]
                and period_state["next_period_code"]
                in progression_snapshot["unlocked_period_codes"]
            ),
        ),
        quest_periods=[
            QuestPeriodStateItem(**state)
            for state in progression_snapshot["states"]
        ],
        cities=[
            MapStateCityItem(
                city=str(item["city"]),
                display_name=str(item["display_name"]),
                subtitle=item["subtitle"],
                quiz_available=bool(item["quiz_available"]),
                fact_challenge_available=bool(item["fact_challenge_available"]),
                has_content=bool(item["has_content"]),
                is_locked_for_testing=bool(item["is_locked_for_testing"]),
                passed_quiz_in_this_period=bool(item["passed_quiz_in_this_period"]),
                best_score_in_this_period=int(item["best_score_in_this_period"]),
                total_attempts_in_this_period=int(item["total_attempts_in_this_period"]),
                has_fact_success_in_this_period=bool(
                    item["has_fact_success_in_this_period"]
                ),
                unlocked_city_achievement=bool(item["unlocked_city_achievement"]),
            )
            for item in cities
        ],
    )


def get_map_state_response(
    db_path: str | Path,
    player_id: str,
    period_code: str,
) -> MapStateResponse:
    normalized_player_id = _normalize_player_id(player_id)
    player_progress = get_player_progress(db_path, normalized_player_id)
    achievements = list_player_achievements(db_path, normalized_player_id)
    progression_snapshot = _build_period_progress_snapshot(
        db_path,
        normalized_player_id,
        player_progress=player_progress,
    )
    return _build_map_state_response(
        db_path=db_path,
        player_id=normalized_player_id,
        period_code=period_code,
        player_progress=player_progress,
        achievements=achievements,
        progression_snapshot=progression_snapshot,
    )


def get_map_initial_response(
    db_path: str | Path,
    player_id: str,
) -> MapInitialResponse:
    normalized_player_id = _normalize_player_id(player_id)
    player_progress = get_player_progress(db_path, normalized_player_id)
    fact_progress = get_fact_challenge_progress(db_path, normalized_player_id)
    achievements = list_player_achievements(db_path, normalized_player_id)
    progression_snapshot = _build_period_progress_snapshot(
        db_path,
        normalized_player_id,
        player_progress=player_progress,
    )
    default_period_code = _resolve_default_period_code(progression_snapshot)
    period_state = _get_period_state(progression_snapshot, default_period_code)
    default_period_cities = _build_period_city_frontend_rows(
        db_path=db_path,
        player_id=normalized_player_id,
        period_code=default_period_code,
        is_locked_for_testing=not bool(period_state["is_unlocked"]),
        player_achievements=achievements,
        player_progress=player_progress,
    )
    bootstrap = _build_app_bootstrap_response(
        db_path=db_path,
        player_id=normalized_player_id,
        player_progress=player_progress,
        fact_progress=fact_progress,
        achievements=achievements,
        progression_snapshot=progression_snapshot,
        default_period_code=default_period_code,
        default_period_cities=default_period_cities,
    )

    return MapInitialResponse(
        bootstrap=bootstrap,
        map_state=_build_map_state_response(
            db_path=db_path,
            player_id=normalized_player_id,
            period_code=default_period_code,
            player_progress=player_progress,
            achievements=achievements,
            progression_snapshot=progression_snapshot,
            period_cities=default_period_cities,
        ),
    )
