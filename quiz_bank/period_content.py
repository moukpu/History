from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
import random
from pathlib import Path

from .constants import (
    APPROVED_CITIES,
    DEFAULT_DATA_PATH,
    DEFAULT_PERIOD_CODE,
    PERIOD_EASY_QUESTION_TARGET,
    PERIOD_HARD_QUESTION_TARGET,
    PERIOD_TOTAL_QUESTION_TARGET,
    build_city_period_catalog,
)
from .hard_quiz_generation import build_hard_quiz_records
from .transition_1998_dataset import (
    TRANSITION_1998_CITIES,
    build_transition_1998_quiz_blueprints,
)
from .independence_1991_dataset import (
    INDEPENDENCE_1991_CITIES,
    build_independence_1991_quiz_blueprints,
)
from .khanate_1465_dataset import (
    KHANATE_1465_CITIES,
    build_khanate_1465_quiz_blueprints,
)
from .imperial_1731_dataset import (
    IMPERIAL_1731_CITIES,
    build_imperial_1731_quiz_blueprints,
)
from .imperial_1868_svg_dataset import (
    IMPERIAL_1868_CITIES,
    build_imperial_1868_quiz_blueprints,
)
from .soviet_1925_dataset import (
    SOVIET_1925_CITIES,
    build_soviet_1925_quiz_blueprints,
)
from .modern_2025_dataset import (
    MODERN_2025_CITIES,
    MODERN_2025_PROFILES,
    build_modern_2025_quiz_blueprints,
)
from .types import QuizDraft
from .validation import load_quiz_bank_json, normalize_text


@dataclass(frozen=True)
class CoverageEntry:
    city: str
    period_code: str
    question_count: int
    source: str
    note: str = ""
    easy_question_count: int = PERIOD_EASY_QUESTION_TARGET
    hard_question_count: int = PERIOD_HARD_QUESTION_TARGET


PERIOD_QUIZ_COVERAGE_PLAN = [
    CoverageEntry(
        city="Орал",
        period_code="imperial_1731",
        question_count=5,
        source="curated",
        note="Ранняя имперская пограничная линия на реке Урал.",
    ),
    CoverageEntry(
        city="Атырау",
        period_code="imperial_1731",
        question_count=5,
        source="curated",
        note="Гурьев и нижнее течение Урала в раннеимперскую эпоху.",
    ),
    CoverageEntry(
        city="Алматы",
        period_code="imperial_1868",
        question_count=PERIOD_TOTAL_QUESTION_TARGET,
        source="curated",
        note="Верный как административный центр Семиречья.",
    ),
    CoverageEntry(
        city="Семей",
        period_code="imperial_1868",
        question_count=PERIOD_TOTAL_QUESTION_TARGET,
        source="curated",
        note="Семипалатинск как торговый и культурный центр на Иртыше.",
    ),
    CoverageEntry(
        city="Оскемен",
        period_code="imperial_1868",
        question_count=PERIOD_TOTAL_QUESTION_TARGET,
        source="curated",
        note="Усть-Каменогорск и Рудный Алтай в позднеимперскую эпоху.",
    ),
    CoverageEntry(
        city="Алматы",
        period_code="soviet_1925",
        question_count=6,
        source="curated",
        note="Алма-Ата в ранний советский период.",
    ),
    CoverageEntry(
        city="Кызылорда",
        period_code="soviet_1925",
        question_count=6,
        source="curated",
        note="Кызылорда как первая столица Казакской АССР.",
    ),
    CoverageEntry(
        city="Алматы",
        period_code="independence_1991",
        question_count=5,
        source="curated",
        note="Алматы как столица первых лет независимости.",
    ),
    CoverageEntry(
        city="Астана",
        period_code="independence_1991",
        question_count=5,
        source="curated",
        note="Будущая столица в начале независимости.",
    ),
    CoverageEntry(
        city="Астана",
        period_code="transition_1998",
        question_count=6,
        source="curated",
        note="Переход от Акмолы к новой столице Астане.",
    ),
    CoverageEntry(
        city="Атырау",
        period_code="transition_1998",
        question_count=5,
        source="curated",
        note="Западный нефтяной центр конца 1990-х.",
    ),
    *[
        CoverageEntry(
            city=item["city"],
            period_code=DEFAULT_PERIOD_CODE,
            question_count=PERIOD_TOTAL_QUESTION_TARGET,
            source="curated",
            note=item["coverage_note"],
        )
        for item in MODERN_2025_PROFILES
    ],
]

