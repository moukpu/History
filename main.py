import base64
import hashlib
import hmac
import json
import logging
import os
import random
import secrets
import sqlite3
import time
import uuid
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from openai import AsyncOpenAI, OpenAIError
from pydantic import ValidationError

from quiz_bank.api_models import (
    AchievementCatalogResponse,
    AppBootstrapResponse,
    AuthResolveRequest,
    AuthResponse,
    CityContentResponse,
    CityContentSummariesResponse,
    CompleteMinigameRequest,
    CompleteMinigameResponse,
    EntAttemptAnalysisResponse,
    EntAttemptDetailResponse,
    FactChallengeProgressResponse,
    GoogleAuthConfigResponse,
    GoogleAuthRequest,
    LeaderboardResponse,
    LoginRequest,
    MapInitialResponse,
    MapStateResponse,
    PlayerAchievementsResponse,
    PlayerProgressResponse,
    ProfileDashboardResponse,
    QuizResponse,
    RegisterRequest,
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
    TimelinePeriodsResponse,
    UpdateAvatarRequest,
    UpdateUsernameRequest,
)
from quiz_bank.database import (
    authenticate_user,
    check_email_exists,
    check_username_exists,
    create_user,
    delete_user_account,
    ensure_database,
    fetch_random_quiz,
    fetch_user_by_id,
    fetch_user_by_email,
    get_ent_attempt_ai_analysis,
    get_ent_attempt_detail,
    get_leaderboard,
    insert_ent_attempt_details,
    insert_test_result,
    seed_city_periods,
    seed_city_period_content_if_empty,
    seed_default_achievements,
    seed_fact_challenges_if_empty,
    seed_from_json_if_empty,
    seed_timeline_periods,
    save_ent_attempt_ai_analysis,
    update_user_avatar,
    update_user_username,
    upsert_player_city_progress,
    upsert_google_user,
    connect_db,
)
from quiz_bank.admin_tools import get_site_disabled
from quiz_bank.constants import DEFAULT_PERIOD_DATA_PATH
from quiz_bank.services import (
    _utc_now_iso,
    get_achievement_catalog_response,
    get_app_bootstrap_response,
    get_city_content_response,
    get_city_content_summaries_response,
    get_fact_challenge_progress_response,
    get_map_initial_response,
    get_map_state_response,
    get_player_achievements_response,
    get_player_progress_response,
    get_profile_dashboard_response,
    get_timeline_cities_response,
    get_timeline_periods_response,
    complete_minigame,
    start_fact_challenge,
    start_test,
    submit_fact_challenge,
    submit_test,
)
from quiz_bank.telegram_admin import start_telegram_admin_bot


def _load_dotenv_file(path: str = ".env") -> None:
    if not os.path.exists(path):
        return

    with open(path, "r", encoding="utf-8") as env_file:
        for raw_line in env_file:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip("'\"")
            if key:
                os.environ.setdefault(key, value)


_load_dotenv_file()

DB_PATH = os.getenv("DB_PATH", "quizzes.db")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile").strip() or "llama-3.3-70b-versatile"
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()
FRONTEND_DIR = Path(__file__).resolve().parent / "frontend"
logger = logging.getLogger("saparquest")

# --- DEV_MODE flag --------------------------------------------------------
# DEV_MODE=1 enables /api/dev/* endpoints and the /dev-mobile/ launcher page.
# In production deploys this MUST be unset / 0 / false.
DEV_MODE = os.getenv("DEV_MODE", "").strip().lower() in {"1", "true", "yes", "on"}

# --- JWT (HS256, stdlib only) --------------------------------------------
# Tokens are issued at login/register/google/resolve and verified by the
# require_user_match dependency on sensitive mutating endpoints.
JWT_TTL_SECONDS = 30 * 24 * 3600  # 30 days
_JWT_SECRET_ENV = os.getenv("JWT_SECRET", "").strip()
if _JWT_SECRET_ENV:
    if len(_JWT_SECRET_ENV) < 32:
        # HMAC-SHA256 is only as strong as its key. Anything shorter than
        # ~32 bytes is brute-forceable; refuse to start instead of pretending.
        raise RuntimeError(
            "JWT_SECRET is too short (must be at least 32 characters). "
            "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
        )
    JWT_SECRET = _JWT_SECRET_ENV.encode("utf-8")
elif DEV_MODE:
    # No env secret in dev: generate an ephemeral one for this process.
    # Tokens won't survive restarts, which is fine for local dev only.
    JWT_SECRET = secrets.token_bytes(32)
    logging.getLogger("saparquest").warning(
        "JWT_SECRET is not configured; using an ephemeral per-process secret "
        "because DEV_MODE=1. Set JWT_SECRET before deploying to production."
    )
else:
    # Production deploy without JWT_SECRET would silently invalidate every
    # session on every restart. Refuse to start instead.
    raise RuntimeError(
        "JWT_SECRET is required in production (DEV_MODE is off). "
        "Set the JWT_SECRET environment variable to a 32+ character secret. "
        "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
    )


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def create_jwt(user_id: str, ttl_seconds: int = JWT_TTL_SECONDS) -> str:
    """Issue an HS256 JWT for ``user_id``. Stdlib-only implementation."""
    header = _b64url_encode(b'{"alg":"HS256","typ":"JWT"}')
    now = int(time.time())
    payload = json.dumps(
        {"sub": user_id, "iat": now, "exp": now + ttl_seconds},
        separators=(",", ":"),
    ).encode("utf-8")
    payload_b64 = _b64url_encode(payload)
    signing_input = f"{header}.{payload_b64}".encode("ascii")
    signature = hmac.new(JWT_SECRET, signing_input, hashlib.sha256).digest()
    return f"{header}.{payload_b64}.{_b64url_encode(signature)}"


