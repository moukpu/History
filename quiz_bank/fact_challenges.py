from __future__ import annotations

from dataclasses import dataclass

from .city_content import build_city_period_content_seed
from .khanate_1465_dataset import KHANATE_1465_CITIES
from .imperial_1731_dataset import IMPERIAL_1731_CITIES
from .imperial_1868_svg_dataset import IMPERIAL_1868_CITIES
from .soviet_1925_dataset import SOVIET_1925_CITIES
from .transition_1998_dataset import TRANSITION_1998_CITIES
from .independence_1991_dataset import INDEPENDENCE_1991_CITIES


@dataclass(frozen=True)
class FactChallengeBlueprint:
    fact_text: str
    difficulty: str = "легкий"
    is_active: int = 1


FACT_CHALLENGE_BLUEPRINTS: dict[
    tuple[str, str], list[FactChallengeBlueprint]
] = {
    ("Орал", "imperial_1731"): [
        FactChallengeBlueprint(
            fact_text=(
                "В XVIII веке этот западный город на реке Урал был известен как Яицкий городок."
            ),
            difficulty="средний",
        )
    ],
    ("Атырау", "imperial_1731"): [
        FactChallengeBlueprint(
            fact_text=(
                "Будущий Гурьев развивался у нижнего течения Урала недалеко от Каспийского моря."
            ),
            difficulty="средний",
        )
    ],
    ("Алматы", "imperial_1868"): [
        FactChallengeBlueprint(
            fact_text=(
                "В позднеимперскую эпоху этот город назывался Верный и был центром Семиречья."
            ),
            difficulty="легкий",
        )
    ],
    ("Семей", "imperial_1868"): [
        FactChallengeBlueprint(
            fact_text=(
                "Этот город на Иртыше в имперский период был известен как Семипалатинск."
            ),
            difficulty="легкий",
        )
    ],
    ("Оскемен", "imperial_1868"): [
        FactChallengeBlueprint(
            fact_text=(
                "В XIX веке этот восточный город назывался Усть-Каменогорск и был связан с Рудным Алтаем."
            ),
            difficulty="средний",
        )
    ],
    ("Алматы", "soviet_1925"): [
        FactChallengeBlueprint(
            fact_text=(
                "В 1925 году этот город ещё назывался Алма-Ата и вскоре стал столицей республики."
            ),
            difficulty="легкий",
        )
    ],
    ("Кызылорда", "soviet_1925"): [
        FactChallengeBlueprint(
            fact_text=(
                "В 1925–1929 годах именно этот город был столицей Казакской АССР."
            ),
            difficulty="легкий",
        )
    ],
    ("Алматы", "independence_1991"): [
        FactChallengeBlueprint(
            fact_text=(
                "В 1991 году этот город был столицей независимого Казахстана."
            ),
            difficulty="легкий",
        )
    ],
    ("Астана", "independence_1991"): [
        FactChallengeBlueprint(
            fact_text=(
                "В 1991 году этот нынешний столичный город ещё назывался Акмола."
            ),
            difficulty="легкий",
        )
    ],
    ("Астана", "transition_1998"): [
        FactChallengeBlueprint(
            fact_text=(
                "В конце 1990-х именно этот город стал новой столицей Казахстана."
            ),
            difficulty="легкий",
        )
    ],
    ("Атырау", "transition_1998"): [
        FactChallengeBlueprint(
            fact_text=(
                "В переходный период конца 1990-х этот западный город особенно выделялся как нефтяной центр у реки Урал."
            ),
            difficulty="средний",
        )
    ],
    ("Астана", "modern_2025"): [
        FactChallengeBlueprint(
            fact_text="Это столица Казахстана на реке Ишим.",
            difficulty="легкий",
        )
    ],
    ("Алматы", "modern_2025"): [
        FactChallengeBlueprint(
            fact_text=(
                "Этот крупнейший город страны расположен у подножия Заилийского Алатау."
            ),
            difficulty="легкий",
        )
    ],
    ("Шымкент", "modern_2025"): [
        FactChallengeBlueprint(
            fact_text=(
                "Этот южный город относится к городам республиканского значения."
            ),
            difficulty="легкий",
        )
    ],
    ("Актобе", "modern_2025"): [
        FactChallengeBlueprint(
            fact_text="Этот крупный западный город стоит на реке Илек.",
            difficulty="легкий",
        )
    ],
    ("Караганда", "modern_2025"): [
        FactChallengeBlueprint(
            fact_text=(
                "Этот город Центрального Казахстана известен своим угольным бассейном."
            ),
            difficulty="легкий",
        )
    ],
    ("Тараз", "modern_2025"): [
        FactChallengeBlueprint(
            fact_text=(
                "Один из древнейших городов Казахстана расположен на реке Талас."
            ),
            difficulty="легкий",
        )
    ],
    ("Павлодар", "modern_2025"): [
        FactChallengeBlueprint(
            fact_text=(
                "Этот промышленный город северо-востока Казахстана стоит на Иртыше."
            ),
            difficulty="легкий",
        )
    ],
    ("Оскемен", "modern_2025"): [
        FactChallengeBlueprint(
            fact_text=(
                "Этот восточный город расположен у слияния рек Иртыш и Ульба."
            ),
            difficulty="легкий",
        )
    ],
    ("Семей", "modern_2025"): [
        FactChallengeBlueprint(
            fact_text=(
                "Этот исторический город на Иртыше особенно часто связывают с именем Абая."
            ),
            difficulty="легкий",
        )
    ],
    ("Атырау", "modern_2025"): [
        FactChallengeBlueprint(
            fact_text=(
                "Этот город у реки Урал недалеко от Каспийского моря важен для нефтяной отрасли."
            ),
            difficulty="легкий",
        )
    ],
    ("Костанай", "modern_2025"): [
        FactChallengeBlueprint(
            fact_text="Этот северный областной центр расположен на реке Тобол.",
            difficulty="легкий",
        )
    ],
    ("Кызылорда", "modern_2025"): [
        FactChallengeBlueprint(
            fact_text=(
                "Этот город на Сырдарье в 1920-х годах был столицей Казакской АССР."
            ),
            difficulty="легкий",
        )
    ],
    ("Орал", "modern_2025"): [
        FactChallengeBlueprint(
            fact_text=(
                "Этот западный город на реке Урал долгое время был известен как Уральск."
            ),
            difficulty="легкий",
        )
    ],
    ("Петропавл", "modern_2025"): [
        FactChallengeBlueprint(
            fact_text=(
                "Этот северный город Казахстана расположен недалеко от реки Ишим."
            ),
            difficulty="легкий",
        )
    ],
    ("Актау", "modern_2025"): [
        FactChallengeBlueprint(
            fact_text=(
                "Это портовый город Казахстана на берегу Каспийского моря."
            ),
            difficulty="легкий",
        )
    ],
}