PERIOD_QUIZ_COVERAGE_PLAN = [
    *[
        entry
        for entry in PERIOD_QUIZ_COVERAGE_PLAN
        if entry.period_code
        not in {
            "khanate_1465",
            "imperial_1731",
            "imperial_1868",
            "soviet_1925",
            "transition_1998",
            "independence_1991",
        }
    ],
    *[
        CoverageEntry(
            city=item.city,
            period_code="khanate_1465",
            question_count=PERIOD_TOTAL_QUESTION_TARGET,
            source="curated",
            note=item.coverage_note,
        )
        for item in KHANATE_1465_CITIES
    ],
    *[
        CoverageEntry(
            city=item.city,
            period_code="imperial_1731",
            question_count=PERIOD_TOTAL_QUESTION_TARGET,
            source="curated",
            note=item.coverage_note,
        )
        for item in IMPERIAL_1731_CITIES
    ],
    *[
        CoverageEntry(
            city=item.city,
            period_code="imperial_1868",
            question_count=PERIOD_TOTAL_QUESTION_TARGET,
            source="curated",
            note=item.coverage_note,
            easy_question_count=PERIOD_EASY_QUESTION_TARGET,
            hard_question_count=PERIOD_HARD_QUESTION_TARGET,
        )
        for item in IMPERIAL_1868_CITIES
    ],
    *[
        CoverageEntry(
            city=item.city,
            period_code="soviet_1925",
            question_count=PERIOD_TOTAL_QUESTION_TARGET,
            source="curated",
            note=item.coverage_note,
        )
        for item in SOVIET_1925_CITIES
    ],
    *[
        CoverageEntry(
            city=item.city,
            period_code="independence_1991",
            question_count=PERIOD_TOTAL_QUESTION_TARGET,
            source="curated",
            note=item.coverage_note,
        )
        for item in INDEPENDENCE_1991_CITIES
    ],
    *[
        CoverageEntry(
            city=item.city,
            period_code="transition_1998",
            question_count=PERIOD_TOTAL_QUESTION_TARGET,
            source="curated",
            note=item.coverage_note,
        )
        for item in TRANSITION_1998_CITIES
    ],
]