def verify_jwt(token: str) -> dict | None:
    """Return the JWT payload dict if signature & expiry are valid, else None."""
    if not token or not isinstance(token, str):
        return None
    parts = token.split(".")
    if len(parts) != 3:
        return None
    header_b64, payload_b64, sig_b64 = parts
    try:
        signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
        expected = hmac.new(JWT_SECRET, signing_input, hashlib.sha256).digest()
        actual = _b64url_decode(sig_b64)
        if not hmac.compare_digest(expected, actual):
            return None
        payload = json.loads(_b64url_decode(payload_b64))
    except (ValueError, json.JSONDecodeError):
        return None
    if not isinstance(payload, dict):
        return None
    exp = payload.get("exp")
    if not isinstance(exp, (int, float)) or exp < time.time():
        return None
    return payload


def _extract_bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    parts = authorization.strip().split(None, 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    return parts[1].strip() or None


def require_user_match(expected_user_id: str, authorization: str | None) -> None:
    """Raise 401 unless the caller presents a JWT whose ``sub`` equals
    ``expected_user_id``. Used for endpoints that mutate user-owned data.
    """
    token = _extract_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header.")
    payload = verify_jwt(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    if str(payload.get("sub") or "") != str(expected_user_id or ""):
        raise HTTPException(status_code=403, detail="Token does not match target user.")



class CachedStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        if path.endswith((".js", ".css")):
            # Shared JS modules (api.js, storage.js, error-toast.js, a11y.js…)
            # change often and are imported from every page. Browsers that
            # aggressively cache them miss security/behavior fixes until users
            # do a manual Hard Reload. Force a revalidation round-trip so the
            # cached body is only served after a 304. For non-shared assets
            # (page-local bundles) we keep the longer max-age.
            if path.startswith("shared/") or path.startswith("shared\\"):
                response.headers["Cache-Control"] = "no-cache, must-revalidate"
            else:
                response.headers["Cache-Control"] = (
                    "public, max-age=3600, stale-while-revalidate=86400"
                )
        elif path.endswith((".svg", ".png", ".jpg", ".jpeg", ".webp", ".ico", ".woff", ".woff2")):
            response.headers.setdefault("Cache-Control", "public, max-age=604800")
        return response

_groq_client: AsyncOpenAI | None = None


def get_groq_client() -> AsyncOpenAI:
    global _groq_client
    if _groq_client is None:
        api_key = os.getenv("GROQ_API_KEY", "").strip()
        if not api_key:
            raise HTTPException(
                status_code=503,
                detail="GROQ_API_KEY is not configured on the server.",
            )
        _groq_client = AsyncOpenAI(
            api_key=api_key,
            base_url="https://api.groq.com/openai/v1",
        )
    return _groq_client


def verify_google_id_token(credential: str) -> dict[str, str]:
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=503,
            detail="Google sign-in is not configured on the server.",
        )

    try:
        query = urlencode({"id_token": credential})
        with urlopen(f"https://oauth2.googleapis.com/tokeninfo?{query}", timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception as error:
        raise HTTPException(
            status_code=401,
            detail="Google sign-in token could not be verified.",
        ) from error

    if payload.get("aud") != GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=401, detail="Google token audience does not match this app.")

    email = str(payload.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=401, detail="Google account did not provide an email.")

    if str(payload.get("email_verified", "")).lower() not in {"true", "1"}:
        raise HTTPException(status_code=401, detail="Google email is not verified.")

    subject = str(payload.get("sub") or "").strip()
    if not subject:
        raise HTTPException(status_code=401, detail="Google account id is missing.")

    return {
        "sub": subject,
        "email": email,
        "name": str(payload.get("name") or email.split("@", 1)[0]).strip(),
        "picture": str(payload.get("picture") or "").strip(),
    }


def init_db() -> None:
    ensure_database(DB_PATH)
    seed_from_json_if_empty(DB_PATH, DEFAULT_PERIOD_DATA_PATH)
    seed_timeline_periods(
        DB_PATH,
        created_at=datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
    )
    seed_city_periods(DB_PATH)
    seed_default_achievements(
        DB_PATH,
        created_at=datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
    )
    seed_city_period_content_if_empty(DB_PATH)
    seed_fact_challenges_if_empty(DB_PATH)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    telegram_admin_runtime = start_telegram_admin_bot(db_path=DB_PATH, logger=logger)
    try:
        yield
    finally:
        if telegram_admin_runtime is not None:
            await telegram_admin_runtime.stop()


app = FastAPI(
    title="Kazakhstan Interactive Map API",
    lifespan=lifespan,
)

app.add_middleware(GZipMiddleware, minimum_size=1024)

_allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "").strip()
if _allowed_origins_env:
    # Production: strict whitelist from env (comma-separated).
    ALLOWED_ORIGINS = [o.strip() for o in _allowed_origins_env.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    # Dev: allow any localhost/127.0.0.1 port (covers dev servers and IDE browser proxies).
    ALLOWED_ORIGINS = ["http://localhost:*", "http://127.0.0.1:*"]
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# --- Simple in-memory rate limiter for sensitive auth endpoints ---
_rate_limit_buckets: dict[str, deque[float]] = defaultdict(deque)
RATE_LIMITED_PATHS = {
    "/api/auth/login": (5, 60.0),       # 5 attempts per 60 seconds per IP
    "/api/auth/register": (3, 60.0),    # 3 registrations per 60 seconds per IP
    "/api/auth/google": (10, 60.0),
    "/api/auth/account": (3, 300.0),    # 3 deletes per 5 minutes per IP (very rare)
}


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@app.middleware("http")
async def rate_limit_auth(request: Request, call_next):
    path = request.url.path
    bucket_key = None
    for prefix, _ in RATE_LIMITED_PATHS.items():
        if path == prefix or path.startswith(prefix + "/"):
            bucket_key = prefix
            break
    if bucket_key is None or request.method == "GET":
        return await call_next(request)

    limit, window = RATE_LIMITED_PATHS[bucket_key]
    ip = _client_ip(request)
    key = f"{bucket_key}|{ip}"
    now = time.monotonic()
    bucket = _rate_limit_buckets[key]
    while bucket and now - bucket[0] > window:
        bucket.popleft()
    if len(bucket) >= limit:
        retry_after = int(window - (now - bucket[0])) + 1
        return JSONResponse(
            status_code=429,
            content={
                "detail": "Слишком много попыток. Подождите немного.",
                "retry_after_seconds": retry_after,
            },
            headers={"Retry-After": str(retry_after)},
        )
    bucket.append(now)
    return await call_next(request)

STATIC_API_CACHE_SECONDS = 1800
STATIC_API_CACHE_PATHS = {
    "/api/achievements/catalog",
    "/api/timeline/periods",
}
STATIC_API_CACHE_PREFIXES = (
    "/api/timeline/cities/",
    "/api/city-content/",
)


@app.middleware("http")
async def enforce_site_mode(request: Request, call_next):
    path = request.url.path
    if path != "/api/health" and get_site_disabled(DB_PATH):
        if path.startswith("/api/"):
            return JSONResponse(
                status_code=503,
                content={"detail": "Sapar Quest is temporarily disabled by an administrator."},
            )
        return PlainTextResponse(
            "Sapar Quest is temporarily disabled by an administrator.",
            status_code=503,
        )
    return await call_next(request)


@app.middleware("http")
async def add_cache_headers(request: Request, call_next):
    response = await call_next(request)
    if request.method == "GET" and response.status_code == 200:
        path = request.url.path
        if path in STATIC_API_CACHE_PATHS or path.startswith(STATIC_API_CACHE_PREFIXES):
            response.headers["Cache-Control"] = (
                f"public, max-age={STATIC_API_CACHE_SECONDS}, stale-while-revalidate=3600"
            )
    return response


@app.get("/api/quiz/static/{city}", response_model=QuizResponse)
async def get_static_quiz(city: str) -> QuizResponse:
    payload = fetch_random_quiz(DB_PATH, city)
    if payload is None:
        raise HTTPException(
            status_code=404,
            detail=f"No quizzes found for city '{city}'.",
        )
    return QuizResponse(
        question=payload["question"],
        options=payload["options"],
        correct_index=payload["correct_index"],
        fact=payload["fact"]
    )


@app.post("/api/test/start", response_model=StartTestResponse)
async def start_city_test(payload: StartTestRequest) -> StartTestResponse:
    city_name = payload.city.strip()
    if city_name == "ENT_MODE" or city_name == "ЕНТ":
        questions = _load_ent_questions()
        if not questions:
            raise HTTPException(status_code=500, detail="Нет вопросов для ЕНТ теста.")

        count = min(payload.question_count, len(questions))
        selected = random.sample(questions, count)
        session_id = f"ent-{uuid.uuid4()}"

        session_questions = [
            {
                "id": str(question["id"]),
                "question": question["question_text"],
                "options": question["options"],
                "translations": question.get("translations"),
                "correct_index": question["correct_index"],
            }
            for question in selected
        ]

        _ent_session_put(session_id, session_questions)

        return StartTestResponse(
            test_session_id=session_id,
            city="ЕНТ",
            period_code="ENT",
            questions=[
                TestQuestion(
                    id=question["id"],
                    question=question["question"],
                    options=question["options"],
                    translations=question.get("translations"),
                )
                for question in session_questions
            ],
        )
    
    return start_test(DB_PATH, payload)


@app.post("/api/test/submit", response_model=SubmitTestResponse)
async def submit_city_test(payload: SubmitTestRequest) -> SubmitTestResponse:
    if payload.test_session_id.startswith("ent-"):
        session_id = payload.test_session_id
        questions = _ent_session_pop(session_id)
        if questions is None:
            raise HTTPException(status_code=404, detail="Сессия ЕНТ не найдена.")

        correct_map = {q["id"]: q["correct_index"] for q in questions}
        selected_answers = {
            str(answer.question_id): answer.selected_index for answer in payload.answers
        }

        correct_count = 0
        for ans in payload.answers:
            if ans.selected_index == correct_map.get(ans.question_id):
                correct_count += 1

        total = len(questions)
        percent = round((correct_count / total) * 100) if total > 0 else 0
        
        # Save to database
        conn = None
        try:
            conn = connect_db(DB_PATH)
            completed_at = _utc_now_iso()
            passed = percent >= 70
            
            test_result_id = insert_test_result(
                connection=conn,
                player_id=payload.player_id,
                city="ЕНТ",
                period_code="ENT",
                total_questions=total,
                correct_answers=correct_count,
                passed=passed,
                completed_at=completed_at
            )
            insert_ent_attempt_details(
                connection=conn,
                test_result_id=test_result_id,
                questions=questions,
                selected_answers=selected_answers,
            )
            
            upsert_player_city_progress(
                connection=conn,
                player_id=payload.player_id,
                city="ЕНТ",
                period_code="ENT",
                passed=passed,
                score_percent=percent,
                completed_at=completed_at
            )
            
            conn.commit()
            conn.close()
            conn = None
        except Exception:
            logger.exception("ENT city-test compatibility submit save failed.")
            # Even if DB fails, we return the result to frontend to avoid "Failed to fetch"
        finally:
            if conn is not None:
                conn.close()
        
        return SubmitTestResponse(
            city="ЕНТ",
            period_code="ENT",
            correct_answers=correct_count,
            total_questions=total,
            score_percent=percent,
            passed=percent >= 70,
            unlocked_achievements=[],
            all_player_achievements_count=0
        )
        
    try:
        return submit_test(DB_PATH, payload)
    except HTTPException as e:
        # Добавляем метку, чтобы понять, какой код выполняется
        if "missing quiz questions" in str(e.detail):
            e.detail = f"[MAIN_PY_FIXED] {e.detail}"
        raise e


@app.get("/api/achievements/catalog", response_model=AchievementCatalogResponse)
async def achievement_catalog() -> AchievementCatalogResponse:
    return get_achievement_catalog_response(DB_PATH)


@app.get("/api/achievements/{player_id}", response_model=PlayerAchievementsResponse)
async def player_achievements(player_id: str) -> PlayerAchievementsResponse:
    return get_player_achievements_response(DB_PATH, player_id)


@app.get("/api/progress/{player_id}", response_model=PlayerProgressResponse)
async def player_progress(player_id: str) -> PlayerProgressResponse:
    return get_player_progress_response(DB_PATH, player_id)


@app.get("/api/profile/dashboard/{player_id}", response_model=ProfileDashboardResponse)
async def profile_dashboard(player_id: str) -> ProfileDashboardResponse:
    return get_profile_dashboard_response(DB_PATH, player_id)


@app.get(
    "/api/ent/attempts/{player_id}/{attempt_id}",
    response_model=EntAttemptDetailResponse,
)
async def ent_attempt_detail(
    player_id: str,
    attempt_id: int,
) -> EntAttemptDetailResponse:
    detail = get_ent_attempt_detail(DB_PATH, player_id, attempt_id)
    if detail is None:
        raise HTTPException(status_code=404, detail="Попытка ЕНТ не найдена.")
    return EntAttemptDetailResponse(**detail)


ENT_ANALYSIS_LANGUAGE_NAMES = {
    "ru": "Russian",
    "en": "English",
    "kk": "Kazakh",
}


def _localized_ent_question(question: dict, language: str) -> dict[str, object]:
    translations = question.get("translations") or {}
    localized = translations.get(language) or translations.get("ru") or {}
    options = localized.get("options") or question.get("options") or []
    return {
        "question": localized.get("question") or question.get("question") or "",
        "options": options,
    }


def _build_ent_analysis_prompt(detail: dict, language: str) -> str:
    questions_for_prompt = []
    for index, question in enumerate(detail.get("questions") or [], start=1):
        localized = _localized_ent_question(question, language)
        options = localized["options"]
        selected_index = question.get("selected_index")
        correct_index = int(question.get("correct_index") or 0)
        selected_answer = (
            "No answer"
            if selected_index is None
            else options[selected_index]
            if isinstance(selected_index, int) and selected_index < len(options)
            else "No answer"
        )
        correct_answer = options[correct_index] if correct_index < len(options) else ""
        questions_for_prompt.append(
            {
                "number": index,
                "question": localized["question"],
                "selected_answer": selected_answer,
                "correct_answer": correct_answer,
                "is_correct": bool(question.get("is_correct")),
            }
        )

    return json.dumps(
        {
            "language": ENT_ANALYSIS_LANGUAGE_NAMES.get(language, "Russian"),
            "score": {
                "correct_answers": detail.get("correct_answers"),
                "total_questions": detail.get("total_questions"),
                "score_percent": detail.get("score_percent"),
                "passed": detail.get("passed"),
            },
            "questions": questions_for_prompt,
        },
        ensure_ascii=False,
    )


def _normalize_analysis_payload(payload: dict[str, object]) -> dict[str, object]:
    def as_text(value: object, fallback: str = "") -> str:
        return str(value or fallback).strip()

    def as_list(value: object, limit: int) -> list[str]:
        if not isinstance(value, list):
            return []
        return [as_text(item) for item in value[:limit] if as_text(item)]

    return {
        "summary": as_text(payload.get("summary")),
        "strengths": as_list(payload.get("strengths"), 5),
        "weak_topics": as_list(payload.get("weak_topics"), 6),
        "recommendations": as_list(payload.get("recommendations"), 6),
        "next_steps": as_list(payload.get("next_steps"), 5),
    }


@app.get(
    "/api/ent/attempts/{player_id}/{attempt_id}/analysis",
    response_model=EntAttemptAnalysisResponse,
)
async def ent_attempt_analysis(
    player_id: str,
    attempt_id: int,
    language: str = Query(default="ru", pattern="^(ru|en|kk)$"),
) -> EntAttemptAnalysisResponse:
    cached = get_ent_attempt_ai_analysis(DB_PATH, player_id, attempt_id, language)
    if cached is not None:
        return EntAttemptAnalysisResponse(**cached)

    detail = get_ent_attempt_detail(DB_PATH, player_id, attempt_id)
    if detail is None:
        raise HTTPException(status_code=404, detail="Попытка ЕНТ не найдена.")

    system_prompt = (
        "You are a helpful exam coach for Kazakhstan history UNT preparation. "
        "Analyze only the provided attempt data. Do not invent questions or scores. "
        "Give concrete, non-template advice tied to the missed questions and visible patterns. "
        "Return strict JSON with this schema: "
        '{"summary":"...", "strengths":["..."], "weak_topics":["..."], '
        '"recommendations":["..."], "next_steps":["..."]}. '
        "All text must be in the requested language."
    )

    try:
        completion = await get_groq_client().chat.completions.create(
            model=GROQ_MODEL,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": (
                        "Create a personal analysis for this exact UNT test attempt. "
                        "Focus on which topics to repeat, what to learn next, and how to study. "
                        f"Attempt data: {_build_ent_analysis_prompt(detail, language)}"
                    ),
                },
            ],
            temperature=0.7,
            max_tokens=900,
        )
    except OpenAIError as error:
        logger.exception("Groq ENT attempt analysis request failed.")
        raise HTTPException(
            status_code=502,
            detail=f"Groq API error: {error}",
        ) from error
    except Exception as error:
        logger.exception("Unexpected ENT attempt analysis error.")
        raise HTTPException(
            status_code=502,
            detail="ENT attempt analysis failed.",
        ) from error

    raw = completion.choices[0].message.content or ""
    try:
        payload = _normalize_analysis_payload(json.loads(raw))
        response_payload = save_ent_attempt_ai_analysis(
            DB_PATH,
            attempt_id=attempt_id,
            language=language,
            analysis=payload,
        )
        return EntAttemptAnalysisResponse(**response_payload)
    except (json.JSONDecodeError, ValidationError, TypeError) as error:
        logger.exception("Malformed Groq ENT attempt analysis response.")
        raise HTTPException(
            status_code=502,
            detail=f"Malformed analysis returned by the model: {error}",
        ) from error