KHANATE_1465_FACT_TEXTS = {
    item.city: item.memory_fact for item in KHANATE_1465_CITIES
}
TRANSITION_1998_FACT_TEXTS = {
    "Астана": (
        "В 1998 году именно этот город уже стал новой столицей Казахстана "
        "и главным символом переноса столичных функций."
    ),
    "Алматы": (
        "В 1998 году этот крупнейший город у подножия Заилийского Алатау уже "
        "уступил столичный статус, но оставался главным культурным и деловым "
        "центром страны."
    ),
    "Шымкент": (
        "В конце 1990-х этот крупный южный город был важным "
        "торгово-промышленным узлом Казахстана."
    ),
    "Актобе": (
        "На карте 1998 года этот западный промышленный город на реке Илек "
        "часто подписывался как Актюбинск."
    ),
    "Караганда": (
        "Этот город Центрального Казахстана в 1998 году особенно связывали "
        "с угольным бассейном и крупной промышленностью."
    ),
    "Тараз": (
        "В 1998 году этот древний южный город на реке Талас уже снова "
        "назывался Тараз, а не Джамбул."
    ),
    "Павлодар": (
        "Этот крупный промышленный город на Иртыше был важным "
        "энергетическим центром северо-востока страны."
    ),
    "Оскемен": (
        "Этот восточный промышленный город у слияния Иртыша и Ульбы в "
        "русскоязычной форме был известен как Усть-Каменогорск."
    ),
    "Семей": (
        "На карте 1998 года этот исторический город на Иртыше ещё часто "
        "обозначали как Семипалатинск."
    ),
    "Атырау": (
        "В конце 1990-х этот западный город у реки Урал особенно выделялся "
        "как нефтяной центр Прикаспия."
    ),
    "Костанай": (
        "Этот северный областной центр на Тоболе был важным городом "
        "зернового региона и транспортных связей."
    ),
    "Кызылорда": (
        "Этот город на Сырдарье напоминал о том, что в 1920-х годах именно "
        "здесь находилась столица Казакской АССР."
    ),
    "Орал": (
        "В 1998 году этот западный город на реке Урал оставался важным "
        "пограничным и торговым центром страны."
    ),
    "Петропавл": (
        "Этот северный город на Ишиме был известен как важный "
        "железнодорожный узел и центр зернового края."
    ),
    "Актау": (
        "Этот город на берегу Каспийского моря был главным морским портом "
        "Казахстана в конце 1990-х."
    ),
}

