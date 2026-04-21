import sqlite3
import os

db_path = r'c:\Users\aldiy\Downloads\kazakhstanmap-feature-auth-profiles\quizzes.db'
if not os.path.exists(db_path):
    print("Database not found!")
else:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT * FROM player_city_progress WHERE city = 'ЕНТ'").fetchall()
    if not rows:
        print("No ENT records found in player_city_progress.")
    else:
        for row in rows:
            print(dict(row))
    
    results = conn.execute("SELECT * FROM test_results WHERE city = 'ЕНТ'").fetchall()
    print(f"\nTotal ENT test results: {len(results)}")
    conn.close()