@app.get("/api/timeline/periods", response_model=TimelinePeriodsResponse)
async def timeline_periods() -> TimelinePeriodsResponse:
    return get_timeline_periods_response(DB_PATH)


@app.get("/api/timeline/cities/{period_code}", response_model=TimelineCitiesResponse)
async def timeline_cities(period_code: str) -> TimelineCitiesResponse:
    return get_timeline_cities_response(DB_PATH, period_code)


@app.get("/api/city-content/{period_code}", response_model=CityContentSummariesResponse)
async def city_content_by_period(period_code: str) -> CityContentSummariesResponse:
    return get_city_content_summaries_response(DB_PATH, period_code)


@app.get(
    "/api/city-content/{period_code}/{city}",
    response_model=CityContentResponse,
)
async def city_content(period_code: str, city: str) -> CityContentResponse:
    return get_city_content_response(DB_PATH, period_code, city)


@app.post(
    "/api/fact-challenge/start",
    response_model=StartFactChallengeResponse,
)
async def start_fact_game(payload: StartFactChallengeRequest) -> StartFactChallengeResponse:
    return start_fact_challenge(DB_PATH, payload)


@app.post(
    "/api/fact-challenge/submit",
    response_model=SubmitFactChallengeResponse,
)
async def submit_fact_game(
    payload: SubmitFactChallengeRequest,
) -> SubmitFactChallengeResponse:
    return submit_fact_challenge(DB_PATH, payload)


