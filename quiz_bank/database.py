import hashlib
import json
import secrets
import sqlite3
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Sequence

from .constants import (
    DEFAULT_CITY_PERIOD_CONTENT_PATH,
    DEFAULT_DATA_PATH,
    DEFAULT_FACT_CHALLENGE_DATA_PATH,
    DEFAULT_PERIOD_CODE,
    build_achievement_catalog,
    build_city_period_catalog,
    build_timeline_period_catalog,
)
from .city_content_validation import (
    load_city_period_content_json,
    validate_city_period_content,
)
from .fact_challenge_validation import (
    load_fact_challenges_json,
    validate_fact_challenges,
)
from .period_validation import validate_period_quiz_bank
from .validation import load_quiz_bank_json, validate_quiz_bank

_ENSURED_DATABASES: set[str] = set()


def connect_db(db_path: str | Path) -> sqlite3.Connection:
    connection = sqlite3.connect(db_path, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA busy_timeout = 10000")
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA temp_store = MEMORY")
    return connection


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _table_exists(connection: sqlite3.Connection, table_name: str) -> bool:
    row = connection.execute(
        """
        SELECT 1
        FROM sqlite_master
        WHERE type = 'table' AND name = ?
        """,
        (table_name,),
    ).fetchone()
    return row is not None


def _column_names(connection: sqlite3.Connection, table_name: str) -> set[str]:
    if not _table_exists(connection, table_name):
        return set()
    rows = connection.execute(f"PRAGMA table_info({table_name})").fetchall()
    return {row["name"] for row in rows}


def _create_target_tables(connection: sqlite3.Connection) -> None:
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS quizzes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            city TEXT NOT NULL COLLATE NOCASE,
            period_code TEXT NOT NULL,
            difficulty TEXT NOT NULL DEFAULT 'easy',
            question TEXT NOT NULL,
            options TEXT NOT NULL,
            correct_index INTEGER NOT NULL,
            fact TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS achievements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            city TEXT NULL,
            period_code TEXT NULL,
            threshold INTEGER NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS player_achievements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id TEXT NOT NULL,
            achievement_code TEXT NOT NULL,
            unlocked_at TEXT NOT NULL,
            UNIQUE(player_id, achievement_code)
        );

        CREATE TABLE IF NOT EXISTS test_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id TEXT NOT NULL,
            city TEXT NOT NULL,
            period_code TEXT NOT NULL,
            total_questions INTEGER NOT NULL,
            correct_answers INTEGER NOT NULL,
            passed INTEGER NOT NULL,
            completed_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS player_city_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id TEXT NOT NULL,
            city TEXT NOT NULL,
            period_code TEXT NOT NULL,
            passed_count INTEGER NOT NULL DEFAULT 0,
            best_score INTEGER NOT NULL DEFAULT 0,
            total_attempts INTEGER NOT NULL DEFAULT 0,
            last_completed_at TEXT NULL,
            UNIQUE(player_id, city, period_code)
        );

        CREATE TABLE IF NOT EXISTS test_sessions (
            id TEXT PRIMARY KEY,
            player_id TEXT NOT NULL,
            city TEXT NOT NULL,
            period_code TEXT NOT NULL,
            question_ids TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS timeline_periods (
            code TEXT PRIMARY KEY,
            year_label TEXT NOT NULL,
            title TEXT NOT NULL,
            sort_order INTEGER NOT NULL,
            description TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS city_periods (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            city TEXT NOT NULL,
            period_code TEXT NOT NULL,
            display_name TEXT NOT NULL,
            subtitle TEXT NULL,
            is_available INTEGER NOT NULL DEFAULT 1,
            UNIQUE(city, period_code)
        );

        CREATE TABLE IF NOT EXISTS city_period_content (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            city TEXT NOT NULL,
            period_code TEXT NOT NULL,
            display_name TEXT NOT NULL,
            subtitle TEXT NULL,
            short_description TEXT NOT NULL,
            history_summary TEXT NOT NULL,
            interesting_fact TEXT NOT NULL,
            old_name TEXT NULL,
            importance_reason TEXT NULL,
            image_keys TEXT NULL,
            quiz_available INTEGER NOT NULL DEFAULT 1,
            fact_challenge_available INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(city, period_code)
        );

        CREATE TABLE IF NOT EXISTS fact_challenges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            city TEXT NOT NULL,
            period_code TEXT NOT NULL,
            fact_text TEXT NOT NULL,
            difficulty TEXT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS fact_challenge_sessions (
            id TEXT PRIMARY KEY,
            player_id TEXT NOT NULL,
            period_code TEXT NOT NULL,
            challenge_id INTEGER NOT NULL,
            candidate_cities TEXT NOT NULL,
            created_at TEXT NOT NULL,
            is_completed INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS fact_challenge_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id TEXT NOT NULL,
            period_code TEXT NOT NULL,
            challenge_id INTEGER NOT NULL,
            selected_city TEXT NOT NULL,
            correct_city TEXT NOT NULL,
            is_correct INTEGER NOT NULL,
            completed_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL UNIQUE COLLATE NOCASE,
            email TEXT NOT NULL UNIQUE COLLATE NOCASE,
            password_hash TEXT NOT NULL,
            password_salt TEXT NOT NULL,
            auth_provider TEXT NOT NULL DEFAULT 'password',
            google_sub TEXT NULL,
            avatar_url TEXT NULL,
            created_at TEXT NOT NULL
        );
        """
    )


def _migrate_quizzes(connection: sqlite3.Connection) -> None:
    columns = _column_names(connection, "quizzes")
    if not columns:
        return

    if "period_code" not in columns:
        connection.execute("ALTER TABLE quizzes ADD COLUMN period_code TEXT")
    if "difficulty" not in columns:
        connection.execute(
            "ALTER TABLE quizzes ADD COLUMN difficulty TEXT NOT NULL DEFAULT 'easy'"
        )

    connection.execute(
        """
        UPDATE quizzes
        SET period_code = ?
        WHERE period_code IS NULL OR TRIM(period_code) = ''
        """,
        (DEFAULT_PERIOD_CODE,),
    )
    connection.execute(
        """
        UPDATE quizzes
        SET difficulty = 'easy'
        WHERE difficulty IS NULL OR TRIM(difficulty) = ''
        """
    )


def _migrate_achievements(connection: sqlite3.Connection) -> None:
    columns = _column_names(connection, "achievements")
    if columns and "period_code" not in columns:
        connection.execute("ALTER TABLE achievements ADD COLUMN period_code TEXT NULL")


def _migrate_test_results(connection: sqlite3.Connection) -> None:
    columns = _column_names(connection, "test_results")
    if columns and "period_code" not in columns:
        connection.execute("ALTER TABLE test_results ADD COLUMN period_code TEXT")
        connection.execute(
            """
            UPDATE test_results
            SET period_code = ?
            WHERE period_code IS NULL OR TRIM(period_code) = ''
            """,
            (DEFAULT_PERIOD_CODE,),
        )


def _migrate_test_sessions(connection: sqlite3.Connection) -> None:
    columns = _column_names(connection, "test_sessions")
    if columns and "period_code" not in columns:
        connection.execute("ALTER TABLE test_sessions ADD COLUMN period_code TEXT")
        connection.execute(
            """
            UPDATE test_sessions
            SET period_code = ?
            WHERE period_code IS NULL OR TRIM(period_code) = ''
            """,
            (DEFAULT_PERIOD_CODE,),
        )


def _migrate_player_city_progress(connection: sqlite3.Connection) -> None:
    columns = _column_names(connection, "player_city_progress")
    if not columns or "period_code" in columns:
        return

    connection.execute(
        "ALTER TABLE player_city_progress RENAME TO player_city_progress_legacy"
    )
    connection.execute(
        """
        CREATE TABLE player_city_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id TEXT NOT NULL,
            city TEXT NOT NULL,
            period_code TEXT NOT NULL,
            passed_count INTEGER NOT NULL DEFAULT 0,
            best_score INTEGER NOT NULL DEFAULT 0,
            total_attempts INTEGER NOT NULL DEFAULT 0,
            last_completed_at TEXT NULL,
            UNIQUE(player_id, city, period_code)
        )
        """
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
        SELECT
            player_id,
            city,
            ?,
            passed_count,
            best_score,
            total_attempts,
            last_completed_at
        FROM player_city_progress_legacy
        """,
        (DEFAULT_PERIOD_CODE,),
    )
    connection.execute("DROP TABLE player_city_progress_legacy")


