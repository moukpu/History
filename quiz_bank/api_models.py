from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints, field_validator

from .constants import (
    DEFAULT_TEST_QUESTION_COUNT,
    DEFAULT_FACT_CANDIDATE_COUNT,
    MAX_FACT_CANDIDATE_COUNT,
    MAX_TEST_QUESTION_COUNT,
    SUPPORTED_CITIES,
    TIMELINE_PERIOD_CODES,
)

PlayerId = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
SessionId = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]

ALLOWED_EMAIL_DOMAINS = {
    "gmail.com",
    "googlemail.com",
    "outlook.com",
    "hotmail.com",
    "live.com",
    "msn.com",
    "yahoo.com",
    "icloud.com",
    "me.com",
    "mac.com",
    "mail.com",
    "email.com",
    "usa.com",
    "post.com",
    "mail.ru",
    "inbox.ru",
    "list.ru",
    "bk.ru",
    "yandex.ru",
    "yandex.com",
    "ya.ru",
    "proton.me",
    "protonmail.com",
}


def validate_common_email_domain(value: str) -> str:
    normalized = value.strip().lower()
    if "@" not in normalized or normalized.startswith("@") or normalized.endswith("@"):
        raise ValueError("Enter a valid email address.")

    domain = normalized.rsplit("@", 1)[1]
    if domain not in ALLOWED_EMAIL_DOMAINS:
        raise ValueError(
            "Use a common email domain such as gmail.com, mail.com, outlook.com, "
            "yahoo.com, icloud.com, mail.ru, yandex.ru, or proton.me."
        )

    return normalized


def _validate_supported_city(value: str) -> str:
    if value not in SUPPORTED_CITIES:
        raise ValueError("Unsupported city.")
    return value


def _validate_period_code(value: str) -> str:
    if value not in TIMELINE_PERIOD_CODES:
        raise ValueError("Unsupported period_code.")
    return value


class QuizResponse(BaseModel):
    question: str
    options: list[str] = Field(..., min_length=4, max_length=4)
    correct_index: int = Field(..., ge=0, le=3)
    fact: str


class StartTestRequest(BaseModel):
    player_id: PlayerId
    city: str
    period_code: str
    language: str = "ru"
    question_count: int = Field(
        default=DEFAULT_TEST_QUESTION_COUNT,
        ge=1,
        le=MAX_TEST_QUESTION_COUNT,
    )

    @field_validator("city")
    @classmethod
    def validate_city(cls, value: str) -> str:
        return _validate_supported_city(value)

    @field_validator("period_code")
    @classmethod
    def validate_period_code(cls, value: str) -> str:
        return _validate_period_code(value)

    @field_validator("language")
    @classmethod
    def validate_language(cls, value: str) -> str:
        language = value.strip().lower()
        if language not in {"ru", "en", "kk"}:
            return "ru"
        return language


class LocalizedQuestionText(BaseModel):
    question: str
    options: list[str] = Field(..., min_length=4, max_length=4)
    fact: str | None = None


class TestQuestion(BaseModel):
    id: int | str
    question: str
    options: list[str] = Field(..., min_length=4, max_length=4)
    translations: dict[str, LocalizedQuestionText] | None = None


class StartTestResponse(BaseModel):
    test_session_id: str
    city: str
    period_code: str
    questions: list[TestQuestion]


class SubmittedAnswer(BaseModel):
    question_id: int | str
    selected_index: int = Field(..., ge=0, le=3)


class SubmitTestRequest(BaseModel):
    player_id: PlayerId
    test_session_id: SessionId
    answers: list[SubmittedAnswer] = Field(default_factory=list)


class AchievementCatalogItem(BaseModel):
    code: str
    name: str
    description: str
    city: str | None = None
    period_code: str | None = None
    threshold: int | None = None
    created_at: str


class UnlockedAchievement(BaseModel):
    code: str
    name: str
    description: str
    city: str | None = None
    period_code: str | None = None
    threshold: int | None = None
    unlocked_at: str


class SubmitTestResponse(BaseModel):
    city: str
    period_code: str
    total_questions: int
    correct_answers: int
    score_percent: int
    passed: bool
    unlocked_achievements: list[UnlockedAchievement]
    all_player_achievements_count: int


class PlayerAchievementsResponse(BaseModel):
    achievements: list[UnlockedAchievement]