@app.get(
    "/api/fact-challenge/progress/{player_id}",
    response_model=FactChallengeProgressResponse,
)
async def fact_challenge_progress(player_id: str) -> FactChallengeProgressResponse:
    return get_fact_challenge_progress_response(DB_PATH, player_id)


@app.post("/api/minigames/complete", response_model=CompleteMinigameResponse)
async def complete_minigame_gate(
    payload: CompleteMinigameRequest,
    authorization: str | None = Header(default=None),
) -> CompleteMinigameResponse:
    require_user_match(payload.player_id, authorization)
    return complete_minigame(DB_PATH, payload)


@app.get("/api/app/bootstrap/{player_id}", response_model=AppBootstrapResponse)
async def app_bootstrap(player_id: str) -> AppBootstrapResponse:
    return get_app_bootstrap_response(DB_PATH, player_id)


@app.get("/api/map-state/{player_id}/{period_code}", response_model=MapStateResponse)
async def map_state(player_id: str, period_code: str) -> MapStateResponse:
    return get_map_state_response(DB_PATH, player_id, period_code)


@app.get("/api/map-initial/{player_id}", response_model=MapInitialResponse)
async def map_initial(player_id: str) -> MapInitialResponse:
    return get_map_initial_response(DB_PATH, player_id)