CURATED_PERIOD_BLUEPRINTS: dict[tuple[str, str], list[dict[str, object]]] = {
    ("Орал", "imperial_1731"): [
        {
            "question": "Под каким названием современный Орал был известен в XVIII веке?",
            "correct": "Яицкий городок",
            "distractors": [
                "Верный",
                "Семипалатинск",
                "Ак-Мечеть",
            ],
            "fact": "До конца XVIII века город был известен как Яицкий городок.",
        },
        {
            "question": "На какой реке стоял Яицкий городок, будущий Орал?",
            "correct": "на реке Урал (Жайық)",
            "distractors": [
                "на реке Иртыш",
                "на реке Сырдарья",
                "на реке Талас",
            ],
            "fact": "Орал расположен на реке Урал, которую по-казахски называют Жайық.",
        },
        {
            "question": "Какую роль чаще всего играл Орал в раннеимперскую эпоху?",
            "correct": "пограничной крепости и торгового пункта",
            "distractors": [
                "морской столицы страны",
                "центра угольной промышленности",
                "высокогорного курорта",
            ],
            "fact": "Город был важен как крепость и торговый пункт на западной границе степи.",
        },
        {
            "question": "Какой крупный политический процесс отражает период 1731 года для западного Казахстана?",
            "correct": "усиление влияния Российской империи",
            "distractors": [
                "открытие космодрома Байконур",
                "перенос столицы в Астану",
                "появление нефтяных морских платформ",
            ],
            "fact": "1731 год связывают с началом усиления российского влияния в степи.",
        },
        {
            "question": "Что особенно делало расположение Орала важным в XVIII веке?",
            "correct": "переправа и торговля на реке Урал",
            "distractors": [
                "выход к Каспийскому морю",
                "высокогорные перевалы",
                "крупные угольные шахты",
            ],
            "fact": "Река Урал делала город удобным для торговли и контроля переправ.",
        },
    ],
    ("Атырау", "imperial_1731"): [
        {
            "question": "Как назывался современный Атырау в XVIII веке?",
            "correct": "Гурьев",
            "distractors": [
                "Шевченко",
                "Целиноград",
                "Верный",
            ],
            "fact": "До 1991 года город долгое время был известен под названием Гурьев.",
        },
        {
            "question": "С каким морем был связан Гурьев в раннеимперскую эпоху?",
            "correct": "с Каспийским морем",
            "distractors": [
                "с Аральским морем",
                "с Чёрным морем",
                "с Балтийским морем",
            ],
            "fact": "Атырау расположен недалеко от Каспия и исторически связан с его побережьем.",
        },
        {
            "question": "На какой реке расположен современный Атырау?",
            "correct": "на реке Урал (Жайық)",
            "distractors": [
                "на реке Ишим",
                "на реке Тобол",
                "на реке Иртыш",
            ],
            "fact": "Атырау стоит на реке Урал близ её впадения в Каспийское море.",
        },
        {
            "question": "Какие занятия особенно поддерживали значение Гурьева в XVIII веке?",
            "correct": "рыболовство и торговля",
            "distractors": [
                "угледобыча и металлургия",
                "горнолыжный туризм",
                "космические исследования",
            ],
            "fact": "Нижнее течение Урала и Каспий делали город важным для рыболовства и торговли.",
        },
        {
            "question": "Что особенно определяло значение Гурьева в раннеимперскую эпоху?",
            "correct": "расположение у устья реки Урал",
            "distractors": [
                "соседство с угольным бассейном",
                "положение у подножия Алтая",
                "нахождение в центре северной лесостепи",
            ],
            "fact": "Город вырос в стратегически удобном месте у устья Урала.",
        },
    ],
    ("Алматы", "imperial_1868"): [
        {
            "question": "Как назывался современный Алматы во второй половине XIX века?",
            "correct": "Верный",
            "distractors": [
                "Гурьев",
                "Яицкий городок",
                "Кызылорда",
            ],
            "fact": "Во второй половине XIX века город носил название Верный.",
        },
        {
            "question": "У подножия какого хребта был расположен Верный?",
            "correct": "Заилийского Алатау",
            "distractors": [
                "Рудного Алтая",
                "Мугоджар",
                "Улытау",
            ],
            "fact": "Верный располагался у подножия Заилийского Алатау.",
        },
        {
            "question": "Центром какой области был Верный после реформ второй половины XIX века?",
            "correct": "Семиреченской области",
            "distractors": [
                "Тургайской области",
                "Уральской области",
                "Мангышлакской области",
            ],
            "fact": "Верный был административным центром Семиреченской области.",
        },
        {
            "question": "Как возник Верный в XIX веке?",
            "correct": "как крепость",
            "distractors": [
                "как морской порт",
                "как шахтёрский посёлок",
                "как космический центр",
            ],
            "fact": "История Верного в XIX веке началась с укрепления и крепости.",
        },
        {
            "question": "Что особенно помогало развитию Верного в позднеимперскую эпоху?",
            "correct": "садоводство и торговля в предгорьях",
            "distractors": [
                "нефтяные платформы на шельфе",
                "добыча угля в степи",
                "морские перевозки по Каспию",
            ],
            "fact": "Предгорное положение делало район удобным для садоводства и торговли.",
        },
    ],
    ("Семей", "imperial_1868"): [
        {
            "question": "Как назывался современный Семей в позднеимперскую эпоху?",
            "correct": "Семипалатинск",
            "distractors": [
                "Усть-Каменогорск",
                "Верный",
                "Кзыл-Орда",
            ],
            "fact": "До переименования город долго был известен как Семипалатинск.",
        },
        {
            "question": "На какой реке расположен Семей?",
            "correct": "на реке Иртыш",
            "distractors": [
                "на реке Урал",
                "на реке Ишим",
                "на реке Талас",
            ],
            "fact": "Семей расположен на Иртыше, одном из крупнейших рек Казахстана.",
        },
        {
            "question": "Какую роль играл Семипалатинск во второй половине XIX века?",
            "correct": "торгового и административного центра",
            "distractors": [
                "морского порта",
                "столицы государства",
                "горнолыжного курорта",
            ],
            "fact": "Город был важным центром торговли и управления восточных районов степи.",
        },
        {
            "question": "С каким известным писателем связан Семипалатинск XIX века?",
            "correct": "с Фёдором Достоевским",
            "distractors": [
                "с Александром Пушкиным",
                "с Львом Толстым",
                "с Антоном Чеховым",
            ],
            "fact": "Фёдор Достоевский жил в Семипалатинске в период своей ссылки и службы.",
        },
        {
            "question": "Что особенно помогало росту Семипалатинска в позднеимперскую эпоху?",
            "correct": "положение на речных и сухопутных торговых путях",
            "distractors": [
                "морской флот",
                "нефтяные месторождения Каспия",
                "угольные шахты Караганды",
            ],
            "fact": "Река Иртыш и торговые пути делали город важным узлом Восточного Казахстана.",
        },
    ],
    ("Оскемен", "imperial_1868"): [
        {
            "question": "Как назывался современный Оскемен в XIX веке?",
            "correct": "Усть-Каменогорск",
            "distractors": [
                "Перовск",
                "Верный",
                "Гурьев",
            ],
            "fact": "Русское историческое название современного Оскемена — Усть-Каменогорск.",
        },
        {
            "question": "На слиянии каких рек расположен Оскемен?",
            "correct": "Иртыша и Ульбы",
            "distractors": [
                "Ишима и Нуры",
                "Урала и Эмбы",
                "Таласа и Арыси",
            ],
            "fact": "Город расположен у слияния Иртыша и Ульбы.",
        },
        {
            "question": "Как возник Усть-Каменогорск в XVIII веке?",
            "correct": "как крепость",
            "distractors": [
                "как морской порт",
                "как столичный город",
                "как железнодорожная станция",
            ],
            "fact": "Город вырос из крепости на восточных рубежах империи.",
        },
        {
            "question": "С каким природным районом особенно связан Оскемен?",
            "correct": "с Рудным Алтаем",
            "distractors": [
                "с Мангистауским плато",
                "с Приаральем",
                "с Северо-Казахстанской лесостепью",
            ],
            "fact": "Оскемен тесно связан с Рудным Алтаем и горнорудным районом Восточного Казахстана.",
        },
        {
            "question": "Что особенно определяло значение Усть-Каменогорска в позднеимперскую эпоху?",
            "correct": "торговля и связь с горнорудным районом",
            "distractors": [
                "морские перевозки",
                "рисоводство в дельте Сырдарьи",
                "роль столичного центра",
            ],
            "fact": "Город был важен как узел торговли и связи с рудными районами Алтая.",
        },
    ],
    ("Алматы", "soviet_1925"): [
        {
            "question": "Как назывался современный Алматы в 1925 году?",
            "correct": "Алма-Ата",
            "distractors": [
                "Верный",
                "Акмола",
                "Кызылорда",
            ],
            "fact": "После установления советской власти город получил название Алма-Ата.",
        },
        {
            "question": "Что особенно характеризовало Алма-Ату в ранний советский период?",
            "correct": "рост административных и культурных функций",
            "distractors": [
                "роль морского порта",
                "добыча нефти на шельфе",
                "работа угольных шахт",
            ],
            "fact": "В раннесоветские годы Алма-Ата укреплялась как административный и культурный центр.",
        },
        {
            "question": "У подножия какого хребта находилась Алма-Ата?",
            "correct": "Заилийского Алатау",
            "distractors": [
                "Мугоджар",
                "Улытау",
                "Кокшетау",
            ],
            "fact": "Город, как и раньше, находился у подножия Заилийского Алатау.",
        },
        {
            "question": "Какое развитие было особенно заметно в Алма-Ате в 1920-е годы?",
            "correct": "появление новых школ и государственных учреждений",
            "distractors": [
                "строительство морского флота",
                "открытие космодрома",
                "массовая добыча угля в шахтах города",
            ],
            "fact": "Ранний советский период сопровождался ростом учреждений образования и управления.",
        },
        {
            "question": "Какое важное изменение произошло с Алма-Атой в конце 1920-х годов?",
            "correct": "город стал столицей Казакской АССР",
            "distractors": [
                "город стал главным морским портом",
                "город перенёс столицу в Кызылорду",
                "город утратил административное значение",
            ],
            "fact": "В 1929 году столица Казакской АССР была перенесена в Алма-Ату.",
        },
        {
            "question": "Какое название носил город до того, как стал Алма-Атой?",
            "correct": "Верный",
            "distractors": [
                "Гурьев",
                "Яицкий городок",
                "Шевченко",
            ],
            "fact": "До советского переименования город был известен как Верный.",
        },
    ],
    ("Кызылорда", "soviet_1925"): [
        {
            "question": "Как назывался город Кызылорда незадолго до переименования 1925 года?",
            "correct": "Ак-Мечеть",
            "distractors": [
                "Верный",
                "Гурьев",
                "Уральск",
            ],
            "fact": "В 1922 году городу вернули название Ак-Мечеть, а в 1925 году он стал Кызылордой.",
        },
        {
            "question": "Какое особое значение получила Кызылорда в 1925 году?",
            "correct": "стала столицей Казакской АССР",
            "distractors": [
                "стала главным морским портом страны",
                "стала центром угольного бассейна",
                "стала горнолыжным курортом",
            ],
            "fact": "В 1925 году Кызылорда стала столицей Казакской АССР.",
        },
        {
            "question": "На какой реке расположена Кызылорда?",
            "correct": "на реке Сырдарья",
            "distractors": [
                "на реке Иртыш",
                "на реке Урал",
                "на реке Ишим",
            ],
            "fact": "Кызылорда расположена на Сырдарье.",
        },
        {
            "question": "Что означает название «Кызылорда» в школьном объяснении?",
            "correct": "красная столица",
            "distractors": [
                "каменная крепость",
                "северный город",
                "золотой берег",
            ],
            "fact": "Название «Кызылорда» обычно объясняют как «красная столица».",
        },
        {
            "question": "Почему Кызылорда была особенно важна для Казахстана в середине 1920-х годов?",
            "correct": "здесь находились органы управления молодой республики",
            "distractors": [
                "здесь располагался морской флот",
                "здесь находился главный угольный район",
                "здесь уже работал космодром",
            ],
            "fact": "Столичный статус сделал город важным административным центром республики.",
        },
        {
            "question": "Какое изменение произошло со столичным статусом Кызылорды в 1929 году?",
            "correct": "столица была перенесена в Алма-Ату",
            "distractors": [
                "столица была перенесена в Актобе",
                "город стал морским портом",
                "город получил название Астана",
            ],
            "fact": "В 1929 году столица республики была перенесена из Кызылорды в Алма-Ату.",
        },
    ],
    ("Алматы", "independence_1991"): [
        {
            "question": "Какой город был столицей Казахстана в 1991 году?",
            "correct": "Алматы",
            "distractors": [
                "Астана",
                "Шымкент",
                "Караганда",
            ],
            "fact": "В год независимости столицей Казахстана был Алматы.",
        },
        {
            "question": "Какое название было широко известно у города до перехода к форме «Алматы»?",
            "correct": "Алма-Ата",
            "distractors": [
                "Верный",
                "Целиноград",
                "Гурьев",
            ],
            "fact": "Форма «Алма-Ата» долго использовалась в советское время и в первые годы независимости.",
        },
        {
            "question": "У подножия какого хребта расположен Алматы?",
            "correct": "Заилийского Алатау",
            "distractors": [
                "Рудного Алтая",
                "Каратау",
                "Мугоджар",
            ],
            "fact": "Алматы находится у подножия Заилийского Алатау.",
        },
        {
            "question": "Какую роль Алматы сохранял в первые годы независимости, кроме столичного статуса?",
            "correct": "крупнейшего культурного и финансового центра",
            "distractors": [
                "главного морского порта",
                "угольной столицы",
                "центра нефтяных платформ",
            ],
            "fact": "Алматы оставался главным культурным и финансовым центром страны.",
        },
        {
            "question": "С каким известным символом города часто связывают Алматы?",
            "correct": "с яблоком апорт",
            "distractors": [
                "с космодромом",
                "с маяком на море",
                "с угольными шахтами",
            ],
            "fact": "Алматы часто связывают с яблоком апорт и садовой культурой региона.",
        },
    ],
    ("Астана", "independence_1991"): [
        {
            "question": "Какое название обычно используют для будущей Астаны в начале периода независимости?",
            "correct": "Акмола",
            "distractors": [
                "Алма-Ата",
                "Гурьев",
                "Шевченко",
            ],
            "fact": "В первые годы независимости будущая столица была связана с названием Акмола.",
        },
        {
            "question": "Какое советское название город носил незадолго до независимости?",
            "correct": "Целиноград",
            "distractors": [
                "Семипалатинск",
                "Верный",
                "Перовск",
            ],
            "fact": "В советский период город был известен как Целиноград.",
        },
        {
            "question": "На какой реке расположен будущий город Астана?",
            "correct": "на реке Ишим (Есиль)",
            "distractors": [
                "на реке Урал",
                "на реке Талас",
                "на реке Иртыш",
            ],
            "fact": "Город расположен на реке Ишим, которую по-казахски называют Есиль.",
        },
        {
            "question": "В какой части Казахстана расположен этот город?",
            "correct": "в северо-центральной части страны",
            "distractors": [
                "на крайнем западе страны",
                "в горах востока страны",
                "на южной границе с Тянь-Шанем",
            ],
            "fact": "Будущая столица находится в северо-центральной части Казахстана.",
        },
        {
            "question": "Какое важное изменение ожидало этот город в последующие годы независимости?",
            "correct": "он стал столицей Казахстана",
            "distractors": [
                "он стал главным морским портом",
                "он стал центром угольных шахт",
                "он был переименован в Кызылорду",
            ],
            "fact": "Через несколько лет город получил столичный статус и стал новым политическим центром страны.",
        },
    ],
    ("Астана", "transition_1998"): [
        {
            "question": "Какое название получил будущий главный город страны в 1998 году?",
            "correct": "Астана",
            "distractors": [
                "Акмола",
                "Алма-Ата",
                "Целиноград",
            ],
            "fact": "В 1998 году город получил название Астана.",
        },
        {
            "question": "Из какого города была перенесена столица Казахстана в новую столицу?",
            "correct": "из Алматы",
            "distractors": [
                "из Шымкента",
                "из Караганды",
                "из Актобе",
            ],
            "fact": "До переноса столицы главным городом страны был Алматы.",
        },
        {
            "question": "Какое название город носил непосредственно перед именем «Астана»?",
            "correct": "Акмола",
            "distractors": [
                "Шевченко",
                "Гурьев",
                "Перовск",
            ],
            "fact": "Перед названием Астана город носил имя Акмола.",
        },
        {
            "question": "На какой реке расположена новая столица конца 1990-х годов?",
            "correct": "на реке Ишим (Есиль)",
            "distractors": [
                "на реке Сырдарья",
                "на реке Иртыш",
                "на реке Тобол",
            ],
            "fact": "Город расположен на Ишиме (Есиле).",
        },
        {
            "question": "Что лучше всего характеризует Астану переходного периода 1998 года?",
            "correct": "быстро растущая новая столица",
            "distractors": [
                "древний караванный порт",
                "угольный центр Сарыарки",
                "морская столица Каспия",
            ],
            "fact": "Конец 1990-х годов связан с быстрым ростом новой столицы.",
        },
        {
            "question": "Почему период 1998 года особенно важен для истории Астаны?",
            "correct": "началось масштабное развитие столичной инфраструктуры",
            "distractors": [
                "город стал главным местом рисоводства",
                "город впервые получил выход к морю",
                "город превратился в шахтёрский посёлок",
            ],
            "fact": "После переноса столицы город начал быстро развивать государственные здания и инфраструктуру.",
        },
    ],
    ("Атырау", "transition_1998"): [
        {
            "question": "На какой реке расположен Атырау?",
            "correct": "на реке Урал (Жайық)",
            "distractors": [
                "на реке Ишим",
                "на реке Талас",
                "на реке Нура",
            ],
            "fact": "Атырау расположен на реке Урал.",
        },
        {
            "question": "С каким морем связан Атырау?",
            "correct": "с Каспийским морем",
            "distractors": [
                "с Аральским морем",
                "с Балтийским морем",
                "с Чёрным морем",
            ],
            "fact": "Атырау находится в Прикаспийском регионе и связан с Каспийским морем.",
        },
        {
            "question": "Какое название город носил до переименования 1991 года?",
            "correct": "Гурьев",
            "distractors": [
                "Верный",
                "Шевченко",
                "Целиноград",
            ],
            "fact": "До 1991 года Атырау был известен как Гурьев.",
        },
        {
            "question": "Какая отрасль особенно усиливала значение Атырау в конце 1990-х годов?",
            "correct": "нефтегазовая отрасль",
            "distractors": [
                "горнолыжный туризм",
                "угольная добыча",
                "лесозаготовка",
            ],
            "fact": "Конец 1990-х сделал запад Казахстана особенно важным для нефтегазового сектора.",
        },
        {
            "question": "Почему Атырау был особенно важен для страны в переходный период конца 1990-х?",
            "correct": "как западный центр нефтяного экспорта и логистики",
            "distractors": [
                "как главный центр космических запусков",
                "как столица государства",
                "как центр угольного бассейна",
            ],
            "fact": "Атырау стал ключевым западным узлом нефтяной экономики и логистики.",
        },
    ],
}