class CityProgressItem(BaseModel):
    city: str
    period_code: str
    passed_count: int
    best_score: int
    total_attempts: int
    last_completed_at: str | None = None


class EntAttemptItem(BaseModel):
    id: int
    total_questions: int
    correct_answers: int
    score_percent: int
    passed: bool
    completed_at: str
    has_details: bool = False


class EntAttemptQuestionDetail(BaseModel):
    question_id: str
    question: str
    options: list[str] = Field(..., min_length=4, max_length=4)
    translations: dict[str, LocalizedQuestionText] | None = None
    selected_index: int | None = Field(default=None, ge=0, le=3)
    correct_index: int = Field(..., ge=0, le=3)
    is_correct: bool


class EntAttemptDetailResponse(BaseModel):
    id: int
    total_questions: int
    correct_answers: int
    score_percent: int
    passed: bool
    completed_at: str
    questions: list[EntAttemptQuestionDetail]


class EntAttemptAnalysisResponse(BaseModel):
    summary: str
    strengths: list[str] = Field(default_factory=list, max_length=5)
    weak_topics: list[str] = Field(default_factory=list, max_length=6)
    recommendations: list[str] = Field(default_factory=list, max_length=6)
    next_steps: list[str] = Field(default_factory=list, max_length=5)
    created_at: str


class PlayerProgressResponse(BaseModel):
    total_tests_completed: int
    total_passed_tests: int
    overall_accuracy_percent: int
    distinct_cities_passed: int
    city_progress: list[CityProgressItem]
    ent_attempts: list[EntAttemptItem] = Field(default_factory=list)
    total_achievements_unlocked: int
    unlocked_period_codes: list[str] = Field(default_factory=list)
    completed_period_codes: list[str] = Field(default_factory=list)
    current_period_code: str | None = None


class AchievementCatalogResponse(BaseModel):
    achievements: list[AchievementCatalogItem]


class TimelinePeriodItem(BaseModel):
    code: str
    year_label: str
    title: str
    sort_order: int
    description: str
    created_at: str


class TimelinePeriodsResponse(BaseModel):
    periods: list[TimelinePeriodItem]


class TimelineCityItem(BaseModel):
    city: str
    period_code: str
    display_name: str
    subtitle: str | None = None
    is_available: int


class TimelineCitiesResponse(BaseModel):
    cities: list[TimelineCityItem]


class CityContentSummaryItem(BaseModel):
    city: str
    period_code: str
    display_name: str
    subtitle: str | None = None
    short_description: str
    quiz_available: int
    fact_challenge_available: int


class CityContentSummariesResponse(BaseModel):
    cities: list[CityContentSummaryItem]


class CityContentItem(BaseModel):
    city: str
    period_code: str
    display_name: str
    subtitle: str | None = None
    short_description: str
    history_summary: str
    interesting_fact: str
    old_name: str | None = None
    importance_reason: str | None = None
    image_keys: list[str] | None = None
    quiz_available: int
    fact_challenge_available: int


class CityContentResponse(BaseModel):
    content: CityContentItem


class StartFactChallengeRequest(BaseModel):
    player_id: PlayerId
    period_code: str
    candidate_count: int = Field(
        default=DEFAULT_FACT_CANDIDATE_COUNT,
        ge=2,
        le=MAX_FACT_CANDIDATE_COUNT,
    )

    @field_validator("period_code")
    @classmethod
    def validate_period_code(cls, value: str) -> str:
        return _validate_period_code(value)


class StartFactChallengeResponse(BaseModel):
    session_id: str
    period_code: str
    fact_text: str
    candidate_cities: list[str] = Field(..., min_length=2)


class SubmitFactChallengeRequest(BaseModel):
    player_id: PlayerId
    session_id: SessionId
    selected_city: str

    @field_validator("selected_city")
    @classmethod
    def validate_selected_city(cls, value: str) -> str:
        return _validate_supported_city(value)


class SubmitFactChallengeResponse(BaseModel):
    is_correct: bool
    correct_city: str
    period_code: str
    fact_text: str
    unlocked_achievements: list[UnlockedAchievement]


class FactChallengePeriodProgressItem(BaseModel):
    period_code: str
    total_attempts: int
    total_correct: int
    accuracy_percent: int