# --- ENT Test (from local JSON file) ---

ENT_QUESTIONS_PATH = os.path.join(os.path.dirname(__file__), "data", "ent_questions.json")
_ent_questions: list[dict] | None = None

# In-memory session store. Each entry expires after ENT_SESSION_TTL_SECONDS to
# prevent unbounded memory growth from abandoned tests. We sweep on every
# write (cheap: at most a handful of entries to scan in practice).
ENT_SESSION_TTL_SECONDS = 60 * 60  # 1 hour
ENT_SESSION_MAX_ENTRIES = 10_000
_ent_sessions: dict[str, dict] = {}


def _ent_sweep_expired(now: float | None = None) -> None:
    if not _ent_sessions:
        return
    cutoff = (now if now is not None else time.monotonic()) - ENT_SESSION_TTL_SECONDS
    stale = [sid for sid, entry in _ent_sessions.items() if entry["created_at"] <= cutoff]
    for sid in stale:
        _ent_sessions.pop(sid, None)
    # Hard cap: if a single bad client floods us, drop the oldest entries.
    if len(_ent_sessions) > ENT_SESSION_MAX_ENTRIES:
        ordered = sorted(_ent_sessions.items(), key=lambda item: item[1]["created_at"])
        for sid, _ in ordered[: len(_ent_sessions) - ENT_SESSION_MAX_ENTRIES]:
            _ent_sessions.pop(sid, None)