CURATED_PERIOD_BLUEPRINTS.pop(("Тараз", "khanate_1465"), None)
CURATED_PERIOD_BLUEPRINTS.pop(("Шымкент", "khanate_1465"), None)
CURATED_PERIOD_BLUEPRINTS.update(build_khanate_1465_quiz_blueprints())
CURATED_PERIOD_BLUEPRINTS.pop(("Орал", "imperial_1731"), None)
CURATED_PERIOD_BLUEPRINTS.pop(("Атырау", "imperial_1731"), None)
CURATED_PERIOD_BLUEPRINTS.update(build_imperial_1731_quiz_blueprints())
CURATED_PERIOD_BLUEPRINTS.pop(("Алматы", "imperial_1868"), None)
CURATED_PERIOD_BLUEPRINTS.pop(("Семей", "imperial_1868"), None)
CURATED_PERIOD_BLUEPRINTS.pop(("Оскемен", "imperial_1868"), None)
CURATED_PERIOD_BLUEPRINTS.update(build_imperial_1868_quiz_blueprints())
CURATED_PERIOD_BLUEPRINTS.update(build_transition_1998_quiz_blueprints())
CURATED_PERIOD_BLUEPRINTS.update(build_independence_1991_quiz_blueprints())
CURATED_PERIOD_BLUEPRINTS.update(build_soviet_1925_quiz_blueprints())
CURATED_PERIOD_BLUEPRINTS.update(build_modern_2025_quiz_blueprints())


