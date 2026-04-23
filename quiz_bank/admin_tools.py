import sqlite3
from pathlib import Path
from typing import Any

from .constants import get_city_period_achievement_code
from .database import (
    _build_unique_username,
    _normalize_identity_username,
    _utc_now_iso,
    connect_db,
    ensure_database,
)

SITE_DISABLED_KEY = "site_disabled"


def get_site_disabled(db_path: str | Path) -> bool:
    ensure_database(db_path)
    connection = connect_db(db_path)
    try:
        row = connection.execute(
            "SELECT value FROM app_metadata WHERE key = ?",
            (SITE_DISABLED_KEY,),
        ).fetchone()
    finally:
        connection.close()
    return str(row["value"]).lower() in {"1", "true", "yes", "on"} if row else False


def set_site_disabled(db_path: str | Path, disabled: bool) -> None:
    ensure_database(db_path)
    connection = connect_db(db_path)
    try:
        with connection:
            connection.execute(
                """
                INSERT INTO app_metadata (key, value, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET
                    value = excluded.value,
                    updated_at = excluded.updated_at
                """,
                (SITE_DISABLED_KEY, "1" if disabled else "0", _utc_now_iso()),
            )
    finally:
        connection.close()


def list_admin_users(
    db_path: str | Path,
    *,
    page: int = 0,
    page_size: int = 6,
    query: str | None = None,
) -> dict[str, Any]:
    ensure_database(db_path)
    page = max(0, page)
    page_size = max(1, min(page_size, 10))
    offset = page * page_size
    query_text = (query or "").strip()
    where = "WHERE 1 = 1"
    params: list[Any] = []
    if query_text:
        where += " AND (LOWER(username) LIKE LOWER(?) OR LOWER(email) LIKE LOWER(?) OR id LIKE ?)"
        like = f"%{query_text}%"
        params.extend([like, like, like])

    connection = connect_db(db_path)
    try:
        total = int(
            connection.execute(
                f"SELECT COUNT(*) FROM users {where}",
                tuple(params),
            ).fetchone()[0]
        )
        rows = connection.execute(
            f"""
            SELECT
                users.id,
                users.username,
                users.email,
                users.created_at,
                users.avatar_url,
                COALESCE(SUM(player_city_progress.best_score), 0) AS total_score,
                COALESCE(SUM(player_city_progress.total_attempts), 0) AS total_tests,
                (
                    SELECT COUNT(*)
                    FROM player_achievements
                    WHERE player_achievements.player_id = users.id
                ) AS achievements_count
            FROM users
            LEFT JOIN player_city_progress
                ON player_city_progress.player_id = users.id
               AND player_city_progress.city != 'Р•РќРў'
            {where}
            GROUP BY users.id
            ORDER BY users.created_at DESC, users.username ASC
            LIMIT ?
            OFFSET ?
            """,
            tuple([*params, page_size, offset]),
        ).fetchall()
    finally:
        connection.close()

    return {
        "users": [dict(row) for row in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
        "query": query_text,
    }


def get_admin_user(db_path: str | Path, user_id: str) -> dict[str, Any] | None:
    ensure_database(db_path)
    connection = connect_db(db_path)
    try:
        row = connection.execute(
            """
            SELECT id, username, email, created_at, avatar_url
            FROM users
            WHERE id = ?
            """,
            (user_id,),
        ).fetchone()
        if row is None:
            return None

        stats = connection.execute(
            """
            SELECT
                COALESCE(SUM(best_score), 0) AS total_score,
                COALESCE(SUM(total_attempts), 0) AS total_tests,
                COALESCE(SUM(CASE WHEN passed_count > 0 THEN 1 ELSE 0 END), 0) AS passed_cities
            FROM player_city_progress
            WHERE player_id = ? AND city != 'Р•РќРў'
            """,
            (user_id,),
        ).fetchone()
        achievements_count = int(
            connection.execute(
                "SELECT COUNT(*) FROM player_achievements WHERE player_id = ?",
                (user_id,),
            ).fetchone()[0]
        )
        ent_attempts = int(
            connection.execute(
                "SELECT COUNT(*) FROM test_results WHERE player_id = ? AND city = 'Р•РќРў'",
                (user_id,),
            ).fetchone()[0]
        )
    finally:
        connection.close()

    payload = dict(row)
    payload.update(dict(stats))
    payload["achievements_count"] = achievements_count
    payload["ent_attempts"] = ent_attempts
    return payload


def set_admin_username(db_path: str | Path, user_id: str, username: str) -> dict[str, Any] | None:
    ensure_database(db_path)
    normalized_username = _normalize_identity_username(username)
    if len(normalized_username) < 2:
        raise ValueError("Nickname must contain at least 2 characters.")

    connection = connect_db(db_path)
    try:
        with connection:
            row = connection.execute("SELECT id FROM users WHERE id = ?", (user_id,)).fetchone()
            if row is None:
                return None

            unique_username = _build_unique_username(connection, normalized_username, user_id)
            connection.execute(
                "UPDATE users SET username = ? WHERE id = ?",
                (unique_username, user_id),
            )
            updated = connection.execute(
                "SELECT id, username, email, created_at, avatar_url FROM users WHERE id = ?",
                (user_id,),
            ).fetchone()
    finally:
        connection.close()
    return dict(updated) if updated is not None else None


def list_admin_achievements(
    db_path: str | Path,
    user_id: str,
    *,
    page: int = 0,
    page_size: int = 7,
) -> dict[str, Any]:
    ensure_database(db_path)
    page = max(0, page)
    page_size = max(1, min(page_size, 10))
    offset = page * page_size
    connection = connect_db(db_path)
    try:
        total = int(connection.execute("SELECT COUNT(*) FROM achievements").fetchone()[0])
        rows = connection.execute(
            """
            SELECT
                achievements.code,
                achievements.name,
                achievements.description,
                achievements.city,
                achievements.period_code,
                CASE WHEN player_achievements.id IS NULL THEN 0 ELSE 1 END AS unlocked
            FROM achievements
            LEFT JOIN player_achievements
                ON player_achievements.achievement_code = achievements.code
               AND player_achievements.player_id = ?
            LEFT JOIN timeline_periods
                ON timeline_periods.code = achievements.period_code
            ORDER BY
                CASE
                    WHEN achievements.city IS NULL AND achievements.period_code IS NULL THEN 0
                    WHEN achievements.period_code IS NOT NULL THEN 1
                    ELSE 2
                END,
                COALESCE(timeline_periods.sort_order, achievements.threshold, 0),
                achievements.name ASC
            LIMIT ?
            OFFSET ?
            """,
            (user_id, page_size, offset),
        ).fetchall()
    finally:
        connection.close()
    return {
        "achievements": [dict(row) for row in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


def toggle_admin_achievement(db_path: str | Path, user_id: str, achievement_code: str) -> bool:
    ensure_database(db_path)
    connection = connect_db(db_path)
    try:
        with connection:
            exists = connection.execute(
                """
                SELECT 1
                FROM player_achievements
                WHERE player_id = ? AND achievement_code = ?
                """,
                (user_id, achievement_code),
            ).fetchone()
            if exists:
                connection.execute(
                    """
                    DELETE FROM player_achievements
                    WHERE player_id = ? AND achievement_code = ?
                    """,
                    (user_id, achievement_code),
                )
                return False

            connection.execute(
                """
                INSERT OR IGNORE INTO player_achievements (
                    player_id,
                    achievement_code,
                    unlocked_at
                )
                VALUES (?, ?, ?)
                """,
                (user_id, achievement_code, _utc_now_iso()),
            )
            return True
    finally:
        connection.close()


def list_admin_periods(db_path: str | Path, user_id: str) -> list[dict[str, Any]]:
    ensure_database(db_path)
    connection = connect_db(db_path)
    try:
        rows = connection.execute(
            """
            SELECT
                timeline_periods.code,
                timeline_periods.year_label,
                timeline_periods.title,
                timeline_periods.sort_order,
                COALESCE(player_period_overrides.is_unlocked, 0) AS manually_unlocked
            FROM timeline_periods
            LEFT JOIN player_period_overrides
                ON player_period_overrides.period_code = timeline_periods.code
               AND player_period_overrides.player_id = ?
               AND player_period_overrides.is_unlocked = 1
            ORDER BY timeline_periods.sort_order ASC, timeline_periods.code ASC
            """,
            (user_id,),
        ).fetchall()
    finally:
        connection.close()
    return [dict(row) for row in rows]


def list_admin_period_cities(
    db_path: str | Path,
    user_id: str,
    period_code: str,
) -> list[dict[str, Any]]:
    ensure_database(db_path)
    connection = connect_db(db_path)
    try:
        rows = connection.execute(
            """
            SELECT
                city_periods.city,
                city_periods.display_name,
                city_periods.period_code,
                COALESCE(player_city_progress.best_score, 0) AS best_score,
                COALESCE(player_city_progress.passed_count, 0) AS passed_count,
                COALESCE(player_city_progress.total_attempts, 0) AS total_attempts
            FROM city_periods
            LEFT JOIN player_city_progress
                ON player_city_progress.player_id = ?
               AND player_city_progress.city = city_periods.city
               AND player_city_progress.period_code = city_periods.period_code
            WHERE city_periods.period_code = ? AND city_periods.is_available = 1
            ORDER BY city_periods.display_name ASC, city_periods.city ASC
            """,
            (user_id, period_code),
        ).fetchall()
    finally:
        connection.close()
    return [dict(row) for row in rows]


def set_admin_period_unlocked(
    db_path: str | Path,
    user_id: str,
    period_code: str,
    unlocked: bool,
) -> None:
    ensure_database(db_path)
    connection = connect_db(db_path)
    try:
        with connection:
            if unlocked:
                connection.execute(
                    """
                    INSERT INTO player_period_overrides (
                        player_id,
                        period_code,
                        is_unlocked,
                        updated_at
                    )
                    VALUES (?, ?, 1, ?)
                    ON CONFLICT(player_id, period_code) DO UPDATE SET
                        is_unlocked = 1,
                        updated_at = excluded.updated_at
                    """,
                    (user_id, period_code, _utc_now_iso()),
                )
            else:
                connection.execute(
                    """
                    DELETE FROM player_period_overrides
                    WHERE player_id = ? AND period_code = ?
                    """,
                    (user_id, period_code),
                )
    finally:
        connection.close()


def set_admin_city_score(
    db_path: str | Path,
    user_id: str,
    period_code: str,
    city: str,
    score: int,
) -> None:
    ensure_database(db_path)
    normalized_score = max(0, min(100, int(score)))
    correct_answers = round(normalized_score / 20)
    passed = normalized_score >= 80
    now = _utc_now_iso()
    achievement_code = get_city_period_achievement_code(city, period_code)

    connection = connect_db(db_path)
    try:
        with connection:
            connection.execute(
                """
                DELETE FROM test_results
                WHERE player_id = ? AND city = ? AND period_code = ?
                """,
                (user_id, city, period_code),
            )
            connection.execute(
                """
                INSERT INTO test_results (
                    player_id,
                    city,
                    period_code,
                    total_questions,
                    correct_answers,
                    passed,
                    completed_at
                )
                VALUES (?, ?, ?, 5, ?, ?, ?)
                """,
                (user_id, city, period_code, correct_answers, int(passed), now),
            )
            connection.execute(
                """
                INSERT INTO player_city_progress (
                    player_id,
                    city,
                    period_code,
                    passed_count,
                    best_score,
                    total_attempts,
                    last_completed_at
                )
                VALUES (?, ?, ?, ?, ?, 1, ?)
                ON CONFLICT(player_id, city, period_code) DO UPDATE SET
                    passed_count = excluded.passed_count,
                    best_score = excluded.best_score,
                    total_attempts = 1,
                    last_completed_at = excluded.last_completed_at
                """,
                (user_id, city, period_code, int(passed), normalized_score, now),
            )
            if achievement_code:
                if passed:
                    connection.execute(
                        """
                        INSERT OR IGNORE INTO player_achievements (
                            player_id,
                            achievement_code,
                            unlocked_at
                        )
                        VALUES (?, ?, ?)
                        """,
                        (user_id, achievement_code, now),
                    )
                else:
                    connection.execute(
                        """
                        DELETE FROM player_achievements
                        WHERE player_id = ? AND achievement_code = ?
                        """,
                        (user_id, achievement_code),
                    )
    finally:
        connection.close()


def reset_admin_city_progress(
    db_path: str | Path,
    user_id: str,
    period_code: str,
    city: str,
) -> None:
    ensure_database(db_path)
    achievement_code = get_city_period_achievement_code(city, period_code)
    connection = connect_db(db_path)
    try:
        with connection:
            connection.execute(
                """
                DELETE FROM player_city_progress
                WHERE player_id = ? AND city = ? AND period_code = ?
                """,
                (user_id, city, period_code),
            )
            connection.execute(
                """
                DELETE FROM test_results
                WHERE player_id = ? AND city = ? AND period_code = ?
                """,
                (user_id, city, period_code),
            )
            if achievement_code:
                connection.execute(
                    """
                    DELETE FROM player_achievements
                    WHERE player_id = ? AND achievement_code = ?
                    """,
                    (user_id, achievement_code),
                )
    finally:
        connection.close()


def delete_admin_user(db_path: str | Path, user_id: str) -> bool:
    ensure_database(db_path)
    connection = connect_db(db_path)
    try:
        with connection:
            exists = connection.execute("SELECT 1 FROM users WHERE id = ?", (user_id,)).fetchone()
            if not exists:
                return False

            result_ids = [
                int(row["id"])
                for row in connection.execute(
                    "SELECT id FROM test_results WHERE player_id = ?",
                    (user_id,),
                ).fetchall()
            ]
            if result_ids:
                placeholders = ", ".join("?" for _ in result_ids)
                connection.execute(
                    f"DELETE FROM ent_attempt_ai_analysis WHERE test_result_id IN ({placeholders})",
                    tuple(result_ids),
                )
                connection.execute(
                    f"DELETE FROM ent_attempt_details WHERE test_result_id IN ({placeholders})",
                    tuple(result_ids),
                )

            for table_name, column_name in (
                ("test_results", "player_id"),
                ("player_city_progress", "player_id"),
                ("player_achievements", "player_id"),
                ("test_sessions", "player_id"),
                ("fact_challenge_results", "player_id"),
                ("fact_challenge_sessions", "player_id"),
                ("player_period_overrides", "player_id"),
                ("users", "id"),
            ):
                connection.execute(
                    f"DELETE FROM {table_name} WHERE {column_name} = ?",
                    (user_id,),
                )
            return True
    finally:
        connection.close()
