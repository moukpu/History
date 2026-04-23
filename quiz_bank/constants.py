from pathlib import Path

APPROVED_CITIES = [
    "Астана",
    "Алматы",
    "Шымкент",
    "Актобе",
    "Караганда",
    "Тараз",
    "Павлодар",
    "Оскемен",
    "Семей",
    "Атырау",
    "Костанай",
    "Кызылорда",
    "Орал",
    "Петропавл",
    "Актау",
]

HISTORICAL_ONLY_CITIES = [
    "Туркестан",
    "Сыгнак",
    "Яссы",
    "Отрар",
    "Сауран",
    "Сайрам",
    "Верный",
    "Семипалатинск",
    "Петропавловск",
    "Уральск",
    "Усть-Каменогорск",
    "Гурьев",
    "Аулие-Ата",
    "Перовск",
    "Акмолинск",
    "Казалинск",
    "Чимкент",
]

SUPPORTED_CITIES = [*APPROVED_CITIES, *HISTORICAL_ONLY_CITIES, "ENT_MODE"]

PERIOD_CITY_LISTS = {
    "khanate_1465": [
        "Сыгнак",
        "Яссы",
        "Отрар",
        "Сауран",
        "Сайрам",
        "Тараз",
    ],
    "imperial_1731": [
        "Туркестан",
        "Сыгнак",
        "Отрар",
        "Сайрам",
        "Тараз",
    ],
    "imperial_1868": [
        "Верный",
        "Семипалатинск",
        "Петропавловск",
        "Уральск",
        "Усть-Каменогорск",
        "Гурьев",
        "Аулие-Ата",
        "Перовск",
        "Акмолинск",
        "Туркестан",
        "Казалинск",
        "Чимкент",
    ],
}

TIMELINE_PERIODS = [
    {
        "code": "khanate_1465",
        "year_label": "1465",
        "title": "Казахское ханство",
        "sort_order": 1,
        "description": "Период становления Казахского ханства и ранней политической истории степи.",
    },
    {
        "code": "imperial_1731",
        "year_label": "1731",
        "title": "Раннее влияние Российской империи",
        "sort_order": 2,
        "description": "Период усиления российского влияния и изменения политических связей в степи.",
    },
    {
        "code": "imperial_1868",
        "year_label": "1868",
        "title": "Позднеимперская административная реформа",
        "sort_order": 3,
        "description": "Период административных реформ и углубления имперского управления в регионе.",
    },
    {
        "code": "soviet_1925",
        "year_label": "1925",
        "title": "Ранний советский период",
        "sort_order": 4,
        "description": "Период раннего советского государства и перестройки городского пространства Казахстана.",
    },
    {
        "code": "independence_1991",
        "year_label": "1991",
        "title": "Независимость",
        "sort_order": 5,
        "description": "Период распада СССР и первых лет независимого Казахстана.",
    },
    {
        "code": "transition_1998",
        "year_label": "1998",
        "title": "Новая столица и переходный период",
        "sort_order": 6,
        "description": "Период переноса столицы и активного постсоветского преобразования страны.",
    },
    {
        "code": "modern_2025",
        "year_label": "2025",
        "title": "Современный Казахстан",
        "sort_order": 7,
        "description": "Современный этап развития Казахстана с актуальной административной картой и городами.",
    },
]

TIMELINE_PERIOD_CODES = [period["code"] for period in TIMELINE_PERIODS] + ["ENT"]
TIMELINE_PERIODS_BY_CODE = {
    period["code"]: period for period in TIMELINE_PERIODS
}
DEFAULT_PERIOD_CODE = "modern_2025"

