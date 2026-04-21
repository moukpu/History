import math
import random
import sqlite3
from datetime import datetime, timezone
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
    FactChallengeProgressResponse,
    FactChallengePeriodProgressItem,
    MapStateCityItem,
    MapStatePeriodSummary,
    MapStateResponse,
    PlayerAchievementsResponse,
    PlayerProgressResponse,
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
    CITY_ACHIEVEMENT_CODES,
    CITY_MILESTONE_ACHIEVEMENTS,
    DEFAULT_PERIOD_CODE,
    FACT_MILESTONE_ACHIEVEMENTS,
    PASS_THRESHOLD,
    PERIOD_ACHIEVEMENT_CODES,
    PERIOD_MASTER_ACHIEVEMENT_CODES,
    QUEST_START_PERIOD_CODE,
    PERIOD_UNLOCK_SEQUENCE,
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
    list_achievement_catalog,
    list_city_period_content_summaries,
    list_period_cities,
    list_player_fact_success_cities,
    list_player_achievements,
    list_timeline_periods,
    mark_fact_challenge_session_completed,
    timeline_period_exists,
    upsert_player_city_progress,
)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _normalize_player_id(player_id: str) -> str:
    normalized = player_id.strip()
    if not normalized:
        raise HTTPException(status_code=400, detail="player_id must not be empty.")
    return normalized


def _calculate_score_percent(correct_answers: int, total_questions: int) -> int:
    return round((correct_answers / total_questions) * 100)


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
) -> dict[str, object]:
    periods = sorted(
        list_timeline_periods(db_path),
        key=lambda item: int(item["sort_order"]),
    )
    player_progress = get_player_progress(db_path, player_id)
    progress_by_pair = {
        (str(item["period_code"]), str(item["city"])): item
        for item in player_progress["city_progress"]
    }

    states: list[dict[str, object]] = []
    for index, period in enumerate(periods):
        period_code = str(period["code"])
        cities = list_period_cities(db_path, period_code, only_available=True)
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
        is_unlocked = index == 0 or bool(states[index - 1]["is_completed"])

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
        is_unlocked = index == 0 or bool(states[index - 1]["is_completed"])
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


def _is_period_mastered(
    player_progress: dict[str, object],
    db_path: str | Path,
    period_code: str,
) -> bool:
    period_cities = list_period_cities(db_path, period_code, only_available=True)
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
            )
            for question in questions
        ],
    )


def _build_unlock_candidates(
    connection,
    player_id: str,
    city: str,
    period_code: str,
    correct_answers: int,
    total_questions: int,
) -> list[str]:
    candidates: list[str] = []
    player_progress = _get_player_progress_from_connection(connection, player_id)
    progression_snapshot = _build_period_progress_snapshot_from_connection(connection, player_id)
    city_achievement_code = CITY_ACHIEVEMENT_CODES.get(city)

    if count_player_passed_tests(connection, player_id) == 1:
        candidates.append("first_city_pass")

    if city_achievement_code:
        candidates.append(city_achievement_code)

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
                    ),
                    unlocked_at=completed_at,
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
        passed=passed,
        unlocked_achievements=unlocked_achievements,
        all_player_achievements_count=all_player_achievements_count,
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

            period_cities = list_period_cities(
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
    snapshot = _build_period_progress_snapshot(db_path, normalized_player_id)
    return PlayerProgressResponse(
        **progress,
        unlocked_period_codes=list(snapshot["unlocked_period_codes"]),
        completed_period_codes=list(snapshot["completed_period_codes"]),
        current_period_code=str(snapshot["current_period_code"]) or None,
    )


def get_achievement_catalog_response(db_path: str | Path) -> AchievementCatalogResponse:
    achievements = list_achievement_catalog(db_path)
    return AchievementCatalogResponse(
        achievements=[
            AchievementCatalogItem(**achievement) for achievement in achievements
        ]
    )


def get_timeline_periods_response(db_path: str | Path) -> TimelinePeriodsResponse:
    periods = list_timeline_periods(db_path)
    return TimelinePeriodsResponse(
        periods=[TimelinePeriodItem(**period) for period in periods]
    )


def get_timeline_cities_response(
    db_path: str | Path,
    period_code: str,
) -> TimelineCitiesResponse:
    ensure_database(db_path)
    connection = connect_db(db_path)
    try:
        _require_period(connection, period_code)
    finally:
        connection.close()

    cities = list_period_cities(db_path, period_code, only_available=True)
    return TimelineCitiesResponse(
        cities=[TimelineCityItem(**city) for city in cities]
    )


def get_city_content_response(
    db_path: str | Path,
    period_code: str,
    city: str,
) -> CityContentResponse:
    ensure_database(db_path)
    connection = connect_db(db_path)
    try:
        _require_period(connection, period_code)
    finally:
        connection.close()

    content = fetch_city_period_content(db_path, city, period_code)
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
    ensure_database(db_path)
    connection = connect_db(db_path)
    try:
        _require_period(connection, period_code)
    finally:
        connection.close()

    items = list_city_period_content_summaries(db_path, period_code)
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
) -> list[dict[str, object]]:
    period_cities = list_period_cities(db_path, period_code, only_available=True)
    content_summaries = {
        item["city"]: item
        for item in list_city_period_content_summaries(db_path, period_code)
    }
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
    player_achievement_codes = {
        item["code"] for item in list_player_achievements(db_path, player_id)
    }

    rows: list[dict[str, object]] = []
    for city_row in period_cities:
        city = str(city_row["city"])
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
                    CITY_ACHIEVEMENT_CODES.get(city) in player_achievement_codes
                    if CITY_ACHIEVEMENT_CODES.get(city)
                    else False
                ),
            }
        )
    return rows


