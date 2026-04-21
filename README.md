# Kazakhstan Timeline Map

Interactive historical map of Kazakhstan with a period-based quest flow, city quizzes, achievements, player profiles, and a leaderboard.

## What is inside

- `backend`: FastAPI API with SQLite persistence
- `frontend`: static multi-page site for the map, profile, quizzes, and leaderboard
- `period-aware progression`: the player starts from the first period and unlocks the next one only after finishing the city tests for the current period
- `city + period` content model across quizzes, map state, achievements, and media
- `quizzes.db`: ready-to-run SQLite database included in the repo
- `data/` and `scripts/`: source JSON files and rebuild/import utilities

## Repository structure

- `main.py` - FastAPI entry point
- `quiz_bank/` - backend logic, database access, services, constants, models
- `data/` - quizzes, city content, fact challenges, ENT questions
- `scripts/` - generation, validation, and import scripts
- `tests/` - automated backend and integration tests
- `frontend/` - site pages, shared JavaScript, assets, local static server
- `docs/api_contract.md` - API notes for frontend/backend integration
- `docs/AI_RUNBOOK.md` - project guide for AI agents

## Requirements

Minimum:

- Git
- Python 3.11 or newer

Optional:

- Node.js 18 or newer if you want to run the frontend through `npm`

Download links:

- Git: https://git-scm.com/downloads
- Python: https://www.python.org/downloads/
- Node.js: https://nodejs.org/

Notes:

- Add Python to `PATH` during installation if the installer offers that option.
- The core site works without Node.js because the frontend can also be served by Python.
- `OPENAI_API_KEY` is optional. It is only required for the dynamic quiz endpoint `/api/quiz/dynamic/{city}`. The main map, profile, leaderboard, city tests, and ENT tests work without it.
- `GOOGLE_CLIENT_ID` is optional. It is only required if you want the Google sign-in button to work.

## Quick start

Open two terminals: one for the backend and one for the frontend.

### 1. Clone the repository

```bash
git clone https://github.com/azimxxd/kazakhstanmap.git
cd kazakhstanmap
```

### 2. Start the backend

Create a virtual environment:

```bash
python -m venv .venv
```

Activate it.

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Windows CMD:

```cmd
.venv\Scripts\activate.bat
```

Linux or macOS:

```bash
source .venv/bin/activate
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

Start the API:

```bash
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Backend URLs:

- Health check: `http://127.0.0.1:8000/api/health`
- Swagger UI: `http://127.0.0.1:8000/docs`

### 3. Start the frontend

Go to the frontend folder:

```bash
cd frontend
```

Option A: serve the frontend with Python:

```bash
python -m http.server 3000
```

Option B: serve the frontend with Node.js:

```bash
npm ci
npm run start
```

Frontend URL:

- `http://127.0.0.1:3000`

Main entry pages:

- Home: `http://127.0.0.1:3000/home_page/code.html`
- Map hub: `http://127.0.0.1:3000/map_hub/code.html`
- Profile: `http://127.0.0.1:3000/profile/code.html`
- Leaderboard: `http://127.0.0.1:3000/leaderboard/code.html`

## First run behavior

- The repository already contains `quizzes.db`, so the app can start immediately after cloning.
- If `quizzes.db` is missing, backend startup recreates the schema and seeds the core data from the JSON files in `data/`.
- Registered users are stored in the backend database. One normalized email address can only belong to one account.
- On startup, the backend migrates older SQLite databases, merges duplicate users with the same email, and keeps their quiz progress, achievements, ENT attempts, and leaderboard data under one account.
- Browser `localStorage` only stores the currently signed-in user id/session-side convenience data; the actual account, progress, profile, and leaderboard data live in the database.

## Authentication and database notes

Password registration and login work with SQLite out of the box. The backend enforces unique emails and usernames with database indexes, so duplicate accounts cannot be created by bypassing the frontend.

For Google sign-in, create a Google OAuth client for a Web application and set the client id before starting the backend. The backend accepts a Google account token, checks the Google email, then either signs in the existing account with that email or creates a new account automatically.