class FactChallengeProgressResponse(BaseModel):
    total_attempts: int
    total_correct: int
    accuracy_percent: int
    per_period_summary: list[FactChallengePeriodProgressItem]


class AppBootstrapPlayerSummary(BaseModel):
    total_tests_completed: int
    total_passed_tests: int
    total_achievements_unlocked: int
    fact_challenge_attempts: int
    fact_challenge_correct: int


class QuestPeriodStateItem(BaseModel):
    code: str
    year_label: str
    title: str
    sort_order: int
    description: str
    is_unlocked: bool
    is_completed: bool
    is_current: bool
    total_cities: int
    passed_cities: int
    remaining_cities: int
    next_period_code: str | None = None
    next_period_title: str | None = None


class AppBootstrapQuestSummary(BaseModel):
    current_period_code: str
    current_period_title: str
    unlocked_periods_count: int
    completed_periods_count: int
    total_periods_count: int


class AppBootstrapCityItem(BaseModel):
    city: str
    period_code: str
    display_name: str
    subtitle: str | None = None
    quiz_available: bool
    fact_challenge_available: bool
    has_content: bool


class AppBootstrapResponse(BaseModel):
    periods: list[QuestPeriodStateItem]
    default_period_code: str
    player_summary: AppBootstrapPlayerSummary
    quest_summary: AppBootstrapQuestSummary
    achievements_preview: list[UnlockedAchievement]
    available_cities_for_default_period: list[AppBootstrapCityItem]


class ProfileDashboardResponse(BaseModel):
    bootstrap: AppBootstrapResponse
    progress: PlayerProgressResponse
    achievements: PlayerAchievementsResponse
    catalog: AchievementCatalogResponse


class MapStateCityItem(BaseModel):
    city: str
    display_name: str
    subtitle: str | None = None
    quiz_available: bool
    fact_challenge_available: bool
    has_content: bool
    is_locked_for_testing: bool = False
    passed_quiz_in_this_period: bool
    best_score_in_this_period: int
    total_attempts_in_this_period: int
    has_fact_success_in_this_period: bool
    unlocked_city_achievement: bool


class MapStatePeriodSummary(BaseModel):
    period_code: str
    total_cities: int
    cities_passed: int
    fact_correct_count: int
    period_achievements_unlocked: int = 0
    completion_percent: int
    is_unlocked_for_progression: bool
    is_completed: bool
    is_current_quest_period: bool
    remaining_cities: int
    next_period_code: str | None = None
    next_period_title: str | None = None
    next_period_unlocked: bool = False


class MapStateResponse(BaseModel):
    period_code: str
    summary: MapStatePeriodSummary
    quest_periods: list[QuestPeriodStateItem] = Field(default_factory=list)
    cities: list[MapStateCityItem]


class MapInitialResponse(BaseModel):
    bootstrap: AppBootstrapResponse
    map_state: MapStateResponse


# --- Auth models ---

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=2, max_length=30)
    email: str = Field(..., min_length=5, max_length=120)
    password: str = Field(..., min_length=4, max_length=128)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        normalized = " ".join(value.strip().split())
        if len(normalized) < 2:
            raise ValueError("Username must contain at least 2 characters.")
        return normalized

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return validate_common_email_domain(value)


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return validate_common_email_domain(value)


class GoogleAuthRequest(BaseModel):
    credential: str = Field(..., min_length=10)


class AuthResolveRequest(BaseModel):
    id: str | None = None
    email: str | None = None

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str | None) -> str | None:
        return value.strip().lower() if value else value


class UpdateAvatarRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    avatar_url: str | None = None

    @field_validator("user_id")
    @classmethod
    def normalize_user_id(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("User id is required.")
        return normalized

    @field_validator("avatar_url")
    @classmethod
    def normalize_avatar_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class AuthResponse(BaseModel):
    id: str
    username: str
    email: str
    created_at: str
    avatar_url: str | None = None


class GoogleAuthConfigResponse(BaseModel):
    enabled: bool
    client_id: str | None = None


class LeaderboardEntry(BaseModel):
    id: str
    username: str
    total_score: int
    total_tests: int
    accuracy: int
    achievements_count: int
    avatar_url: str | None = None


class LeaderboardResponse(BaseModel):
    entries: list[LeaderboardEntry]
