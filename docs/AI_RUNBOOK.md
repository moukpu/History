# AI Runbook

This file is for any AI agent that needs to understand, run, debug, or extend this repository without relying on local-machine assumptions.

## Project summary

This repository contains an interactive historical map of Kazakhstan with:

- a FastAPI backend
- a static frontend
- period-based city quizzes
- ENT test mode
- achievement and unlock progression
- account registration and login
- player profile and leaderboard
- period-aware city content and media

The main product identity is:

- `city + period_code`

Do not treat cities as globally identical across all historical periods.

## Main architecture

### Backend

- Entry point: `main.py`
- Main package: `quiz_bank/`
- Database: `quizzes.db`
- API prefix: `/api`
- Railway config: `railway.json`

### Frontend

- Root: `frontend/`
- Main map page: `frontend/map_hub/code.html`
- Home page: `frontend/home_page/code.html`
- About page: `frontend/about/code.html`
- Profile page: `frontend/profile/code.html`
- Leaderboard page: `frontend/leaderboard/code.html`
- Shared logic: `frontend/shared/`
- Static assets and city images: `frontend/assets/`

## Runtime expectations

### Backend startup

Run:

```bash
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

On startup, the app:

- ensures the database exists
- seeds timeline periods
- seeds city-period relations
- seeds achievements
- seeds city content
- seeds fact challenges

### Frontend startup

Preferred simple option:

```bash
cd frontend
python -m http.server 3000
```

Alternative Node option:

```bash
cd frontend
npm ci
npm run start
```

Frontend default API base:

- `http://127.0.0.1:8000` when the frontend is served locally on a dev port
- same-origin when the frontend is served by FastAPI, including Railway

Defined in:

- `frontend/shared/config.js`

### Railway deployment

Railway runs this repository as one service. FastAPI serves both the API and the static frontend.

Start command:

```bash
python -m uvicorn main:app --host 0.0.0.0 --port $PORT
```

Required Railway variables:

- `GOOGLE_CLIENT_ID` for Google sign-in
- `DB_PATH=/data/quizzes.db` if a Railway volume is mounted at `/data`

Optional Railway variables:

- `GROQ_API_KEY` for AI analysis in ENT attempt reviews
- `GROQ_MODEL=llama-3.3-70b-versatile` unless another supported Groq model is chosen

Do not commit real `.env` values. Use `.env.railway.example` as the variable checklist.

## Important product rules

### Timeline and unlock flow

- The player starts from the first period.
- Future periods stay visible in the timeline even when locked.
- A new period unlocks only after the player completes all city tests in the current period.
- The map should reopen on the latest unlocked period, not always on the first one.

### Profile rules

- Profile accuracy is based only on city tests.
- ENT tests must not affect profile accuracy.

### Leaderboard rules

- The leaderboard should show real registered usernames.
- It should not show guest IDs like `player-*`.
- If guest progress exists without linked accounts, do not present raw technical IDs as display names.

### UI constraints

- Keep the current structure stable unless explicitly asked to redesign.
- Do not change SVG map geometry unless the task is directly about map assets.
- Preserve the one-page map layout and right-side city panel behavior.
- Keep footer/header behavior consistent across pages when making shared UI changes.

## Current data expectations

### Periods

- The canonical timeline is limited to the intended historical periods defined by backend constants and seed logic.
- Do not invent extra timeline periods in code, data, or UI.

### City quizzes

- City quiz data comes from `data/quizzes_period_ru.json`
- Current city-question set is intentionally trimmed so overly long city questions do not appear in the UI.
- The city-question set is standardized to 20 questions per city-period pair.

### City content

- Source file: `data/city_period_content_ru.json`
- Use the existing generation and validation pipeline instead of inventing a parallel content store.

### Fact challenges

- Source file: `data/fact_challenges_ru.json`

### ENT test

- Source file: `data/ent_questions.json`

## Media rules

- City hero images are resolved through `frontend/shared/city-visuals.js`
- Historical aliases and period-aware overrides are already handled there
- Before adding a new image system, inspect that file first

## AI provider usage

Groq is optional for the main app, but it powers AI analysis in ENT attempt reviews:

- `GET /api/ent/attempts/{player_id}/{attempt_id}/analysis`

## Files to inspect first for common tasks

### Map and timeline behavior

- `frontend/shared/map-hub.js`
- `frontend/shared/period-svg-map.js`
- `frontend/shared/city-visuals.js`
- `frontend/map_hub/code.html`

### Profile and auth

- `frontend/shared/profile.js`
- `frontend/shared/auth.js`
- `main.py`
- `quiz_bank/database.py`

### Leaderboard

- `frontend/shared/leaderboard.js`
- `quiz_bank/database.py`

### Quiz flow

- `frontend/shared/quiz-challenge.js`
- `frontend/shared/ent-test.js`
- `quiz_bank/services.py`
- `quiz_bank/database.py`

## Database and service facts

Important tables include:

- `timeline_periods`
- `city_periods`
- `quizzes`
- `test_sessions`
- `test_results`
- `player_city_progress`
- `achievements`
- `player_achievements`
- `city_period_content`
- `fact_challenges`
- `fact_challenge_sessions`
- `fact_challenge_results`
- `users`

Common backend responsibilities:

- `quiz_bank/database.py` handles persistence and query logic
- `quiz_bank/services.py` handles response shaping, unlock logic, and achievement logic
- `quiz_bank/constants.py` holds canonical configuration and period definitions

## Validation workflow

When changing backend logic, run:

```bash
python -m unittest discover -s tests -v
```

At minimum, use these targeted checks for user-facing work:

```bash
python -m unittest tests.test_frontend_integration_api -v
python -m unittest tests.test_achievement_flow -v
python -m unittest tests.test_fact_challenge_flow -v
```

When changing frontend JavaScript, also run syntax checks for the touched files:

```bash
node --check frontend/shared/map-hub.js
node --check frontend/shared/profile.js
node --check frontend/shared/leaderboard.js
node --check frontend/shared/quiz-challenge.js
node --check frontend/shared/ent-test.js
```

## Safe content workflow

If you need to change content:

1. update the source JSON file in `data/`
2. run the relevant validation script
3. import or rebuild the database if needed
4. verify the frontend behavior against the affected page

Do not hardcode content in scattered frontend files if there is already a source JSON pipeline.

## Rebuild commands

### Period quizzes

```bash
python scripts/validate_period_quizzes.py
python scripts/import_period_quizzes.py --db quizzes.db
```

### City content

```bash
python scripts/generate_city_period_content.py
python scripts/validate_city_period_content.py
python scripts/import_city_period_content.py --db quizzes.db
```

### Fact challenges

```bash
python scripts/generate_fact_challenges.py
python scripts/validate_fact_challenges.py
python scripts/import_fact_challenges.py --db quizzes.db
```

## Do not break

- `city + period_code` backend/frontend contracts
- period unlock progression
- latest-unlocked-period bootstrap behavior
- profile accuracy city-test-only rule
- registered-user leaderboard behavior
- period-aware city images and aliases
- map page structure and SVG-driven interaction model