CITY_QUESTION_TARGET = 30
QUIZ_DIFFICULTIES = ("easy", "hard")
PERIOD_EASY_QUESTION_TARGET = 10
PERIOD_HARD_QUESTION_TARGET = 10
PERIOD_TOTAL_QUESTION_TARGET = PERIOD_EASY_QUESTION_TARGET + PERIOD_HARD_QUESTION_TARGET
DATA_FILE_NAME = "quizzes_period_ru.json"
PERIOD_DATA_FILE_NAME = "quizzes_period_ru.json"
PERIOD_MULTILANG_DATA_FILE_NAME = "quizzes_period_multilang.json"
CITY_PERIOD_CONTENT_FILE_NAME = "city_period_content_ru.json"
FACT_CHALLENGE_DATA_FILE_NAME = "fact_challenges_ru.json"
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DATA_PATH = PROJECT_ROOT / "data" / DATA_FILE_NAME
DEFAULT_PERIOD_DATA_PATH = PROJECT_ROOT / "data" / PERIOD_DATA_FILE_NAME
DEFAULT_PERIOD_MULTILANG_DATA_PATH = PROJECT_ROOT / "data" / PERIOD_MULTILANG_DATA_FILE_NAME
DEFAULT_CITY_PERIOD_CONTENT_PATH = PROJECT_ROOT / "data" / CITY_PERIOD_CONTENT_FILE_NAME
DEFAULT_FACT_CHALLENGE_DATA_PATH = PROJECT_ROOT / "data" / FACT_CHALLENGE_DATA_FILE_NAME
DEFAULT_TEST_QUESTION_COUNT = 5
MAX_TEST_QUESTION_COUNT = 20
DEFAULT_FACT_CANDIDATE_COUNT = 4
MAX_FACT_CANDIDATE_COUNT = 10
PASS_THRESHOLD = 0.7

CITY_ACHIEVEMENT_CODES = {
    "Астана": "city_astana",
    "Алматы": "city_almaty",
    "Шымкент": "city_shymkent",
    "Актобе": "city_aktobe",
    "Караганда": "city_karaganda",
    "Тараз": "city_taraz",
    "Павлодар": "city_pavlodar",
    "Оскемен": "city_oskemen",
    "Семей": "city_semey",
    "Атырау": "city_atyrau",
    "Костанай": "city_kostanay",
    "Кызылорда": "city_kyzylorda",
    "Орал": "city_oral",
    "Петропавл": "city_petropavl",
    "Актау": "city_aktau",
    "Туркестан": "city_turkistan",
    "Сыгнак": "city_sygnak",
    "Яссы": "city_yassy",
    "Отрар": "city_otrar",
    "Сауран": "city_sauran",
    "Сайрам": "city_sairam",
    "Верный": "city_verny",
    "Семипалатинск": "city_semipalatinsk",
    "Петропавловск": "city_petropavlovsk",
    "Уральск": "city_uralsk",
    "Усть-Каменогорск": "city_ust_kamenogorsk",
    "Гурьев": "city_guryev",
    "Аулие-Ата": "city_aulie_ata",
    "Перовск": "city_perovsk",
    "Акмолинск": "city_akmolinsk",
    "Казалинск": "city_kazalinsk",
    "Чимкент": "city_chimkent",
}

PERIOD_UNLOCK_SEQUENCE = [period["code"] for period in TIMELINE_PERIODS]
QUEST_START_PERIOD_CODE = PERIOD_UNLOCK_SEQUENCE[0]

PERIOD_ACHIEVEMENT_CODES = {
    "khanate_1465": "khanate_complete_1465",
    "imperial_1731": "imperial_step_1731",
    "imperial_1868": "imperial_step_1868",
    "soviet_1925": "soviet_complete_1925",
    "independence_1991": "independence_complete_1991",
    "transition_1998": "transition_complete_1998",
    "modern_2025": "modern_complete_2025",
}

PERIOD_MASTER_ACHIEVEMENT_CODES = {
    period["code"]: f"period_master_{period['code']}" for period in TIMELINE_PERIODS
}

GLOBAL_ACHIEVEMENTS = [
    {
        "code": "first_city_pass",
        "name": "Первый пройденный город",
        "description": "Успешно пройден первый городской тест.",
        "city": None,
        "period_code": None,
        "threshold": None,
    },
    {
        "code": "first_period_complete",
        "name": "Первая эпоха закрыта",
        "description": "Полностью пройден первый исторический период.",
        "city": None,
        "period_code": None,
        "threshold": 3,
    },
    {
        "code": "timeline_explorer",
        "name": "Исследователь эпох",
        "description": "Открыты и пройдены города как минимум в трёх разных периодах.",
        "city": None,
        "period_code": None,
        "threshold": 3,
    },
    {
        "code": "full_timeline_complete",
        "name": "Вся лента пройдена",
        "description": "Полностью завершены все игровые периоды временной шкалы.",
        "city": None,
        "period_code": None,
        "threshold": None,
    },
    {
        "code": "perfect_city_test",
        "name": "Идеальный результат",
        "description": "Городской тест пройден без единой ошибки.",
        "city": None,
        "period_code": None,
        "threshold": None,
    },
]