def _deterministic_options(question: str, correct: str, candidates: list[str]) -> list[str]:
    normalized_correct = normalize_text(correct)
    unique_candidates: list[str] = []
    seen = set()
    for candidate in candidates:
        normalized_candidate = normalize_text(candidate)
        if normalized_candidate == normalized_correct or normalized_candidate in seen:
            continue
        seen.add(normalized_candidate)
        unique_candidates.append(candidate)

    if len(unique_candidates) < 3:
        raise ValueError(f"Недостаточно уникальных вариантов для вопроса: {question}")

    randomizer = random.Random(f"{question}|{correct}")
    distractors = randomizer.sample(unique_candidates, 3)
    options = [correct, *distractors]
    randomizer.shuffle(options)
    return options


def _build_draft(
    city: str,
    period_code: str,
    question: str,
    correct: str,
    distractors: list[str],
    fact: str,
) -> QuizDraft:
    return QuizDraft(
        city=city,
        period_code=period_code,
        question=question,
        correct_answer=correct,
        options=_deterministic_options(question, correct, distractors),
        fact=fact,
    )


def build_period_quiz_coverage_matrix() -> list[CoverageEntry]:
    """Возвращает управляемую матрицу покрытия для period-aware викторины.

    Матрица опирается на city_periods-константы: если пара город-период
    отсутствует или помечена как недоступная, покрытие считается некорректным.
    Расширение делается в двух местах:
    1. добавить/изменить CoverageEntry
    2. добавить curated-вопросы или сменить источник на legacy subset
    """

    return [
        CoverageEntry(
            city=str(item["city"]),
            period_code=str(item["period_code"]),
            question_count=PERIOD_TOTAL_QUESTION_TARGET,
            source="external_json",
            note="SaparQuest external multilingual quiz bank.",
            easy_question_count=PERIOD_EASY_QUESTION_TARGET,
            hard_question_count=PERIOD_HARD_QUESTION_TARGET,
        )
        for item in build_city_period_catalog()
        if int(item.get("is_available", 1)) == 1
    ]