def _normalize_identity_email(email: str) -> str:
    return email.strip().lower()


def _normalize_identity_username(username: str) -> str:
    return " ".join(username.strip().split())


def _user_activity_score(connection: sqlite3.Connection, user_id: str) -> int:
    tables = (
        ("test_results", "player_id"),
        ("player_city_progress", "player_id"),
        ("player_achievements", "player_id"),
        ("fact_challenge_results", "player_id"),
    )
    total = 0
    for table_name, column_name in tables:
        if not _table_exists(connection, table_name):
            continue
        total += int(
            connection.execute(
                f"SELECT COUNT(*) FROM {table_name} WHERE {column_name} = ?",
                (user_id,),
            ).fetchone()[0]
        )
    return total


def _choose_canonical_user(
    connection: sqlite3.Connection,
    rows: Sequence[sqlite3.Row],
) -> sqlite3.Row:
    return sorted(
        rows,
        key=lambda row: (
            -_user_activity_score(connection, str(row["id"])),
            str(row["created_at"] or ""),
            str(row["id"]),
        ),
    )[0]


def _merge_player_city_progress(
    connection: sqlite3.Connection,
    source_user_id: str,
    target_user_id: str,
) -> None:
    rows = connection.execute(
        """
        SELECT
            city,
            period_code,
            passed_count,
            best_score,
            total_attempts,
            last_completed_at
        FROM player_city_progress
        WHERE player_id = ?
        """,
        (source_user_id,),
    ).fetchall()

    for row in rows:
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
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(player_id, city, period_code) DO UPDATE SET
                passed_count = player_city_progress.passed_count + excluded.passed_count,
                best_score = MAX(player_city_progress.best_score, excluded.best_score),
                total_attempts = player_city_progress.total_attempts + excluded.total_attempts,
                last_completed_at = CASE
                    WHEN excluded.last_completed_at IS NULL THEN player_city_progress.last_completed_at
                    WHEN player_city_progress.last_completed_at IS NULL THEN excluded.last_completed_at
                    WHEN excluded.last_completed_at > player_city_progress.last_completed_at THEN excluded.last_completed_at
                    ELSE player_city_progress.last_completed_at
                END
            """,
            (
                target_user_id,
                row["city"],
                row["period_code"],
                int(row["passed_count"] or 0),
                int(row["best_score"] or 0),
                int(row["total_attempts"] or 0),
                row["last_completed_at"],
            ),
        )

    connection.execute(
        "DELETE FROM player_city_progress WHERE player_id = ?",
        (source_user_id,),
    )


def _merge_player_achievements(
    connection: sqlite3.Connection,
    source_user_id: str,
    target_user_id: str,
) -> None:
    rows = connection.execute(
        """
        SELECT achievement_code, unlocked_at
        FROM player_achievements
        WHERE player_id = ?
        """,
        (source_user_id,),
    ).fetchall()

    for row in rows:
        connection.execute(
            """
            INSERT OR IGNORE INTO player_achievements (
                player_id,
                achievement_code,
                unlocked_at
            )
            VALUES (?, ?, ?)
            """,
            (target_user_id, row["achievement_code"], row["unlocked_at"]),
        )

    connection.execute(
        "DELETE FROM player_achievements WHERE player_id = ?",
        (source_user_id,),
    )


def _merge_user_into(
    connection: sqlite3.Connection,
    source_user_id: str,
    target_user_id: str,
) -> None:
    if source_user_id == target_user_id:
        return

    _merge_player_city_progress(connection, source_user_id, target_user_id)
    _merge_player_achievements(connection, source_user_id, target_user_id)

    for table_name in (
        "test_results",
        "test_sessions",
        "fact_challenge_results",
        "fact_challenge_sessions",
    ):
        if _table_exists(connection, table_name):
            connection.execute(
                f"UPDATE {table_name} SET player_id = ? WHERE player_id = ?",
                (target_user_id, source_user_id),
            )

    source = connection.execute(
        """
        SELECT google_sub, avatar_url
        FROM users
        WHERE id = ?
        """,
        (source_user_id,),
    ).fetchone()
    if source is not None:
        if source["google_sub"]:
            connection.execute(
                """
                UPDATE users
                SET google_sub = COALESCE(NULLIF(google_sub, ''), ?)
                WHERE id = ?
                """,
                (source["google_sub"], target_user_id),
            )
        if source["avatar_url"]:
            connection.execute(
                """
                UPDATE users
                SET avatar_url = COALESCE(NULLIF(avatar_url, ''), ?)
                WHERE id = ?
                """,
                (source["avatar_url"], target_user_id),
            )

    connection.execute("DELETE FROM users WHERE id = ?", (source_user_id,))


def _merge_duplicate_users_by_email(connection: sqlite3.Connection) -> None:
    rows = connection.execute(
        """
        SELECT LOWER(TRIM(email)) AS normalized_email
        FROM users
        WHERE TRIM(email) != ''
        GROUP BY LOWER(TRIM(email))
        HAVING COUNT(*) > 1
        """
    ).fetchall()

    for row in rows:
        duplicates = connection.execute(
            """
            SELECT id, username, email, created_at
            FROM users
            WHERE LOWER(TRIM(email)) = ?
            """,
            (row["normalized_email"],),
        ).fetchall()
        if len(duplicates) < 2:
            continue

        canonical = _choose_canonical_user(connection, duplicates)
        target_user_id = str(canonical["id"])
        for duplicate in duplicates:
            source_user_id = str(duplicate["id"])
            if source_user_id != target_user_id:
                _merge_user_into(connection, source_user_id, target_user_id)


def _build_unique_username(
    connection: sqlite3.Connection,
    base_username: str,
    user_id: str | None = None,
) -> str:
    normalized_base = _normalize_identity_username(base_username) or "player"
    candidate = normalized_base[:30]
    suffix_source = (user_id or secrets.token_hex(4)).replace("-", "")
    suffix_index = 0

    while True:
        row = connection.execute(
            """
            SELECT id
            FROM users
            WHERE LOWER(TRIM(username)) = LOWER(TRIM(?))
            """,
            (candidate,),
        ).fetchone()
        if row is None or (user_id is not None and row["id"] == user_id):
            return candidate

        suffix_index += 1
        suffix = f"-{suffix_source[:6]}{suffix_index if suffix_index > 1 else ''}"
        candidate = f"{normalized_base[: max(1, 30 - len(suffix))]}{suffix}"


def _dedupe_usernames(connection: sqlite3.Connection) -> None:
    rows = connection.execute(
        """
        SELECT LOWER(TRIM(username)) AS normalized_username
        FROM users
        WHERE TRIM(username) != ''
        GROUP BY LOWER(TRIM(username))
        HAVING COUNT(*) > 1
        """
    ).fetchall()

    for row in rows:
        duplicates = connection.execute(
            """
            SELECT id, username, email, created_at
            FROM users
            WHERE LOWER(TRIM(username)) = ?
            """,
            (row["normalized_username"],),
        ).fetchall()
        if len(duplicates) < 2:
            continue

        canonical = _choose_canonical_user(connection, duplicates)
        for duplicate in duplicates:
            user_id = str(duplicate["id"])
            if user_id == str(canonical["id"]):
                continue
            next_username = _build_unique_username(
                connection,
                str(duplicate["username"]),
                user_id,
            )
            connection.execute(
                "UPDATE users SET username = ? WHERE id = ?",
                (next_username, user_id),
            )


def _migrate_users(connection: sqlite3.Connection) -> None:
    columns = _column_names(connection, "users")
    if not columns:
        return

    if "auth_provider" not in columns:
        connection.execute(
            "ALTER TABLE users ADD COLUMN auth_provider TEXT NOT NULL DEFAULT 'password'"
        )
    if "google_sub" not in columns:
        connection.execute("ALTER TABLE users ADD COLUMN google_sub TEXT NULL")
    if "avatar_url" not in columns:
        connection.execute("ALTER TABLE users ADD COLUMN avatar_url TEXT NULL")

    connection.execute(
        """
        UPDATE users
        SET
            email = LOWER(TRIM(email)),
            username = TRIM(username),
            auth_provider = COALESCE(NULLIF(TRIM(auth_provider), ''), 'password')
        """
    )
    _merge_duplicate_users_by_email(connection)
    _dedupe_usernames(connection)


def _ensure_indexes(connection: sqlite3.Connection) -> None:
    connection.executescript(
        """
        DROP INDEX IF EXISTS quizzes_city_question_uq;
        CREATE UNIQUE INDEX IF NOT EXISTS quizzes_city_period_question_uq
        ON quizzes(city, period_code, question);

        CREATE INDEX IF NOT EXISTS quizzes_city_period_idx
        ON quizzes(city, period_code);

        CREATE INDEX IF NOT EXISTS player_achievements_player_id_idx
        ON player_achievements(player_id);

        CREATE INDEX IF NOT EXISTS test_results_player_id_idx
        ON test_results(player_id);

        CREATE INDEX IF NOT EXISTS test_results_player_city_period_idx
        ON test_results(player_id, city, period_code);

        CREATE INDEX IF NOT EXISTS player_city_progress_player_id_idx
        ON player_city_progress(player_id);

        CREATE INDEX IF NOT EXISTS player_city_progress_player_city_idx
        ON player_city_progress(player_id, city);

        CREATE INDEX IF NOT EXISTS test_sessions_player_id_idx
        ON test_sessions(player_id);

        CREATE INDEX IF NOT EXISTS city_periods_period_code_idx
        ON city_periods(period_code);

        CREATE INDEX IF NOT EXISTS city_periods_city_idx
        ON city_periods(city);

        CREATE INDEX IF NOT EXISTS city_period_content_period_code_idx
        ON city_period_content(period_code);

        CREATE INDEX IF NOT EXISTS city_period_content_city_period_idx
        ON city_period_content(city, period_code);

        CREATE UNIQUE INDEX IF NOT EXISTS fact_challenges_city_period_fact_uq
        ON fact_challenges(city, period_code, fact_text);

        CREATE INDEX IF NOT EXISTS fact_challenges_period_active_idx
        ON fact_challenges(period_code, is_active);

        CREATE INDEX IF NOT EXISTS fact_challenge_sessions_player_id_idx
        ON fact_challenge_sessions(player_id);

        CREATE INDEX IF NOT EXISTS fact_challenge_sessions_period_idx
        ON fact_challenge_sessions(period_code);

        CREATE INDEX IF NOT EXISTS fact_challenge_results_player_id_idx
        ON fact_challenge_results(player_id);

        CREATE INDEX IF NOT EXISTS fact_challenge_results_player_period_idx
        ON fact_challenge_results(player_id, period_code);

        CREATE UNIQUE INDEX IF NOT EXISTS users_email_normalized_uq
        ON users(LOWER(TRIM(email)));

        CREATE UNIQUE INDEX IF NOT EXISTS users_username_normalized_uq
        ON users(LOWER(TRIM(username)));

        CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_uq
        ON users(google_sub)
        WHERE google_sub IS NOT NULL AND TRIM(google_sub) != '';
        """
    )


def ensure_database(db_path: str | Path) -> None:
    db_key = str(Path(db_path).resolve())
    if db_key in _ENSURED_DATABASES:
        return

    connection = connect_db(db_path)
    try:
        _create_target_tables(connection)
        _migrate_quizzes(connection)
        _migrate_achievements(connection)
        _migrate_test_results(connection)
        _migrate_test_sessions(connection)
        _migrate_player_city_progress(connection)
        _migrate_users(connection)
        _ensure_indexes(connection)
        connection.commit()
        _ENSURED_DATABASES.add(db_key)
    finally:
        connection.close()


def seed_timeline_periods(
    db_path: str | Path,
    created_at: str | None = None,
) -> None:
    ensure_database(db_path)
    created_at = created_at or _utc_now_iso()
    connection = connect_db(db_path)
    try:
        with connection:
            connection.executemany(
                """
                INSERT OR IGNORE INTO timeline_periods (
                    code,
                    year_label,
                    title,
                    sort_order,
                    description,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        period["code"],
                        period["year_label"],
                        period["title"],
                        period["sort_order"],
                        period["description"],
                        created_at,
                    )
                    for period in build_timeline_period_catalog()
                ],
            )
    finally:
        connection.close()