def get_app_bootstrap_response(
    db_path: str | Path,
    player_id: str,
) -> AppBootstrapResponse:
    normalized_player_id = _normalize_player_id(player_id)
    player_progress = get_player_progress(db_path, normalized_player_id)
    fact_progress = get_fact_challenge_progress(db_path, normalized_player_id)
    achievements = list_player_achievements(db_path, normalized_player_id)
    progression_snapshot = _build_period_progress_snapshot(db_path, normalized_player_id)
    default_period_code = str(progression_snapshot["current_period_code"]) or QUEST_START_PERIOD_CODE
    default_period_cities = _build_period_city_frontend_rows(
        db_path=db_path,
        player_id=normalized_player_id,
        period_code=default_period_code,
    )

    return AppBootstrapResponse(
        periods=[
            QuestPeriodStateItem(**state)
            for state in progression_snapshot["states"]
        ],
        default_period_code=default_period_code,
        player_summary=AppBootstrapPlayerSummary(
            total_tests_completed=player_progress["total_tests_completed"],
            total_passed_tests=player_progress["total_passed_tests"],
            total_achievements_unlocked=player_progress["total_achievements_unlocked"],
            fact_challenge_attempts=fact_progress["total_attempts"],
            fact_challenge_correct=fact_progress["total_correct"],
        ),
        quest_summary=AppBootstrapQuestSummary(
            current_period_code=default_period_code,
            current_period_title=str(
                _get_period_state(progression_snapshot, default_period_code)["title"]
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


def get_map_state_response(
    db_path: str | Path,
    player_id: str,
    period_code: str,
) -> MapStateResponse:
    normalized_player_id = _normalize_player_id(player_id)
    ensure_database(db_path)
    connection = connect_db(db_path)
    try:
        _require_period(connection, period_code)
    finally:
        connection.close()

    progression_snapshot = _build_period_progress_snapshot(db_path, normalized_player_id)
    period_state = _get_period_state(progression_snapshot, period_code)
    cities = _build_period_city_frontend_rows(
        db_path,
        normalized_player_id,
        period_code,
        is_locked_for_testing=not bool(period_state["is_unlocked"]),
    )
    total_cities = len(cities)
    cities_passed = sum(1 for item in cities if bool(item["passed_quiz_in_this_period"]))
    fact_correct_count = sum(
        1 for item in cities if bool(item["has_fact_success_in_this_period"])
    )
    completion_percent = round((cities_passed / total_cities) * 100) if total_cities else 0

    return MapStateResponse(
        period_code=period_code,
        summary=MapStatePeriodSummary(
            period_code=period_code,
            total_cities=total_cities,
            cities_passed=cities_passed,
            fact_correct_count=fact_correct_count,
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