IMPERIAL_1731_FACT_TEXTS = {
    item.city: item.memory_fact for item in IMPERIAL_1731_CITIES
}
IMPERIAL_1868_FACT_TEXTS = {
    item.city: item.memory_fact for item in IMPERIAL_1868_CITIES
}
INDEPENDENCE_1991_FACT_TEXTS = {
    item.city: item.memory_fact for item in INDEPENDENCE_1991_CITIES
}
SOVIET_1925_FACT_TEXTS = {
    item.city: item.memory_fact for item in SOVIET_1925_CITIES
}

FACT_CHALLENGE_BLUEPRINTS.pop(("Тараз", "khanate_1465"), None)
FACT_CHALLENGE_BLUEPRINTS.pop(("Шымкент", "khanate_1465"), None)
FACT_CHALLENGE_BLUEPRINTS.update(
    {
        (item.city, "khanate_1465"): [
            FactChallengeBlueprint(
                fact_text=KHANATE_1465_FACT_TEXTS[item.city],
                difficulty="средний",
            )
        ]
        for item in KHANATE_1465_CITIES
    }
)

FACT_CHALLENGE_BLUEPRINTS.pop(("Орал", "imperial_1731"), None)
FACT_CHALLENGE_BLUEPRINTS.pop(("Атырау", "imperial_1731"), None)
FACT_CHALLENGE_BLUEPRINTS.update(
    {
        (item.city, "imperial_1731"): [
            FactChallengeBlueprint(
                fact_text=IMPERIAL_1731_FACT_TEXTS[item.city],
                difficulty="средний",
            )
        ]
        for item in IMPERIAL_1731_CITIES
    }
)

FACT_CHALLENGE_BLUEPRINTS.pop(("Алматы", "imperial_1868"), None)
FACT_CHALLENGE_BLUEPRINTS.pop(("Семей", "imperial_1868"), None)
FACT_CHALLENGE_BLUEPRINTS.pop(("Оскемен", "imperial_1868"), None)
FACT_CHALLENGE_BLUEPRINTS.update(
    {
        (item.city, "imperial_1868"): [
            FactChallengeBlueprint(
                fact_text=IMPERIAL_1868_FACT_TEXTS[item.city],
                difficulty="средний",
            )
        ]
        for item in IMPERIAL_1868_CITIES
    }
)

FACT_CHALLENGE_BLUEPRINTS.update(
    {
        (item.city, "soviet_1925"): [
            FactChallengeBlueprint(
                fact_text=SOVIET_1925_FACT_TEXTS[item.city],
                difficulty="Р»РµРіРєРёР№",
            )
        ]
        for item in SOVIET_1925_CITIES
    }
)

FACT_CHALLENGE_BLUEPRINTS.update(
    {
        (item.city, "independence_1991"): [
            FactChallengeBlueprint(
                fact_text=INDEPENDENCE_1991_FACT_TEXTS[item.city],
                difficulty="легкий",
            )
        ]
        for item in INDEPENDENCE_1991_CITIES
    }
)

FACT_CHALLENGE_BLUEPRINTS.update(
    {
        (item.city, "transition_1998"): [
            FactChallengeBlueprint(
                fact_text=TRANSITION_1998_FACT_TEXTS[item.city],
                difficulty="легкий",
            )
        ]
        for item in TRANSITION_1998_CITIES
    }
)


def build_supported_fact_challenge_pairs() -> list[tuple[str, str]]:
    pairs: list[tuple[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for item in build_city_period_content_seed():
        if int(item["fact_challenge_available"]) != 1:
            continue
        pair = (str(item["city"]), str(item["period_code"]))
        if pair in seen:
            continue
        seen.add(pair)
        pairs.append(pair)
    return pairs


def build_fact_challenge_seed() -> list[dict[str, object]]:
    supported_pairs = build_supported_fact_challenge_pairs()
    missing_pairs = [
        pair for pair in supported_pairs if pair not in FACT_CHALLENGE_BLUEPRINTS
    ]
    if missing_pairs:
        formatted = ", ".join(f"{city}/{period}" for city, period in missing_pairs)
        raise ValueError(
            "Для части поддерживаемых пар нет fact challenge блюпринтов: "
            + formatted
        )

    records: list[dict[str, object]] = []
    for city, period_code in supported_pairs:
        for blueprint in FACT_CHALLENGE_BLUEPRINTS[(city, period_code)]:
            records.append(
                {
                    "city": city,
                    "period_code": period_code,
                    "fact_text": blueprint.fact_text,
                    "difficulty": blueprint.difficulty,
                    "is_active": int(blueprint.is_active),
                }
            )
    return records