def seed_city_periods(db_path: str | Path) -> None:
    ensure_database(db_path)
    connection = connect_db(db_path)
    try:
        with connection:
            connection.execute("DELETE FROM city_periods")
            connection.executemany(
                """
                INSERT INTO city_periods (
                    city,
                    period_code,
                    display_name,
                    subtitle,
                    is_available
                )
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(city, period_code) DO UPDATE SET
                    display_name = excluded.display_name,
                    subtitle = excluded.subtitle,
                    is_available = excluded.is_available
                """,
                [
                    (
                        item["city"],
                        item["period_code"],
                        item["display_name"],
                        item["subtitle"],
                        item["is_available"],
                    )
                    for item in build_city_period_catalog()
                ],
            )
    finally:
        connection.close()


def replace_city_period_content(
    db_path: str | Path,
    items: list[dict[str, Any]],
    imported_at: str | None = None,
) -> None:
    ensure_database(db_path)
    imported_at = imported_at or _utc_now_iso()
    connection = connect_db(db_path)
    try:
        with connection:
            connection.execute("DELETE FROM city_period_content")
            connection.executemany(
                """
                INSERT INTO city_period_content (
                    city,
                    period_code,
                    display_name,
                    subtitle,
                    short_description,
                    history_summary,
                    interesting_fact,
                    old_name,
                    importance_reason,
                    image_keys,
                    quiz_available,
                    fact_challenge_available,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        item["city"],
                        item["period_code"],
                        item["display_name"],
                        item.get("subtitle"),
                        item["short_description"],
                        item["history_summary"],
                        item["interesting_fact"],
                        item.get("old_name"),
                        item.get("importance_reason"),
                        json.dumps(item.get("image_keys"), ensure_ascii=False)
                        if item.get("image_keys") is not None
                        else None,
                        int(item.get("quiz_available", 1)),
                        int(item.get("fact_challenge_available", 1)),
                        imported_at,
                        imported_at,
                    )
                    for item in items
                ],
            )
    finally:
        connection.close()


def seed_city_period_content_if_empty(
    db_path: str | Path,
    json_path: str | Path = DEFAULT_CITY_PERIOD_CONTENT_PATH,
) -> None:
    ensure_database(db_path)
    items = load_city_period_content_json(json_path)

    connection = connect_db(db_path)
    try:
        current_count = connection.execute(
            "SELECT COUNT(*) FROM city_period_content"
        ).fetchone()[0]
        current_pairs = {
            (str(row["city"]), str(row["period_code"]))
            for row in connection.execute(
                "SELECT city, period_code FROM city_period_content"
            ).fetchall()
        }
    finally:
        connection.close()

    expected_pairs = {
        (str(item["city"]), str(item["period_code"])) for item in items
    }
    if current_count > 0 and current_pairs == expected_pairs:
        return

    errors, warnings = validate_city_period_content(items)
    if errors:
        raise RuntimeError(
            "City period content contains validation errors and cannot be imported:\n"
            + "\n".join(
                f"- {issue.city}/{issue.period_code} [{issue.field}]: {issue.message}"
                for issue in errors
            )
        )

    if warnings:
        print(
            "Imported city period content with warnings:\n"
            + "\n".join(
                f"- {issue.city}/{issue.period_code} [{issue.field}]: {issue.message}"
                for issue in warnings
            )
        )

    replace_city_period_content(db_path, items)


def replace_fact_challenges(
    db_path: str | Path,
    items: list[dict[str, Any]],
    imported_at: str | None = None,
) -> None:
    ensure_database(db_path)
    imported_at = imported_at or _utc_now_iso()
    connection = connect_db(db_path)
    try:
        with connection:
            connection.execute("DELETE FROM fact_challenges")
            connection.executemany(
                """
                INSERT INTO fact_challenges (
                    city,
                    period_code,
                    fact_text,
                    difficulty,
                    is_active,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        item["city"],
                        item["period_code"],
                        item["fact_text"],
                        item.get("difficulty"),
                        int(item.get("is_active", 1)),
                        imported_at,
                        imported_at,
                    )
                    for item in items
                ],
            )
    finally:
        connection.close()