def _load_legacy_modern_records(
    legacy_json_path: str | Path = DEFAULT_DATA_PATH,
) -> dict[str, list[dict[str, object]]]:
    records = load_quiz_bank_json(legacy_json_path)
    grouped: dict[str, list[dict[str, object]]] = defaultdict(list)
    for record in records:
        grouped[str(record["city"])].append(record)
    return grouped


def _normalize_legacy_period_record(
    city: str,
    item: dict[str, object],
) -> dict[str, object]:
    record = {
        "city": city,
        "period_code": DEFAULT_PERIOD_CODE,
        "difficulty": "easy",
        "question": item["question"],
        "options": list(item["options"]),
        "correct_index": item["correct_index"],
        "fact": item["fact"],
    }

    if city == "Тараз" and record["question"] == "Какой возраст лучше всего подходит древнему Таразу?":
        record["options"] = [
            {
                "около 2000 лет": "более 2000 лет",
                "около 1000 лет": "менее 1000 лет",
                "около 800 лет": "менее 800 лет",
                "около 500 лет": "менее 500 лет",
                "около 300 лет": "менее 300 лет",
            }.get(option, option)
            for option in record["options"]
        ]
        record["correct_index"] = record["options"].index("более 2000 лет")
        record["fact"] = (
            "Тараз считается одним из древнейших городов Казахстана, "
            "его история насчитывает более двух тысяч лет."
        )

    return record


