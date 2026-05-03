"""One-off debug helper that prints ENT-related rows from the SQLite DB.

Usage:
    python -m scripts.debug_ent_db                # uses env DB_PATH or quizzes.db
    python -m scripts.debug_ent_db /path/to/db    # explicit path
"""

from __future__ import annotations

import os
import sqlite3
import sys


def main(argv: list[str]) -> int:
    db_path = argv[1] if len(argv) > 1 else os.environ.get("DB_PATH", "quizzes.db")
    if not os.path.exists(db_path):
        print(f"Database not found: {db_path}")
        return 1

    conn = sqlite3.connect(db_path)
    try:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT * FROM player_city_progress WHERE city = 'ЕНТ'"
        ).fetchall()
        if not rows:
            print("No ENT records found in player_city_progress.")
        else:
            for row in rows:
                print(dict(row))

        results = conn.execute(
            "SELECT * FROM test_results WHERE city = 'ЕНТ'"
        ).fetchall()
        print(f"\nTotal ENT test results: {len(results)}")
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