def seed_fact_challenges_if_empty(
    db_path: str | Path,
    json_path: str | Path = DEFAULT_FACT_CHALLENGE_DATA_PATH,
) -> None:
    ensure_database(db_path)
    items = load_fact_challenges_json(json_path)

    connection = connect_db(db_path)
    try:
        current_count = connection.execute(
            "SELECT COUNT(*) FROM fact_challenges"
        ).fetchone()[0]
        current_pairs = {
            (str(row["city"]), str(row["period_code"]))
            for row in connection.execute(
                "SELECT city, period_code FROM fact_challenges"
            ).fetchall()
        }
    finally:
        connection.close()

    expected_pairs = {
        (str(item["city"]), str(item["period_code"])) for item in items
    }
    if current_count > 0 and current_pairs == expected_pairs:
        return

    errors, warnings = validate_fact_challenges(items)
    if errors:
        raise RuntimeError(
            "Fact challenges contain validation errors and cannot be imported:\n"
            + "\n".join(
                f"- {issue.city}/{issue.period_code} [{issue.field}]: {issue.message}"
                for issue in errors
            )
        )

    if warnings:
        print(
            "Imported fact challenges with warnings:\n"
            + "\n".join(
                f"- {issue.city}/{issue.period_code} [{issue.field}]: {issue.message}"
                for issue in warnings
            )
        )

    replace_fact_challenges(db_path, items)


def seed_default_achievements(
    db_path: str | Path,
    created_at: str | None = None,
) -> None:
    ensure_database(db_path)
    created_at = created_at or _utc_now_iso()
    catalog = build_achievement_catalog()
    catalog_codes = [str(item["code"]) for item in catalog]
    connection = connect_db(db_path)
    try:
        with connection:
            placeholders = ", ".join("?" for _ in catalog_codes)
            connection.execute(
                f"""
                DELETE FROM player_achievements
                WHERE achievement_code NOT IN ({placeholders})
                """,
                catalog_codes,
            )
            connection.execute(
                f"""
                DELETE FROM achievements
                WHERE code NOT IN ({placeholders})
                """,
                catalog_codes,
            )
            connection.executemany(
                """
                INSERT INTO achievements (
                    code,
                    name,
                    description,
                    city,
                    period_code,
                    threshold,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(code) DO UPDATE SET
                    name = excluded.name,
                    description = excluded.description,
                    city = excluded.city,
                    period_code = excluded.period_code,
                    threshold = excluded.threshold
                """,
                [
                    (
                        item["code"],
                        item["name"],
                        item["description"],
                        item["city"],
                        item["period_code"],
                        item["threshold"],
                        created_at,
                    )
                    for item in catalog
                ],
            )
    finally:
        connection.close()