CITY_MILESTONE_ACHIEVEMENTS = {}

TIMED_CITY_ACHIEVEMENTS = [
    {
        "code": "fast_city_test",
        "name": "Быстрый маршрут",
        "description": "Городской тест пройден минимум на 4 правильных ответа быстрее чем за 30 секунд.",
        "city": None,
        "period_code": None,
        "threshold": 30,
    },
    {
        "code": "perfect_fast_city_test",
        "name": "Молниеносный знаток",
        "description": "Городской тест пройден без ошибок быстрее чем за 30 секунд.",
        "city": None,
        "period_code": None,
        "threshold": 30,
    },
    {
        "code": "steady_city_test",
        "name": "Уверенный темп",
        "description": "Городской тест пройден минимум на 4 правильных ответа быстрее чем за 50 секунд.",
        "city": None,
        "period_code": None,
        "threshold": 50,
    },
]

FACT_MILESTONE_ACHIEVEMENTS = {
    5: "fact_correct_5",
    10: "fact_correct_10",
}

FACT_GAME_ACHIEVEMENTS = [
    {
        "code": "fact_first_correct",
        "name": "Меткий выбор",
        "description": "Правильно угадан первый город по факту.",
        "city": None,
        "period_code": None,
        "threshold": 1,
    },
    {
        "code": "fact_correct_5",
        "name": "Следопыт эпох",
        "description": "Правильно угаданы 5 городов по историческим фактам.",
        "city": None,
        "period_code": None,
        "threshold": 5,
    },
    {
        "code": "fact_correct_10",
        "name": "Мастер фактов",
        "description": "Правильно угаданы 10 городов по историческим фактам.",
        "city": None,
        "period_code": None,
        "threshold": 10,
    },
]

CITY_PERIOD_OVERRIDES = {
    ("Астана", "soviet_1925"): {
        "display_name": "Акмолинск",
    },
    ("Алматы", "soviet_1925"): {
        "display_name": "Алма-Ата",
    },
    ("Шымкент", "soviet_1925"): {
        "display_name": "Чимкент",
    },
    ("Актобе", "soviet_1925"): {
        "display_name": "Актюбинск",
    },
    ("Тараз", "soviet_1925"): {
        "display_name": "Аулие-Ата",
    },
    ("Оскемен", "soviet_1925"): {
        "display_name": "Усть-Каменогорск",
    },
    ("Семей", "soviet_1925"): {
        "display_name": "Семипалатинск",
    },
    ("Атырау", "soviet_1925"): {
        "display_name": "Гурьев",
    },
    ("Костанай", "soviet_1925"): {
        "display_name": "Кустанай",
    },
    ("Кызылорда", "soviet_1925"): {
        "display_name": "Кзыл-Орда",
        "subtitle": "Столица Казакской АССР на карте 1925 года.",
    },
    ("Орал", "soviet_1925"): {
        "display_name": "Уральск",
    },
    ("Петропавл", "soviet_1925"): {
        "display_name": "Петропавловск",
    },
    ("Караганда", "soviet_1925"): {
        "is_available": 0,
    },
    ("Актау", "soviet_1925"): {
        "is_available": 0,
    },
    ("Астана", "independence_1991"): {
        "display_name": "Целиноград",
        "subtitle": "Историческое название города на карте 1991 года.",
    },
    ("Алматы", "independence_1991"): {
        "display_name": "Алма-Ата",
    },
    ("Шымкент", "independence_1991"): {
        "display_name": "Чимкент",
    },
    ("Актобе", "independence_1991"): {
        "display_name": "Актюбинск",
    },
    ("Тараз", "independence_1991"): {
        "display_name": "Джамбул",
    },
    ("Оскемен", "independence_1991"): {
        "display_name": "Усть-Каменогорск",
    },
    ("Семей", "independence_1991"): {
        "display_name": "Семипалатинск",
    },
    ("Атырау", "independence_1991"): {
        "display_name": "Гурьев",
    },
    ("Костанай", "independence_1991"): {
        "display_name": "Кустанай",
    },
    ("Кызылорда", "independence_1991"): {
        "display_name": "Кзыл-Орда",
    },
    ("Орал", "independence_1991"): {
        "display_name": "Уральск",
    },
    ("Петропавл", "independence_1991"): {
        "display_name": "Петропавловск",
    },
    ("Актобе", "transition_1998"): {
        "display_name": "Актюбинск",
    },
    ("Караганда", "transition_1998"): {
        "display_name": "Қарағанды",
    },
    ("Оскемен", "transition_1998"): {
        "display_name": "Өскемен",
    },
    ("Семей", "transition_1998"): {
        "display_name": "Семипалатинск",
    },
    ("Костанай", "transition_1998"): {
        "display_name": "Қостанай",
    },
    ("Кызылорда", "transition_1998"): {
        "display_name": "Қызылорда",
    },
    ("Актау", "transition_1998"): {
        "display_name": "Ақтау",
    },
}


