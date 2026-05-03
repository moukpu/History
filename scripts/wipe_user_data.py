"""Wipe all user-generated data from quizzes.db, keeping the seeded content.

Removed (TRUNCATE):
- users
- player_achievements
- player_city_progress
- player_minigame_progress
- player_period_overrides
- test_results
- test_sessions
- fact_challenge_results
- fact_challenge_sessions
- ent_attempt_details
- ent_attempt_ai_analysis

Preserved:
- achievements (definitions)
- quizzes
- timeline_periods
- city_periods
- city_period_content
- fact_challenges
- app_metadata
- sqlite_sequence

Usage:
    python scripts/wipe_user_data.py [path/to/quizzes.db]
"""
from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

USER_TABLES = (
    "ent_attempt_ai_analysis",
    "ent_attempt_details",
    "fact_challenge_results",
    "fact_challenge_sessions",
    "player_achievements",
    "player_city_progress",
    "player_minigame_progress",
    "player_period_overrides",
    "test_results",
    "test_sessions",
    "users",
)


def main() -> int:
    db_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("quizzes.db")
    if not db_path.exists():
        print(f"DB not found: {db_path}")
        return 1

    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()
        existing = {
            row[0]
            for row in cur.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
        }
        print(f"DB: {db_path}")
        print("Before:")
        for table in USER_TABLES:
            if table in existing:
                count = cur.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
                print(f"  {table:35s} {count}")

        cur.execute("PRAGMA foreign_keys = OFF")
        for table in USER_TABLES:
            if table in existing:
                cur.execute(f"DELETE FROM {table}")
        # Reset auto-increment counters for the wiped tables only
        cur.execute(
            "DELETE FROM sqlite_sequence WHERE name IN ({placeholders})".format(
                placeholders=",".join("?" * len(USER_TABLES))
            ),
            USER_TABLES,
        )
        conn.commit()
        cur.execute("PRAGMA foreign_keys = ON")
        cur.execute("VACUUM")

        print("After:")
        for table in USER_TABLES:
            if table in existing:
                count = cur.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
                print(f"  {table:35s} {count}")
        print("Done.")
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