def replace_quiz_bank(db_path: str | Path, items: list[dict[str, Any]]) -> None:
    ensure_database(db_path)
    connection = connect_db(db_path)
    try:
        with connection:
            connection.execute("DELETE FROM quizzes")
            connection.executemany(
                """
                INSERT INTO quizzes (
                    city,
                    period_code,
                    difficulty,
                    question,
                    options,
                    correct_index,
                    fact
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        item["city"],
                        item.get("period_code", DEFAULT_PERIOD_CODE),
                        item.get("difficulty", "easy"),
                        item["question"],
                        json.dumps(item["options"], ensure_ascii=False),
                        item["correct_index"],
                        item["fact"],
                    )
                    for item in items
                ],
            )
    finally:
        connection.close()


def seed_from_json_if_empty(
    db_path: str | Path,
    json_path: str | Path = DEFAULT_DATA_PATH,
) -> None:
    ensure_database(db_path)
    items = load_quiz_bank_json(json_path)

    connection = connect_db(db_path)
    try:
        current_count = connection.execute("SELECT COUNT(*) FROM quizzes").fetchone()[0]
        current_signature = Counter(
            (str(row["city"]), str(row["period_code"]))
            for row in connection.execute(
                """
                SELECT city, period_code
                FROM quizzes
                """
            ).fetchall()
        )
    finally:
        connection.close()

    expected_signature = Counter(
        (str(item["city"]), str(item.get("period_code", DEFAULT_PERIOD_CODE)))
        for item in items
    )
    if current_count > 0 and current_signature == expected_signature:
        return

    is_period_bank = any(
        str(item.get("period_code", DEFAULT_PERIOD_CODE)) != DEFAULT_PERIOD_CODE
        for item in items
    )
    if is_period_bank:
        errors, warnings = validate_period_quiz_bank(items)
    else:
        errors, warnings = validate_quiz_bank(items)
    if errors:
        raise RuntimeError(
            "Static quiz bank contains validation errors and cannot be imported:\n"
            + "\n".join(f"- {issue.city}: {issue.message}" for issue in errors)
        )

    if warnings:
        print(
            "Imported quiz bank with warnings:\n"
            + "\n".join(f"- {issue.city}: {issue.message}" for issue in warnings)
        )

    replace_quiz_bank(db_path, items)


def _quiz_row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "city": row["city"],
        "period_code": row["period_code"],
        "difficulty": row["difficulty"],
        "question": row["question"],
        "options": json.loads(row["options"]),
        "correct_index": row["correct_index"],
        "fact": row["fact"],
    }


def fetch_random_quiz(
    db_path: str | Path,
    city: str,
    period_code: str = DEFAULT_PERIOD_CODE,
) -> dict[str, Any] | None:
    ensure_database(db_path)
    connection = connect_db(db_path)
    try:
        rows = fetch_random_quizzes(connection, city, period_code, 1)
    finally:
        connection.close()

    if not rows:
        return None

    payload = rows[0]
    return {
        "question": payload["question"],
        "options": payload["options"],
        "correct_index": payload["correct_index"],
        "fact": payload["fact"],
    }


def fetch_random_quizzes(
    connection: sqlite3.Connection,
    city: str,
    period_code: str,
    limit: int,
) -> list[dict[str, Any]]:
    rows = connection.execute(
        """
        SELECT id, city, period_code, difficulty, question, options, correct_index, fact
        FROM quizzes
        WHERE city = ? AND period_code = ?
        ORDER BY RANDOM()
        LIMIT ?
        """,
        (city, period_code, limit),
    ).fetchall()
    return [_quiz_row_to_dict(row) for row in rows]


def fetch_city_period(
    connection: sqlite3.Connection,
    city: str,
    period_code: str,
) -> dict[str, Any] | None:
    row = connection.execute(
        """
        SELECT city, period_code, display_name, subtitle, is_available
        FROM city_periods
        WHERE city = ? AND period_code = ?
        """,
        (city, period_code),
    ).fetchone()
    return dict(row) if row is not None else None


def _city_content_row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "city": row["city"],
        "period_code": row["period_code"],
        "display_name": row["display_name"],
        "subtitle": row["subtitle"],
        "short_description": row["short_description"],
        "history_summary": row["history_summary"],
        "interesting_fact": row["interesting_fact"],
        "old_name": row["old_name"],
        "importance_reason": row["importance_reason"],
        "image_keys": json.loads(row["image_keys"])
        if row["image_keys"] is not None
        else None,
        "quiz_available": row["quiz_available"],
        "fact_challenge_available": row["fact_challenge_available"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def fetch_city_period_content(
    db_path: str | Path,
    city: str,
    period_code: str,
) -> dict[str, Any] | None:
    ensure_database(db_path)
    connection = connect_db(db_path)
    try:
        row = connection.execute(
            """
            SELECT
                city,
                period_code,
                display_name,
                subtitle,
                short_description,
                history_summary,
                interesting_fact,
                old_name,
                importance_reason,
                image_keys,
                quiz_available,
                fact_challenge_available,
                created_at,
                updated_at
            FROM city_period_content
            WHERE city = ? AND period_code = ?
            """,
            (city, period_code),
        ).fetchone()
        return _city_content_row_to_dict(row) if row is not None else None
    finally:
        connection.close()


def _fact_challenge_row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "city": row["city"],
        "period_code": row["period_code"],
        "fact_text": row["fact_text"],
        "difficulty": row["difficulty"],
        "is_active": row["is_active"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def fetch_random_active_fact_challenge(
    connection: sqlite3.Connection,
    period_code: str,
) -> dict[str, Any] | None:
    row = connection.execute(
        """
        SELECT
            id,
            city,
            period_code,
            fact_text,
            difficulty,
            is_active,
            created_at,
            updated_at
        FROM fact_challenges
        WHERE period_code = ? AND is_active = 1
        ORDER BY RANDOM()
        LIMIT 1
        """,
        (period_code,),
    ).fetchone()
    return _fact_challenge_row_to_dict(row) if row is not None else None


def fetch_fact_challenge_by_id(
    connection: sqlite3.Connection,
    challenge_id: int,
) -> dict[str, Any] | None:
    row = connection.execute(
        """
        SELECT
            id,
            city,
            period_code,
            fact_text,
            difficulty,
            is_active,
            created_at,
            updated_at
        FROM fact_challenges
        WHERE id = ?
        """,
        (challenge_id,),
    ).fetchone()
    return _fact_challenge_row_to_dict(row) if row is not None else None


def create_fact_challenge_session(
    connection: sqlite3.Connection,
    session_id: str,
    player_id: str,
    period_code: str,
    challenge_id: int,
    candidate_cities: Sequence[str],
    created_at: str,
) -> None:
    connection.execute(
        """
        INSERT INTO fact_challenge_sessions (
            id,
            player_id,
            period_code,
            challenge_id,
            candidate_cities,
            created_at,
            is_completed
        )
        VALUES (?, ?, ?, ?, ?, ?, 0)
        """,
        (
            session_id,
            player_id,
            period_code,
            challenge_id,
            json.dumps(list(candidate_cities), ensure_ascii=False),
            created_at,
        ),
    )


def fetch_fact_challenge_session(
    connection: sqlite3.Connection,
    session_id: str,
) -> dict[str, Any] | None:
    row = connection.execute(
        """
        SELECT
            id,
            player_id,
            period_code,
            challenge_id,
            candidate_cities,
            created_at,
            is_completed
        FROM fact_challenge_sessions
        WHERE id = ?
        """,
        (session_id,),
    ).fetchone()
    if row is None:
        return None
    return {
        "id": row["id"],
        "player_id": row["player_id"],
        "period_code": row["period_code"],
        "challenge_id": row["challenge_id"],
        "candidate_cities": json.loads(row["candidate_cities"]),
        "created_at": row["created_at"],
        "is_completed": row["is_completed"],
    }


def mark_fact_challenge_session_completed(
    connection: sqlite3.Connection,
    session_id: str,
) -> None:
    connection.execute(
        """
        UPDATE fact_challenge_sessions
        SET is_completed = 1
        WHERE id = ?
        """,
        (session_id,),
    )


def timeline_period_exists(connection: sqlite3.Connection, period_code: str) -> bool:
    row = connection.execute(
        "SELECT 1 FROM timeline_periods WHERE code = ?",
        (period_code,),
    ).fetchone()
    return row is not None


def create_test_session(
    connection: sqlite3.Connection,
    session_id: str,
    player_id: str,
    city: str,
    period_code: str,
    question_ids: Sequence[int],
    created_at: str,
) -> None:
    connection.execute(
        """
        INSERT INTO test_sessions (
            id,
            player_id,
            city,
            period_code,
            question_ids,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            session_id,
            player_id,
            city,
            period_code,
            json.dumps(list(question_ids), ensure_ascii=False),
            created_at,
        ),
    )