def build_timeline_period_catalog() -> list[dict[str, object]]:
    return [dict(period) for period in TIMELINE_PERIODS]


def get_period_cities(period_code: str) -> list[str]:
    return list(PERIOD_CITY_LISTS.get(period_code, APPROVED_CITIES))


def get_city_period_achievement_code(city: str, period_code: str) -> str | None:
    city_code = CITY_ACHIEVEMENT_CODES.get(city)
    if not city_code:
        return None
    return f"{city_code}_{period_code}"


def build_city_period_catalog() -> list[dict[str, object | None]]:
    catalog: list[dict[str, object | None]] = []
    for period in TIMELINE_PERIODS:
        period_code = period["code"]
        for city in get_period_cities(period_code):
            override = CITY_PERIOD_OVERRIDES.get((city, period_code), {})
            catalog.append(
                {
                    "city": city,
                    "period_code": period_code,
                    "display_name": override.get("display_name", city),
                    "subtitle": override.get("subtitle"),
                    "is_available": int(override.get("is_available", 1)),
                }
            )
    return catalog


def build_achievement_catalog() -> list[dict[str, object | None]]:
    catalog = [*GLOBAL_ACHIEVEMENTS, *TIMED_CITY_ACHIEVEMENTS, *FACT_GAME_ACHIEVEMENTS]

    for period in TIMELINE_PERIODS:
        catalog.append(
            {
                "code": PERIOD_ACHIEVEMENT_CODES[period["code"]],
                "name": f"Этап квеста завершён: {period['year_label']}",
                "description": (
                    f"Пройдены все городские тесты периода «{period['year_label']} — "
                    f"{period['title']}»."
                ),
                "city": None,
                "period_code": period["code"],
                "threshold": None,
            }
        )
        catalog.append(
            {
                "code": PERIOD_MASTER_ACHIEVEMENT_CODES[period["code"]],
                "name": f"Мастер эпохи: {period['year_label']}",
                "description": (
                    f"Во всех городах периода «{period['year_label']} — {period['title']}» "
                    "получен результат 100%."
                ),
                "city": None,
                "period_code": period["code"],
                "threshold": 100,
            }
        )

    for period in TIMELINE_PERIODS:
        period_code = period["code"]
        for city in get_period_cities(period_code):
            achievement_code = get_city_period_achievement_code(city, period_code)
            if not achievement_code:
                continue
            override = CITY_PERIOD_OVERRIDES.get((city, period_code), {})
            display_name = override.get("display_name", city)
            catalog.append(
                {
                    "code": achievement_code,
                    "name": f"Знаток города: {display_name} ({period['year_label']})",
                    "description": (
                        f"Набрано минимум 4 правильных ответа в тесте города {display_name} "
                        f"периода {period['year_label']}."
                    ),
                    "city": city,
                    "period_code": period_code,
                    "threshold": 4,
                }
            )

    return catalog