def _ent_session_put(session_id: str, questions: list[dict]) -> None:
    _ent_sweep_expired()
    _ent_sessions[session_id] = {
        "questions": questions,
        "created_at": time.monotonic(),
    }


def _ent_session_pop(session_id: str) -> list[dict] | None:
    """Return the stored questions list (and remove the entry) or None if the
    session is missing or has expired.
    """
    entry = _ent_sessions.pop(session_id, None)
    if entry is None:
        return None
    if time.monotonic() - entry["created_at"] > ENT_SESSION_TTL_SECONDS:
        return None
    return entry["questions"]


def _ent_session_peek(session_id: str) -> list[dict] | None:
    entry = _ent_sessions.get(session_id)
    if entry is None:
        return None
    if time.monotonic() - entry["created_at"] > ENT_SESSION_TTL_SECONDS:
        _ent_sessions.pop(session_id, None)
        return None
    return entry["questions"]


def _load_ent_questions() -> list[dict]:
    global _ent_questions
    if _ent_questions is None:
        with open(ENT_QUESTIONS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        _ent_questions = data.get("questions", [])
    return _ent_questions


@app.post("/api/ent/start")
async def start_ent_test(payload: dict) -> dict:
    questions = _load_ent_questions()
    if not questions:
        raise HTTPException(status_code=500, detail="Нет вопросов для ЕНТ теста.")

    count = min(payload.get("question_count", 25), len(questions))
    selected = random.sample(questions, count)
    session_id = f"ent-{uuid.uuid4()}"

    session_questions = []
    for q in selected:
        session_questions.append({
            "id": q["id"],
            "question": q["question_text"],
            "options": q["options"],
            "translations": q.get("translations"),
            "correct_index": q["correct_index"],
            "topic": q.get("topic", ""),
            "difficulty": q.get("difficulty", ""),
        })

    _ent_session_put(session_id, session_questions)

    # Return questions without correct_index to the frontend
    return {
        "test_session_id": session_id,
        "total_questions": len(session_questions),
        "questions": [
            {
                "id": q["id"],
                "question": q["question"],
                "options": q["options"],
                "translations": q.get("translations"),
                "topic": q["topic"],
                "difficulty": q["difficulty"],
            }
            for q in session_questions
        ],
    }


@app.post("/api/ent/submit")
async def submit_ent_test(payload: dict) -> dict:
    session_id = payload.get("test_session_id")
    answers = payload.get("answers", [])

    questions = _ent_session_pop(session_id) if session_id else None
    if questions is None:
        raise HTTPException(status_code=404, detail="Сессия теста не найдена.")

    correct_map = {q["id"]: q["correct_index"] for q in questions}
    selected_answers = {
        str(answer.get("question_id")): answer.get("selected_index")
        for answer in answers
    }

    correct_count = 0
    details = []
    for ans in answers:
        qid = ans.get("question_id")
        selected = ans.get("selected_index")
        expected = correct_map.get(qid)
        is_correct = selected == expected
        if is_correct:
            correct_count += 1
        details.append({
            "question_id": qid,
            "selected_index": selected,
            "correct_index": expected,
            "is_correct": is_correct,
        })

    total = len(questions)
    percent = round((correct_count / total) * 100) if total > 0 else 0

    player_id = str(payload.get("player_id") or "").strip()
    if player_id:
        conn = None
        try:
            conn = connect_db(DB_PATH)
            completed_at = _utc_now_iso()
            passed = percent >= 50
            with conn:
                test_result_id = insert_test_result(
                    connection=conn,
                    player_id=player_id,
                    city="ЕНТ",
                    period_code="ENT",
                    total_questions=total,
                    correct_answers=correct_count,
                    passed=passed,
                    completed_at=completed_at,
                )
                insert_ent_attempt_details(
                    connection=conn,
                    test_result_id=test_result_id,
                    questions=questions,
                    selected_answers=selected_answers,
                )
                upsert_player_city_progress(
                    connection=conn,
                    player_id=player_id,
                    city="ЕНТ",
                    period_code="ENT",
                    passed=passed,
                    score_percent=percent,
                    completed_at=completed_at,
                )
        except Exception:
            logger.exception("ENT submit save failed.")
        finally:
            if conn is not None:
                conn.close()

    return {
        "correct_answers": correct_count,
        "total_questions": total,
        "score_percent": percent,
        "passed": percent >= 50,
        "details": details,
    }


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


APP_VERSION = os.getenv("APP_VERSION", "").strip() or "dev"
APP_STARTED_AT = datetime.now(timezone.utc).replace(microsecond=0).isoformat()


@app.get("/api/version")
async def version() -> dict[str, str]:
    return {
        "version": APP_VERSION,
        "started_at": APP_STARTED_AT,
        "name": "Sapar Quest API",
    }


# --- Auth & Leaderboard ---


@app.post("/api/auth/register", response_model=AuthResponse)
async def register(payload: RegisterRequest) -> AuthResponse:
    if check_email_exists(DB_PATH, payload.email):
        raise HTTPException(status_code=409, detail="Аккаунт с этой почтой уже существует. Войдите в аккаунт.")
    if check_username_exists(DB_PATH, payload.username):
        raise HTTPException(status_code=409, detail="Имя пользователя уже занято.")

    user_id = f"player-{uuid.uuid4()}"
    try:
        user = create_user(DB_PATH, user_id, payload.username, payload.email, payload.password)
    except sqlite3.IntegrityError as error:
        message = str(error).lower()
        if "email" in message or "users_email" in message:
            raise HTTPException(
                status_code=409,
                detail="Аккаунт с этой почтой уже существует. Войдите в аккаунт.",
            ) from error
        if "username" in message or "users_username" in message:
            raise HTTPException(status_code=409, detail="Имя пользователя уже занято.") from error
        raise
    return AuthResponse(**user, token=create_jwt(user["id"]))


@app.post("/api/auth/login", response_model=AuthResponse)
async def login(payload: LoginRequest) -> AuthResponse:
    user = authenticate_user(DB_PATH, payload.email, payload.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Неверный email или пароль.")
    return AuthResponse(**user, token=create_jwt(user["id"]))


@app.get("/api/auth/google/config", response_model=GoogleAuthConfigResponse)
async def google_auth_config() -> GoogleAuthConfigResponse:
    return GoogleAuthConfigResponse(
        enabled=bool(GOOGLE_CLIENT_ID),
        client_id=GOOGLE_CLIENT_ID or None,
    )


@app.post("/api/auth/google", response_model=AuthResponse)
async def google_auth(payload: GoogleAuthRequest) -> AuthResponse:
    google_profile = verify_google_id_token(payload.credential)
    user_id = f"player-{uuid.uuid4()}"
    user = upsert_google_user(
        DB_PATH,
        user_id=user_id,
        email=google_profile["email"],
        username=google_profile["name"],
        google_sub=google_profile["sub"],
        avatar_url=google_profile["picture"] or None,
    )
    return AuthResponse(**user, token=create_jwt(user["id"]))


@app.post("/api/auth/resolve", response_model=AuthResponse)
async def resolve_auth(payload: AuthResolveRequest) -> AuthResponse:
    user = fetch_user_by_id(DB_PATH, payload.id) if payload.id else None
    if user is None and payload.email:
        user = fetch_user_by_email(DB_PATH, payload.email)
    if user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден.")
    return AuthResponse(**user, token=create_jwt(user["id"]))


@app.get("/api/auth/profile/{user_id}", response_model=AuthResponse)
async def get_profile(user_id: str) -> AuthResponse:
    user = fetch_user_by_id(DB_PATH, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден.")
    return AuthResponse(**user)


@app.post("/api/auth/avatar", response_model=AuthResponse)
async def update_avatar(
    payload: UpdateAvatarRequest,
    authorization: str | None = Header(default=None),
) -> AuthResponse:
    require_user_match(payload.user_id, authorization)
    user = update_user_avatar(DB_PATH, payload.user_id, payload.avatar_url)
    if user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден.")
    return AuthResponse(**user)


@app.delete("/api/auth/account/{user_id}")
async def delete_account(
    user_id: str,
    authorization: str | None = Header(default=None),
) -> dict[str, str]:
    if not user_id or not user_id.strip():
        raise HTTPException(status_code=400, detail="user_id required")
    require_user_match(user_id, authorization)
    deleted = delete_user_account(DB_PATH, user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Аккаунт не найден.")
    return {"deleted": "true", "user_id": user_id}


@app.post("/api/auth/username", response_model=AuthResponse)
async def update_username(
    payload: UpdateUsernameRequest,
    authorization: str | None = Header(default=None),
) -> AuthResponse:
    require_user_match(payload.user_id, authorization)
    try:
        user = update_user_username(DB_PATH, payload.user_id, payload.username)
    except sqlite3.IntegrityError as error:
        raise HTTPException(status_code=409, detail="Имя пользователя уже занято.") from error

    if user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден.")
    return AuthResponse(**user)


@app.get("/api/leaderboard", response_model=LeaderboardResponse)
async def leaderboard() -> LeaderboardResponse:
    entries = get_leaderboard(DB_PATH, limit=50)
    return LeaderboardResponse(entries=entries)


# --- Dev-only endpoints --------------------------------------------------
# Registered only when DEV_MODE is on. In production deploys DEV_MODE must be
# unset/0/false so the entire /api/dev/* surface returns 404.
if DEV_MODE:

    @app.post("/api/dev/unlock-all-periods/{user_id}")
    async def dev_unlock_all_periods(
        user_id: str,
        request: Request,
        authorization: str | None = Header(default=None),
    ):
        if not user_id or not user_id.strip():
            raise HTTPException(status_code=400, detail="user_id required")
        # Localhost guard plus JWT match: even a developer must hold a valid
        # token for the target user before unlocking their progress.
        client = request.client.host if request.client else ""
        if client not in ("127.0.0.1", "localhost", "::1"):
            raise HTTPException(status_code=403, detail="dev endpoint: localhost only")
        require_user_match(user_id, authorization)

        connection = connect_db(DB_PATH)
        try:
            with connection:
                period_rows = connection.execute(
                    "SELECT code FROM timeline_periods ORDER BY sort_order"
                ).fetchall()
                now = _utc_now_iso()
                codes = [str(row["code"]) for row in period_rows]
                for code in codes:
                    connection.execute(
                        """
                        INSERT INTO player_period_overrides (
                            player_id, period_code, is_unlocked, updated_at
                        ) VALUES (?, ?, 1, ?)
                        ON CONFLICT(player_id, period_code) DO UPDATE SET
                            is_unlocked = 1,
                            updated_at = excluded.updated_at
                        """,
                        (user_id, code, now),
                    )
        finally:
            connection.close()

        return {"unlocked_periods": codes, "user_id": user_id}


@app.get("/", include_in_schema=False)
async def frontend_index() -> RedirectResponse:
    return RedirectResponse(url="/registration/code.html")


if FRONTEND_DIR.exists():
    @app.get("/favicon.ico", include_in_schema=False)
    async def favicon_ico() -> FileResponse:
        return FileResponse(
            FRONTEND_DIR / "favicon.svg",
            media_type="image/svg+xml",
            headers={"Cache-Control": "public, max-age=86400"},
        )

    # /dev-mobile/* is the developer launcher (auto-login as dev user, unlock
    # all periods). It is gated by DEV_MODE so a production deploy serves a
    # plain 404 instead of leaking the dev-only credentials/UI.
    if not DEV_MODE:
        @app.api_route(
            "/dev-mobile/{_rest:path}",
            methods=["GET", "HEAD"],
            include_in_schema=False,
        )
        async def dev_mobile_disabled(_rest: str):
            raise HTTPException(status_code=404, detail="Not Found")

    @app.get("/robots.txt", include_in_schema=False)
    async def robots_txt() -> FileResponse:
        return FileResponse(FRONTEND_DIR / "robots.txt", media_type="text/plain")

    @app.get("/sitemap.xml", include_in_schema=False)
    async def sitemap_xml() -> FileResponse:
        return FileResponse(FRONTEND_DIR / "sitemap.xml", media_type="application/xml")

    @app.get("/manifest.json", include_in_schema=False)
    async def manifest_json() -> FileResponse:
        return FileResponse(
            FRONTEND_DIR / "manifest.json",
            media_type="application/manifest+json",
            headers={"Cache-Control": "public, max-age=3600"},
        )

    _NOT_FOUND_PAGE = FRONTEND_DIR / "404.html"

    # Catch-all for unknown /api/* paths: must come AFTER all specific API routes
    # but BEFORE app.mount("/") so StaticFiles never sees /api/* and swallows them
    # with the HTML 404 page (which it does automatically when html=True).
    @app.api_route(
        "/api/{_rest:path}",
        include_in_schema=False,
        methods=["GET", "POST", "DELETE", "PUT", "PATCH", "OPTIONS", "HEAD"],
    )
    async def api_not_found_fallback(_rest: str):
        raise HTTPException(status_code=404, detail="API endpoint not found")

    @app.exception_handler(StarletteHTTPException)
    async def custom_404_handler(request: Request, exc: StarletteHTTPException):
        if exc.status_code != 404:
            return JSONResponse(
                status_code=exc.status_code,
                content={"detail": exc.detail},
            )

        raw_path = str(request.url.path or request.scope.get("path", ""))
        if not raw_path.startswith("/"):
            raw_path = "/" + raw_path
        is_api = raw_path.startswith("/api/") or raw_path == "/api"
        accept = request.headers.get("accept", "").lower()
        wants_html = "text/html" in accept or accept == ""

        # API clients always get JSON; only browser-style requests get the HTML page.
        if not is_api and wants_html and _NOT_FOUND_PAGE.exists():
            return FileResponse(
                _NOT_FOUND_PAGE,
                status_code=404,
                media_type="text/html",
            )

        return JSONResponse(
            status_code=404,
            content={"detail": exc.detail or "Not Found", "path": raw_path},
        )

    app.mount("/", CachedStaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