def fetch_test_session(
    connection: sqlite3.Connection,
    session_id: str,
) -> dict[str, Any] | None:
    row = connection.execute(
        """
        SELECT id, player_id, city, period_code, question_ids, created_at
        FROM test_sessions
        WHERE id = ?
        """,
        (session_id,),
    ).fetchone()
    if row is None:
        return None

    return {
        "id": row["id"],
        "player_id": row["player_id"],
        "city": row["city"],
        "period_code": row["period_code"],
        "question_ids": json.loads(row["question_ids"]),
        "created_at": row["created_at"],
    }


def delete_test_session(connection: sqlite3.Connection, session_id: str) -> None:
    connection.execute("DELETE FROM test_sessions WHERE id = ?", (session_id,))


def fetch_quizzes_by_ids(
    connection: sqlite3.Connection,
    question_ids: Sequence[int | str],
) -> list[dict[str, Any]]:
    if not question_ids:
        return []

    # Приводим к int, так как в базе id это INTEGER
    clean_ids = []
    for qid in question_ids:
        try:
            clean_ids.append(int(qid))
        except (ValueError, TypeError):
            print(f"ERROR: Invalid quiz ID type: {qid}")
            continue

    if not clean_ids:
        return []

    placeholders = ", ".join("?" for _ in clean_ids)
    rows = connection.execute(
        f"SELECT * FROM quizzes WHERE id IN ({placeholders})",
        tuple(clean_ids),
    ).fetchall()

    # Создаем мапу для быстрого поиска
    rows_dict = {int(row["id"]): _quiz_row_to_dict(row) for row in rows}
    
    # Возвращаем список в том же порядке, что и запрошенные ID
    result = []
    for qid in clean_ids:
        if qid in rows_dict:
            result.append(rows_dict[qid])
        else:
            print(f"CRITICAL: Quiz ID {qid} NOT FOUND in database!")
            
    return result


def insert_test_result(
    connection: sqlite3.Connection,
    player_id: str,
    city: str,
    period_code: str,
    total_questions: int,
    correct_answers: int,
    passed: bool,
    completed_at: str,
) -> None:
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
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            player_id,
            city,
            period_code,
            total_questions,
            correct_answers,
            int(passed),
            completed_at,
        ),
    )


def insert_fact_challenge_result(
    connection: sqlite3.Connection,
    player_id: str,
    period_code: str,
    challenge_id: int,
    selected_city: str,
    correct_city: str,
    is_correct: bool,
    completed_at: str,
) -> None:
    connection.execute(
        """
        INSERT INTO fact_challenge_results (
            player_id,
            period_code,
            challenge_id,
            selected_city,
            correct_city,
            is_correct,
            completed_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            player_id,
            period_code,
            challenge_id,
            selected_city,
            correct_city,
            int(is_correct),
            completed_at,
        ),
    )


def upsert_player_city_progress(
    connection: sqlite3.Connection,
    player_id: str,
    city: str,
    period_code: str,
    passed: bool,
    score_percent: int,
    completed_at: str,
) -> None:
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
            passed_count = player_city_progress.passed_count + excluded.passed_count,
            best_score = MAX(player_city_progress.best_score, excluded.best_score),
            total_attempts = player_city_progress.total_attempts + 1,
            last_completed_at = excluded.last_completed_at
        """,
        (
            player_id,
            city,
            period_code,
            int(passed),
            score_percent,
            completed_at,
        ),
    )


def count_player_correct_fact_challenges(
    connection: sqlite3.Connection,
    player_id: str,
) -> int:
    return connection.execute(
        """
        SELECT COUNT(*)
        FROM fact_challenge_results
        WHERE player_id = ? AND is_correct = 1
        """,
        (player_id,),
    ).fetchone()[0]


def count_player_passed_tests(connection: sqlite3.Connection, player_id: str) -> int:
    return connection.execute(
        """
        SELECT COUNT(*)
        FROM test_results
        WHERE player_id = ? AND passed = 1
        """,
        (player_id,),
    ).fetchone()[0]


def count_distinct_cities_passed(connection: sqlite3.Connection, player_id: str) -> int:
    return connection.execute(
        """
        SELECT COUNT(DISTINCT city)
        FROM player_city_progress
        WHERE player_id = ? AND passed_count > 0
        """,
        (player_id,),
    ).fetchone()[0]


def insert_player_achievement(
    connection: sqlite3.Connection,
    player_id: str,
    achievement_code: str,
    unlocked_at: str,
) -> bool:
    cursor = connection.execute(
        """
        INSERT OR IGNORE INTO player_achievements (
            player_id,
            achievement_code,
            unlocked_at
        )
        VALUES (?, ?, ?)
        """,
        (player_id, achievement_code, unlocked_at),
    )
    return cursor.rowcount > 0


def fetch_player_achievement(
    connection: sqlite3.Connection,
    player_id: str,
    achievement_code: str,
) -> dict[str, Any] | None:
    row = connection.execute(
        """
        SELECT
            achievements.code,
            achievements.name,
            achievements.description,
            achievements.city,
            achievements.period_code,
            achievements.threshold,
            player_achievements.unlocked_at
        FROM player_achievements
        JOIN achievements
            ON achievements.code = player_achievements.achievement_code
        WHERE player_achievements.player_id = ?
          AND player_achievements.achievement_code = ?
        """,
        (player_id, achievement_code),
    ).fetchone()
    return dict(row) if row is not None else None


def count_player_achievements(connection: sqlite3.Connection, player_id: str) -> int:
    return connection.execute(
        """
        SELECT COUNT(*)
        FROM player_achievements
        WHERE player_id = ?
        """,
        (player_id,),
    ).fetchone()[0]