def generate_period_quiz_bank(
    legacy_json_path: str | Path = DEFAULT_DATA_PATH,
) -> list[dict[str, object]]:
    coverage = build_period_quiz_coverage_matrix()
    legacy_modern = _load_legacy_modern_records(legacy_json_path)
    all_records: list[dict[str, object]] = []
    easy_records_by_pair: dict[tuple[str, str], list[dict[str, object]]] = {}
    hard_source_records_by_pair: dict[tuple[str, str], list[dict[str, object]]] = {}
    period_cities: dict[str, list[str]] = defaultdict(list)

    for entry in coverage:
        if entry.city not in period_cities[entry.period_code]:
            period_cities[entry.period_code].append(entry.city)

    for entry in coverage:
        pair_records: list[dict[str, object]] = []
        if entry.source == "legacy_modern_subset":
            modern_records = legacy_modern.get(entry.city, [])
            if len(modern_records) < entry.easy_question_count:
                raise ValueError(
                    f"Недостаточно legacy-вопросов для {entry.city}: "
                    f"нужно {entry.easy_question_count}, найдено {len(modern_records)}."
                )
            selected = modern_records[: entry.easy_question_count]
            for item in selected:
                pair_records.append(_normalize_legacy_period_record(entry.city, item))
            easy_records_by_pair[(entry.city, entry.period_code)] = pair_records
            hard_source_records_by_pair[(entry.city, entry.period_code)] = modern_records[:20]
            all_records.extend(pair_records)
            continue

        blueprints = CURATED_PERIOD_BLUEPRINTS.get((entry.city, entry.period_code), [])
        if len(blueprints) < max(entry.easy_question_count, 20):
            raise ValueError(
                f"Пара {entry.city}/{entry.period_code} ожидает минимум "
                f"{max(entry.easy_question_count, 20)} blueprint-вопросов, но задано только {len(blueprints)}."
            )

        hard_source_records: list[dict[str, object]] = []
        for blueprint in blueprints[:20]:
            draft = _build_draft(
                city=entry.city,
                period_code=entry.period_code,
                question=str(blueprint["question"]),
                correct=str(blueprint["correct"]),
                distractors=[str(item) for item in blueprint["distractors"]],
                fact=str(blueprint["fact"]),
            )
            record = draft.to_record()
            hard_source_records.append(record)
            if len(pair_records) < entry.easy_question_count:
                pair_records.append(record)

        easy_records_by_pair[(entry.city, entry.period_code)] = pair_records
        hard_source_records_by_pair[(entry.city, entry.period_code)] = hard_source_records
        all_records.extend(pair_records)

    for entry in coverage:
        pair_key = (entry.city, entry.period_code)
        hard_records = build_hard_quiz_records(
            city=entry.city,
            period_code=entry.period_code,
            easy_records=hard_source_records_by_pair[pair_key],
            peer_easy_records_by_city={
                city: hard_source_records_by_pair[(city, entry.period_code)]
                for city in period_cities[entry.period_code]
                if (city, entry.period_code) in hard_source_records_by_pair
            },
            hard_question_count=entry.hard_question_count,
        )
        all_records.extend(hard_records)

    return all_records