Local `.env` setup:

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Linux or macOS:

```bash
cp .env.example .env
```

Then edit `.env`:

```bash
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

Restart the backend after changing `.env`.

You can also set the variable directly before starting the backend:

Windows PowerShell:

```powershell
$env:GOOGLE_CLIENT_ID="your_google_client_id.apps.googleusercontent.com"
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Linux, macOS, or Railway variables:

```bash
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

When `GOOGLE_CLIENT_ID` is not set, the Google button stays visible but disabled with a setup note. Normal email/password auth still works.

For Railway deployment with SQLite, use a persistent volume and point `DB_PATH` to a file inside that mounted volume. Example:

```bash
DB_PATH=/data/quizzes.db
```

Without a persistent volume, Railway can redeploy the app with a fresh filesystem and the SQLite data file may be reset.

## Railway deployment

This repo is prepared for a single Railway service. FastAPI serves both:

- API routes under `/api/...`
- the static frontend from the `frontend/` folder

Railway will read `railway.json` and start the app with:

```bash
python -m uvicorn main:app --host 0.0.0.0 --port $PORT
```

Deploy steps:

1. Push this repo/branch to GitHub.
2. In Railway, create a new project from the GitHub repo.
3. In the service settings, generate a public Railway domain.
4. In Variables, add the values from `.env.railway.example`.
5. Add a Railway volume mounted at `/data`.
6. Set `DB_PATH=/data/quizzes.db`.
7. Set `GOOGLE_CLIENT_ID` to your Google OAuth Web Client ID.
8. Redeploy the service.

After Railway gives you a domain, add that exact domain to Google Cloud Console:

```text
https://your-project.up.railway.app
```

Add it under **Authorized JavaScript origins** for the same OAuth Web Client ID. Do not add page paths like `/registration/code.html`.

Important variable notes:

- `GOOGLE_CLIENT_ID` is not secret, but it is environment-specific.
- `OPENAI_API_KEY` is optional and should be set only if you want dynamic quiz generation.
- Do not commit your real `.env`; use Railway service variables.

## Gameplay rules

- The game starts from the first historical period.
- The next period unlocks only after the player completes all city tests for the current period.
- When the app opens again, the selected main period is the latest unlocked period.
- Profile accuracy is based on city tests only. ENT tests do not affect profile accuracy.
- The leaderboard is intended to show registered users with real usernames, not guest IDs.

## Verification

Backend health check:

```bash
curl http://127.0.0.1:8000/api/health
```

If `curl` is not available, open the health URL in a browser.

## Tests

Run all backend tests:

```bash
python -m unittest discover -s tests -v
```

Useful focused checks:

```bash
python -m unittest tests.test_frontend_integration_api -v
python -m unittest tests.test_achievement_flow -v
python -m unittest tests.test_fact_challenge_flow -v
```

Frontend JavaScript syntax check examples:

```bash
node --check frontend/shared/map-hub.js
node --check frontend/shared/profile.js
node --check frontend/shared/leaderboard.js
```

## Data regeneration and import

The repo keeps source data in `data/` and import helpers in `scripts/`.

### Period quizzes

```bash
python scripts/generate_period_quizzes.py
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

## Common problems

### Backend starts but the frontend shows no data

Make sure the backend is running on:

- `http://127.0.0.1:8000`

The frontend default API base lives in:

- `frontend/shared/config.js`

### Port 8000 or 3000 is already busy

Run the server on a different port and update the frontend API base if needed.

### Dynamic quiz endpoint returns an OpenAI error

Set an API key before starting the backend:

Windows PowerShell:

```powershell
$env:OPENAI_API_KEY="your_key_here"
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Linux or macOS:

```bash
export OPENAI_API_KEY="your_key_here"
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

## Additional documentation

- API reference notes: [docs/api_contract.md](docs/api_contract.md)
- AI project guide: [docs/AI_RUNBOOK.md](docs/AI_RUNBOOK.md)