def list_player_achievements(db_path: str | Path, player_id: str) -> list[dict[str, Any]]:
    ensure_database(db_path)
    connection = connect_db(db_path)
    try:
        rows = connection.execute(
            """
            SELECT
                achievements.code,
                achievements.name,
                achievements.description,
                achievements.city,
                achievements.period_code,
                achievements.threshold,
                player_achievements.unlocked_at
            FROM player_achievements
            JOIN achievements
                ON achievements.code = player_achievements.achievement_code
            WHERE player_achievements.player_id = ?
            ORDER BY player_achievements.unlocked_at DESC, achievements.code ASC
            """,
            (player_id,),
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        connection.close()


def list_achievement_catalog(db_path: str | Path) -> list[dict[str, Any]]:
    ensure_database(db_path)
    connection = connect_db(db_path)
    try:
        rows = connection.execute(
            """
            SELECT
                achievements.code,
                achievements.name,
                achievements.description,
                achievements.city,
                achievements.period_code,
                achievements.threshold,
                achievements.created_at
            FROM achievements
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
            """
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        connection.close()


def get_player_progress(db_path: str | Path, player_id: str) -> dict[str, Any]:
    ensure_database(db_path)
    connection = connect_db(db_path)
    try:
        metrics = connection.execute(
            """
            SELECT
                (
                    SELECT COUNT(*)
                    FROM test_results
                    WHERE player_id = ?
                ) AS total_tests_completed,
                (
                    SELECT COUNT(*)
                    FROM test_results
                    WHERE player_id = ? AND passed = 1
                ) AS total_passed_tests,
                (
                    SELECT COALESCE(SUM(correct_answers) * 100 / NULLIF(SUM(total_questions), 0), 0)
                    FROM test_results
                    WHERE player_id = ? AND city != 'ЕНТ'
                ) AS overall_accuracy_percent,
                (
                    SELECT COUNT(DISTINCT city)
                    FROM player_city_progress
                    WHERE player_id = ? AND passed_count > 0
                ) AS distinct_cities_passed,
                (
                    SELECT COUNT(*)
                    FROM player_achievements
                    WHERE player_id = ?
                ) AS total_achievements_unlocked
            """,
            (player_id, player_id, player_id, player_id, player_id),
        ).fetchone()

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

        ent_rows = connection.execute(
            """
            SELECT
                id,
                total_questions,
                correct_answers,
                passed,
                completed_at
            FROM test_results
            WHERE player_id = ? AND city = 'ЕНТ'
            ORDER BY completed_at DESC, id DESC
            """,
            (player_id,),
        ).fetchall()
    finally:
        connection.close()

    ent_attempts = []
    for row in ent_rows:
        total_questions = int(row["total_questions"] or 0)
        correct_answers = int(row["correct_answers"] or 0)
        score_percent = (
            round((correct_answers / total_questions) * 100)
            if total_questions
            else 0
        )
        ent_attempts.append(
            {
                "id": int(row["id"]),
                "total_questions": total_questions,
                "correct_answers": correct_answers,
                "score_percent": score_percent,
                "passed": bool(row["passed"]),
                "completed_at": row["completed_at"],
            }
        )

    return {
        "total_tests_completed": metrics["total_tests_completed"],
        "total_passed_tests": metrics["total_passed_tests"],
        "overall_accuracy_percent": int(metrics["overall_accuracy_percent"]),
        "distinct_cities_passed": metrics["distinct_cities_passed"],
        "city_progress": [dict(row) for row in city_rows],
        "ent_attempts": ent_attempts,
        "total_achievements_unlocked": metrics["total_achievements_unlocked"],
    }


def get_fact_challenge_progress(db_path: str | Path, player_id: str) -> dict[str, Any]:
    ensure_database(db_path)
    connection = connect_db(db_path)
    try:
        totals = connection.execute(
            """
            SELECT
                COUNT(*) AS total_attempts,
                COALESCE(SUM(is_correct), 0) AS total_correct
            FROM fact_challenge_results
            WHERE player_id = ?
            """,
            (player_id,),
        ).fetchone()

        period_rows = connection.execute(
            """
            SELECT
                fact_challenge_results.period_code,
                COUNT(*) AS total_attempts,
                SUM(fact_challenge_results.is_correct) AS total_correct
            FROM fact_challenge_results
            LEFT JOIN timeline_periods
                ON timeline_periods.code = fact_challenge_results.period_code
            WHERE fact_challenge_results.player_id = ?
            GROUP BY fact_challenge_results.period_code, timeline_periods.sort_order
            ORDER BY timeline_periods.sort_order ASC, fact_challenge_results.period_code ASC
            """,
            (player_id,),
        ).fetchall()
    finally:
        connection.close()

    total_attempts = int(totals["total_attempts"] or 0)
    total_correct = int(totals["total_correct"] or 0)
    accuracy_percent = round((total_correct / total_attempts) * 100) if total_attempts else 0
    per_period_summary = []
    for row in period_rows:
        attempts = row["total_attempts"]
        correct = row["total_correct"] or 0
        per_period_summary.append(
            {
                "period_code": row["period_code"],
                "total_attempts": attempts,
                "total_correct": correct,
                "accuracy_percent": round((correct / attempts) * 100)
                if attempts
                else 0,
            }
        )

    return {
        "total_attempts": total_attempts,
        "total_correct": total_correct,
        "accuracy_percent": accuracy_percent,
        "per_period_summary": per_period_summary,
    }


def list_player_fact_success_cities(
    db_path: str | Path,
    player_id: str,
    period_code: str,
) -> list[dict[str, Any]]:
    ensure_database(db_path)
    connection = connect_db(db_path)
    try:
        rows = connection.execute(
            """
            SELECT
                correct_city AS city,
                period_code,
                COUNT(*) AS success_count
            FROM fact_challenge_results
            WHERE player_id = ? AND period_code = ? AND is_correct = 1
            GROUP BY correct_city, period_code
            ORDER BY correct_city ASC
            """,
            (player_id, period_code),
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        connection.close()


def list_timeline_periods(db_path: str | Path) -> list[dict[str, Any]]:
    ensure_database(db_path)
    connection = connect_db(db_path)
    try:
        rows = connection.execute(
            """
            SELECT code, year_label, title, sort_order, description, created_at
            FROM timeline_periods
            ORDER BY sort_order ASC, code ASC
            """
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        connection.close()


def list_period_cities(
    db_path: str | Path,
    period_code: str,
    only_available: bool = True,
) -> list[dict[str, Any]]:
    ensure_database(db_path)
    connection = connect_db(db_path)
    try:
        query = """
            SELECT city, period_code, display_name, subtitle, is_available
            FROM city_periods
            WHERE period_code = ?
        """
        parameters: list[Any] = [period_code]
        if only_available:
            query += " AND is_available = 1"
        query += " ORDER BY display_name ASC, city ASC"
        rows = connection.execute(query, tuple(parameters)).fetchall()
        return [dict(row) for row in rows]
    finally:
        connection.close()


def list_city_period_content_summaries(
    db_path: str | Path,
    period_code: str,
) -> list[dict[str, Any]]:
    ensure_database(db_path)
    connection = connect_db(db_path)
    try:
        rows = connection.execute(
            """
            SELECT
                city,
                period_code,
                display_name,
                subtitle,
                short_description,
                quiz_available,
                fact_challenge_available
            FROM city_period_content
            WHERE period_code = ?
            ORDER BY display_name ASC, city ASC
            """,
            (period_code,),
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        connection.close()


def get_quiz_counts(db_path: str | Path) -> dict[str, int]:
    ensure_database(db_path)
    connection = connect_db(db_path)
    try:
        rows = connection.execute(
            """
            SELECT city, COUNT(*) AS quiz_count
            FROM quizzes
            GROUP BY city
            ORDER BY city
            """
        ).fetchall()
    finally:
        connection.close()

    return {row["city"]: row["quiz_count"] for row in rows}


def _hash_password(password: str, salt: str) -> str:
    return hashlib.sha256((salt + password).encode()).hexdigest()


def create_user(
    db_path: str | Path,
    user_id: str,
    username: str,
    email: str,
    password: str,
) -> dict[str, Any]:
    ensure_database(db_path)
    username = _normalize_identity_username(username)
    email = _normalize_identity_email(email)
    salt = secrets.token_hex(16)
    password_hash = _hash_password(password, salt)
    created_at = _utc_now_iso()

    connection = connect_db(db_path)
    try:
        with connection:
            connection.execute(
                """
                INSERT INTO users (
                    id,
                    username,
                    email,
                    password_hash,
                    password_salt,
                    auth_provider,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?, 'password', ?)
                """,
                (user_id, username, email, password_hash, salt, created_at),
            )
    finally:
        connection.close()

    return {
        "id": user_id,
        "username": username,
        "email": email,
        "created_at": created_at,
        "avatar_url": None,
    }


def authenticate_user(
    db_path: str | Path,
    email: str,
    password: str,
) -> dict[str, Any] | None:
    ensure_database(db_path)
    email = _normalize_identity_email(email)
    connection = connect_db(db_path)
    try:
        row = connection.execute(
            """
            SELECT id, username, email, password_hash, password_salt, created_at, avatar_url
            FROM users
            WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))
            """,
            (email,),
        ).fetchone()
    finally:
        connection.close()

    if row is None:
        return None

    if not row["password_hash"] or _hash_password(password, row["password_salt"]) != row["password_hash"]:
        return None

    return {
        "id": row["id"],
        "username": row["username"],
        "email": row["email"],
        "created_at": row["created_at"],
        "avatar_url": row["avatar_url"],
    }


def fetch_user_by_id(db_path: str | Path, user_id: str) -> dict[str, Any] | None:
    ensure_database(db_path)
    connection = connect_db(db_path)
    try:
        row = connection.execute(
            "SELECT id, username, email, created_at, avatar_url FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
    finally:
        connection.close()

    if row is None:
        return None

    return dict(row)


def fetch_user_by_email(db_path: str | Path, email: str) -> dict[str, Any] | None:
    ensure_database(db_path)
    email = _normalize_identity_email(email)
    connection = connect_db(db_path)
    try:
        row = connection.execute(
            """
            SELECT id, username, email, created_at, avatar_url
            FROM users
            WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))
            """,
            (email,),
        ).fetchone()
    finally:
        connection.close()

    return dict(row) if row is not None else None


def check_username_exists(db_path: str | Path, username: str) -> bool:
    ensure_database(db_path)
    username = _normalize_identity_username(username)
    connection = connect_db(db_path)
    try:
        row = connection.execute(
            """
            SELECT 1
            FROM users
            WHERE LOWER(TRIM(username)) = LOWER(TRIM(?))
            """,
            (username,),
        ).fetchone()
    finally:
        connection.close()
    return row is not None


def check_email_exists(db_path: str | Path, email: str) -> bool:
    ensure_database(db_path)
    email = _normalize_identity_email(email)
    connection = connect_db(db_path)
    try:
        row = connection.execute(
            """
            SELECT 1
            FROM users
            WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))
            """,
            (email,),
        ).fetchone()
    finally:
        connection.close()
    return row is not None


def upsert_google_user(
    db_path: str | Path,
    user_id: str,
    email: str,
    username: str,
    google_sub: str,
    avatar_url: str | None,
) -> dict[str, Any]:
    ensure_database(db_path)
    email = _normalize_identity_email(email)
    username = _normalize_identity_username(username) or email.split("@", 1)[0]
    google_sub = google_sub.strip()
    avatar_url = avatar_url.strip() if avatar_url else None
    created_at = _utc_now_iso()

    connection = connect_db(db_path)
    try:
        with connection:
            row = connection.execute(
                """
                SELECT id, username, email, created_at, avatar_url
                FROM users
                WHERE google_sub = ?
                   OR LOWER(TRIM(email)) = LOWER(TRIM(?))
                ORDER BY
                    CASE WHEN google_sub = ? THEN 0 ELSE 1 END,
                    created_at ASC
                LIMIT 1
                """,
                (google_sub, email, google_sub),
            ).fetchone()

            if row is not None:
                connection.execute(
                    """
                    UPDATE users
                    SET
                        google_sub = COALESCE(NULLIF(google_sub, ''), ?),
                        avatar_url = COALESCE(?, avatar_url),
                        auth_provider = CASE
                            WHEN auth_provider = 'password' THEN 'password_google'
                            ELSE auth_provider
                        END
                    WHERE id = ?
                    """,
                    (google_sub, avatar_url, row["id"]),
                )
                updated = connection.execute(
                    """
                    SELECT id, username, email, created_at, avatar_url
                    FROM users
                    WHERE id = ?
                    """,
                    (row["id"],),
                ).fetchone()
                return dict(updated)

            unique_username = _build_unique_username(connection, username, user_id)
            connection.execute(
                """
                INSERT INTO users (
                    id,
                    username,
                    email,
                    password_hash,
                    password_salt,
                    auth_provider,
                    google_sub,
                    avatar_url,
                    created_at
                )
                VALUES (?, ?, ?, '', '', 'google', ?, ?, ?)
                """,
                (user_id, unique_username, email, google_sub, avatar_url, created_at),
            )
    finally:
        connection.close()

    return {
        "id": user_id,
        "username": unique_username,
        "email": email,
        "created_at": created_at,
        "avatar_url": avatar_url,
    }


def get_leaderboard(db_path: str | Path, limit: int = 50) -> list[dict[str, Any]]:
    connection = connect_db(db_path)
    try:
        rows = connection.execute(
            """
            SELECT
                u.id AS id,
                u.username AS username,
                COALESCE(SUM(pcp.best_score), 0) AS total_score,
                COALESCE(SUM(pcp.total_attempts), 0) AS total_tests,
                COALESCE(AVG(pcp.best_score), 0) AS accuracy,
                COALESCE(pa.achievements_count, 0) AS achievements_count
            FROM users u
            LEFT JOIN player_city_progress pcp
                ON pcp.player_id = u.id
               AND pcp.city != 'ЕНТ'
            LEFT JOIN (
                SELECT player_id, COUNT(*) AS achievements_count
                FROM player_achievements
                GROUP BY player_id
            ) pa
                ON pa.player_id = u.id
            WHERE u.id NOT LIKE '%smoke%'
              AND u.id != 'frontend-smoke-player'
            GROUP BY u.id, u.username, pa.achievements_count
            HAVING COALESCE(SUM(pcp.total_attempts), 0) > 0
                OR COALESCE(pa.achievements_count, 0) > 0
            ORDER BY total_score DESC, accuracy DESC, total_tests DESC, username ASC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    finally:
        connection.close()

    return [dict(row) for row in rows]
