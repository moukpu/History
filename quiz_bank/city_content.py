from __future__ import annotations

from dataclasses import dataclass

from .constants import build_city_period_catalog
from .khanate_1465_dataset import build_khanate_1465_city_content_blueprints
from .imperial_1731_dataset import build_imperial_1731_city_content_blueprints
from .imperial_1868_svg_dataset import build_imperial_1868_city_content_blueprints
from .period_content import build_period_quiz_coverage_matrix
from .transition_1998_dataset import build_transition_1998_city_content_blueprints
from .independence_1991_dataset import build_independence_1991_city_content_blueprints
from .soviet_1925_dataset import build_soviet_1925_city_content_blueprints


@dataclass(frozen=True)
class CityPanelBlueprint:
    subtitle: str | None
    short_description: str
    history_summary: str
    interesting_fact: str
    old_name: str | None = None
    importance_reason: str | None = None
    image_keys: tuple[str, ...] = ()
    quiz_available: int = 1
    fact_challenge_available: int = 1


CITY_IMAGE_SLUGS = {
    "Астана": "astana",
    "Алматы": "almaty",
    "Шымкент": "shymkent",
    "Актобе": "aktobe",
    "Караганда": "karaganda",
    "Тараз": "taraz",
    "Павлодар": "pavlodar",
    "Оскемен": "oskemen",
    "Семей": "semey",
    "Атырау": "atyrau",
    "Костанай": "kostanay",
    "Кызылорда": "kyzylorda",
    "Орал": "oral",
    "Петропавл": "petropavl",
    "Актау": "aktau",
    "Туркестан": "turkistan",
    "Сыгнак": "sygnak",
    "Яссы": "yassy",
    "Отрар": "otrar",
    "Сауран": "sauran",
    "Сайрам": "sairam",
    "Верный": "almaty",
    "Семипалатинск": "semey",
    "Петропавловск": "petropavl",
    "Уральск": "oral",
    "Усть-Каменогорск": "oskemen",
    "Гурьев": "atyrau",
    "Аулие-Ата": "taraz",
    "Перовск": "kyzylorda",
    "Акмолинск": "astana",
    "Казалинск": "kyzylorda",
    "Чимкент": "shymkent",
}


CITY_PERIOD_CONTENT_BLUEPRINTS: dict[tuple[str, str], CityPanelBlueprint] = {
    ("Орал", "imperial_1731"): CityPanelBlueprint(
        subtitle="Пограничный город на реке Урал в эпоху раннего имперского влияния.",
        short_description=(
            "Район современного Орала был важен из-за пограничной линии и движения по реке Урал."
        ),
        history_summary=(
            "В XVIII веке поселение на Яике было связано с пограничной службой, торговлей и переправами. "
            "Эта территория постепенно становилась заметной частью имперской линии на западе степи."
        ),
        interesting_fact="До конца XVIII века город был известен как Яицкий городок.",
        old_name="Яицкий городок",
        importance_reason=(
            "Контроль переправ и путей по Уралу делал этот пункт важным для связи степи и приграничных районов."
        ),
    ),
    ("Атырау", "imperial_1731"): CityPanelBlueprint(
        subtitle="Нижнее течение Урала и путь к Каспийскому морю.",
        short_description=(
            "Район современного Атырау был важен из-за реки Урал и близости к Каспию."
        ),
        history_summary=(
            "В период раннего имперского влияния нижний Урал связывал степные земли с рыболовством, "
            "торговлей и каспийскими маршрутами. Здесь постепенно усиливалось значение будущего города Гурьева."
        ),
        interesting_fact="Современный Атырау стоит у реки Урал недалеко от Каспийского моря.",
        old_name="Гурьев",
        importance_reason=(
            "Река и близость к морю делали этот район важным для торговли и снабжения."
        ),
    ),
    ("Алматы", "imperial_1868"): CityPanelBlueprint(
        subtitle="Верный как административный центр Семиречья.",
        short_description=(
            "Во второй половине XIX века город Верный укреплялся как важный центр юго-востока."
        ),
        history_summary=(
            "После позднеимперских реформ Верный стал заметным городом Семиречья. "
            "Он развивался как место управления, торговли и связи между предгорьями и степными районами."
        ),
        interesting_fact="Современная Алматы в имперский период называлась Верный.",
        old_name="Верный",
        importance_reason=(
            "Город был удобен для управления краем и для путей между горными и равнинными территориями."
        ),
    ),
    ("Семей", "imperial_1868"): CityPanelBlueprint(
        subtitle="Торговый город на Иртыше в восточной части края.",
        short_description=(
            "Семей в позднеимперский период был важным городом на Иртыше."
        ),
        history_summary=(
            "Семипалатинск развивался как торговый и культурный центр Восточного Казахстана. "
            "Река Иртыш помогала связи города с соседними районами, а ярмарки усиливали его значение."
        ),
        interesting_fact="Историческое имя города — Семипалатинск.",
        old_name="Семипалатинск",
        importance_reason=(
            "Город связывал восточные районы и служил заметным центром торговли."
        ),
    ),
    ("Оскемен", "imperial_1868"): CityPanelBlueprint(
        subtitle="Город у слияния рек и путь к Рудному Алтаю.",
        short_description=(
            "Оскемен в позднеимперскую эпоху был связан с восточными рубежами и горным краем."
        ),
        history_summary=(
            "Усть-Каменогорск занимал важное место на востоке благодаря положению у рек и близости к Рудному Алтаю. "
            "Город служил опорным пунктом для торговли, управления и связи с горными районами."
        ),
        interesting_fact="Современный Оскемен раньше назывался Усть-Каменогорск.",
        old_name="Усть-Каменогорск",
        importance_reason=(
            "Положение у рек и рядом с горными районами делало город важным для востока Казахстана."
        ),
    ),
    ("Алматы", "soviet_1925"): CityPanelBlueprint(
        subtitle="Алма-Ата на пути к будущему столичному статусу.",
        short_description=(
            "В 1925 году Алма-Ата быстро усиливала своё значение в юго-восточной части республики."
        ),
        history_summary=(
            "В ранний советский период Алма-Ата росла как административный и культурный центр. "
            "Через несколько лет город станет столицей, а уже в 1925 году он был одним из самых заметных городов края."
        ),
        interesting_fact="В советские годы город долгое время был известен как Алма-Ата.",
        old_name="Алма-Ата",
        importance_reason=(
            "Город был важен благодаря удобному положению у предгорий и роли центра управления."
        ),
    ),
    ("Кызылорда", "soviet_1925"): CityPanelBlueprint(
        subtitle="Первая столица Казакской АССР на Сырдарье.",
        short_description=(
            "В 1925 году Кызылорда стала одной из ключевых точек молодой казахской государственности."
        ),
        history_summary=(
            "Именно в Кызылорде в 1925–1929 годах располагалась столица Казакской АССР. "
            "Город на Сырдарье стал местом важных решений первых советских лет."
        ),
        interesting_fact="Кызылорда была столицей Казакской АССР до переноса столицы в Алма-Ату.",
        old_name="Ак-Мечеть",
        importance_reason=(
            "Столичный статус сделал город важным политическим центром республики."
        ),
    ),
    ("Алматы", "independence_1991"): CityPanelBlueprint(
        subtitle="Столица первых лет независимого Казахстана.",
        short_description=(
            "В 1991 году Алматы была главным политическим и культурным центром страны."
        ),
        history_summary=(
            "После распада СССР именно Алматы оставалась столицей независимого Казахстана. "
            "Здесь принимались первые решения нового государства и работали основные республиканские учреждения."
        ),
        interesting_fact="В первые годы независимости именно Алматы была столицей Казахстана.",
        old_name="Алма-Ата",
        importance_reason=(
            "Столичный статус делал город центром политики, экономики и международных связей."
        ),
    ),
    ("Астана", "independence_1991"): CityPanelBlueprint(
        subtitle="Город Акмола до переноса столицы.",
        short_description=(
            "В 1991 году нынешняя Астана ещё называлась Акмола и не была столицей страны."
        ),
        history_summary=(
            "В первые годы независимости Акмола была важным городом северного Казахстана. "
            "Позже именно этот город выберут для переноса столицы, но в 1991 году он жил прежде всего как региональный центр."
        ),
        interesting_fact="Название Астана появилось позже, после решения о новой столице.",
        old_name="Целиноград",
        importance_reason=(
            "Положение в центре страны и транспортные связи позже сделали город удобным кандидатом на столичный статус."
        ),
    ),
    ("Астана", "transition_1998"): CityPanelBlueprint(
        subtitle="Новая столица страны и символ больших перемен.",
        short_description=(
            "В 1998 году Астана уже стала символом переноса столицы и нового этапа развития Казахстана."
        ),
        history_summary=(
            "После решения о переносе столицы город быстро оказался в центре внимания всей страны. "
            "В конце 1990-х здесь строились новые административные здания и формировался образ новой столицы."
        ),
        interesting_fact="Название Астана официально закрепилось в конце 1990-х.",
        old_name="Акмола",
        importance_reason=(
            "Столичный статус сделал город главным политическим центром страны."
        ),
    ),
    ("Атырау", "transition_1998"): CityPanelBlueprint(
        subtitle="Западный нефтяной центр переходной эпохи.",
        short_description=(
            "К концу 1990-х Атырау стал особенно заметен как город нефтяного региона."
        ),
        history_summary=(
            "В переходный постсоветский период Атырау усиливал значение на западе страны. "
            "Город был связан с нефтяной отраслью, рекой Урал и выходом к Каспийскому направлению."
        ),
        interesting_fact="До 1992 года город назывался Гурьев.",
        old_name="Гурьев",
        importance_reason=(
            "Нефтегазовый сектор сделал Атырау важным экономическим центром Казахстана."
        ),
    ),
    ("Астана", "modern_2025"): CityPanelBlueprint(
        subtitle="Современная столица Казахстана на реке Ишим.",
        short_description="Астана — главный политический центр страны и один из самых быстро меняющихся городов Казахстана.",
        history_summary=(
            "Сегодня Астана известна как столица с современными административными зданиями, университетами и культурными площадками. "
            "Город занимает важное место на карте страны благодаря своему столичному статусу и центральному положению."
        ),
        interesting_fact="До современного названия город был известен как Акмола и Нур-Султан.",
        old_name="Акмола",
        importance_reason="Именно здесь работают основные государственные органы Казахстана.",
    ),
    ("Алматы", "modern_2025"): CityPanelBlueprint(
        subtitle="Крупнейший город страны у подножия Заилийского Алатау.",
        short_description="Алматы остаётся одним из главных культурных, образовательных и деловых центров Казахстана.",
        history_summary=(
            "Город известен своими вузами, музеями, театрами и деловой активностью. "
            "Близость к горам делает Алматы узнаваемым и удобным местом для туризма и городской жизни."
        ),
        interesting_fact="До 1997 года Алматы была столицей Казахстана.",
        old_name="Верный",
        importance_reason="Алматы играет большую роль в культуре, образовании и экономике страны.",
    ),
    ("Шымкент", "modern_2025"): CityPanelBlueprint(
        subtitle="Крупный южный город с торговыми и культурными традициями.",
        short_description="Шымкент — один из крупнейших городов Казахстана и важный центр юга страны.",
        history_summary=(
            "Сегодня город известен активной городской жизнью, рынками, промышленностью и удобным положением на юге. "
            "Шымкент сохраняет связь с древними торговыми маршрутами региона."
        ),
        interesting_fact="Шымкент входит в число городов республиканского значения.",
        importance_reason="Город важен как транспортный, торговый и промышленный центр юга Казахстана.",
    ),
    ("Актобе", "modern_2025"): CityPanelBlueprint(
        subtitle="Западный город на реке Илек и важный транспортный узел.",
        short_description="Актобе — крупный город западной части Казахстана с развитой промышленностью.",
        history_summary=(
            "Город соединяет западные и центральные направления страны и играет заметную роль в экономике региона. "
            "Здесь развиваются промышленность, образование и транспортная инфраструктура."
        ),
        interesting_fact="Актобе расположен на реке Илек.",
        old_name="Актюбинск",
        importance_reason="Город важен для связи западных регионов и развития промышленности.",
    ),
    ("Караганда", "modern_2025"): CityPanelBlueprint(
        subtitle="Центр крупного индустриального и угольного региона.",
        short_description="Караганда известна как один из важнейших промышленных городов Центрального Казахстана.",
        history_summary=(
            "Город вырос вместе с развитием угольного бассейна и тяжёлой промышленности. "
            "Сегодня Караганда остаётся заметным образовательным и индустриальным центром страны."
        ),
        interesting_fact="Карагандинский угольный бассейн известен далеко за пределами региона.",
        importance_reason="Город долгое время играл ключевую роль в добыче угля и развитии промышленности.",
    ),
    ("Тараз", "modern_2025"): CityPanelBlueprint(
        subtitle="Древний южный город на реке Талас.",
        short_description="Тараз соединяет современную жизнь города с очень глубокой историей.",
        history_summary=(
            "Город известен как один из древнейших в Казахстане и связан с историей Великого шёлкового пути. "
            "Сегодня Тараз остаётся важным центром Жамбылской области."
        ),
        interesting_fact="В XX веке город долгое время назывался Жамбыл.",
        old_name="Жамбыл",
        importance_reason="Тараз важен как исторический и административный центр юга страны.",
    ),
    ("Павлодар", "modern_2025"): CityPanelBlueprint(
        subtitle="Город на Иртыше в северо-восточной части Казахстана.",
        short_description="Павлодар — заметный промышленный и энергетический центр на реке Иртыш.",
        history_summary=(
            "Современный город связан с крупными предприятиями, транспортом и жизнью Прииртышья. "
            "Река Иртыш делает Павлодар важной точкой северо-восточного региона."
        ),
        interesting_fact="Павлодар расположен на одном из крупнейших речных путей Казахстана — Иртыше.",
        importance_reason="Город важен для промышленности, энергетики и транспорта региона.",
    ),
    ("Оскемен", "modern_2025"): CityPanelBlueprint(
        subtitle="Восточный город у слияния Иртыша и Ульбы.",
        short_description="Оскемен — один из главных городов востока Казахстана и центр горно-металлургического региона.",
        history_summary=(
            "Город находится рядом с Алтаем и связан с промышленностью, наукой и энергетикой. "
            "Его положение у двух рек делает Оскемен заметным городским узлом востока страны."
        ),
        interesting_fact="Оскемен расположен у слияния рек Иртыш и Ульба.",
        old_name="Усть-Каменогорск",
        importance_reason="Город важен для промышленности и для связи восточных районов Казахстана.",
    ),
    ("Семей", "modern_2025"): CityPanelBlueprint(
        subtitle="Исторический город на Иртыше с сильной культурной памятью.",
        short_description="Семей известен своей историей, культурной ролью и связью с именем Абая.",
        history_summary=(
            "Город остаётся важным центром востока Казахстана и хранит память о крупных событиях прошлого. "
            "Семей часто упоминают рядом с культурной историей региона и рекой Иртыш."
        ),
        interesting_fact="Рядом с Семеем особенно часто вспоминают имя Абая Кунанбаева.",
        old_name="Семипалатинск",
        importance_reason="Семей важен как исторический и культурный центр восточной части страны.",
    ),
    ("Атырау", "modern_2025"): CityPanelBlueprint(
        subtitle="Город у реки Урал и важный центр нефтяного запада.",
        short_description="Атырау — один из ключевых городов западного Казахстана и нефтяного региона.",
        history_summary=(
            "Город расположен недалеко от Каспийского моря и играет большую роль в энергетике страны. "
            "Положение на Урале делает Атырау заметной точкой между речным и морским направлениями."
        ),
        interesting_fact="Атырау стоит на реке Урал, которая в школьной географии служит условной границей между Европой и Азией.",
        old_name="Гурьев",
        importance_reason="Город важен для нефтегазовой отрасли и развития западного Казахстана.",
    ),
    ("Костанай", "modern_2025"): CityPanelBlueprint(
        subtitle="Северный областной центр с сильной связью с сельскохозяйственным регионом.",
        short_description="Костанай — важный город северного Казахстана, связанный с образованием, торговлей и аграрным краем.",
        history_summary=(
            "Город расположен на севере страны и служит административным центром большого сельскохозяйственного региона. "
            "Здесь развиваются транспорт, образование и городские сервисы."
        ),
        interesting_fact="Костанай стоит на реке Тобол.",
        importance_reason="Город важен как центр северной области и окружающего аграрного региона.",
    ),
    ("Кызылорда", "modern_2025"): CityPanelBlueprint(
        subtitle="Город на Сырдарье с памятью о ранней столице республики.",
        short_description="Кызылорда соединяет современную жизнь областного центра с важной страницей истории Казахстана.",
        history_summary=(
            "Сегодня город остаётся главным центром региона на Сырдарье. "
            "Его часто вспоминают как бывшую столицу Казакской АССР и важный город юго-запада страны."
        ),
        interesting_fact="Кызылорда была столицей Казакской АССР в 1920-х годах.",
        old_name="Ак-Мечеть",
        importance_reason="Город важен как административный центр и часть исторической памяти страны.",
    ),
    ("Орал", "modern_2025"): CityPanelBlueprint(
        subtitle="Западный город на реке Урал с длинной пограничной историей.",
        short_description="Орал — важный исторический и транспортный центр западного Казахстана.",
        history_summary=(
            "Город вырос на важном речном пути и долгое время связывал степь с приграничными районами. "
            "Сегодня Орал остаётся заметным административным и культурным центром запада страны."
        ),
        interesting_fact="Русскоязычное историческое название города — Уральск.",
        old_name="Уральск",
        importance_reason="Положение на реке Урал сделало город важным для торговли и связи регионов.",
    ),
    ("Петропавл", "modern_2025"): CityPanelBlueprint(
        subtitle="Северный город с торговыми и транспортными традициями.",
        short_description="Петропавл — заметный город северного Казахстана, связанный с торговлей и путями сообщения.",
        history_summary=(
            "Город развивался как важный пункт северных маршрутов и остаётся областным центром. "
            "Он играет заметную роль в экономике и повседневной жизни северного региона."
        ),
        interesting_fact="Петропавл расположен недалеко от реки Ишим.",
        importance_reason="Город важен как транспортный и административный центр северной части страны.",
    ),
    ("Актау", "modern_2025"): CityPanelBlueprint(
        subtitle="Каспийский порт и главный город Мангистау.",
        short_description="Актау — морские ворота Казахстана на Каспийском море.",
        history_summary=(
            "Современный Актау известен портом, промышленностью и связью с нефтегазовым регионом. "
            "Город играет важную роль в транспорте, логистике и жизни западного побережья страны."
        ),
        interesting_fact="В советское время город был известен под названием Шевченко.",
        old_name="Шевченко",
        importance_reason="Порт и расположение на Каспии делают Актау важным для морских перевозок Казахстана.",
    ),
}

CITY_PERIOD_CONTENT_BLUEPRINTS.pop(("Тараз", "khanate_1465"), None)
CITY_PERIOD_CONTENT_BLUEPRINTS.pop(("Шымкент", "khanate_1465"), None)
CITY_PERIOD_CONTENT_BLUEPRINTS.update(
    {
        pair: CityPanelBlueprint(**payload)
        for pair, payload in build_khanate_1465_city_content_blueprints().items()
    }
)

CITY_PERIOD_CONTENT_BLUEPRINTS.pop(("Орал", "imperial_1731"), None)
CITY_PERIOD_CONTENT_BLUEPRINTS.pop(("Атырау", "imperial_1731"), None)
CITY_PERIOD_CONTENT_BLUEPRINTS.update(
    {
        pair: CityPanelBlueprint(**payload)
        for pair, payload in build_imperial_1731_city_content_blueprints().items()
    }
)

CITY_PERIOD_CONTENT_BLUEPRINTS.pop(("Алматы", "imperial_1868"), None)
CITY_PERIOD_CONTENT_BLUEPRINTS.pop(("Семей", "imperial_1868"), None)
CITY_PERIOD_CONTENT_BLUEPRINTS.pop(("Оскемен", "imperial_1868"), None)
CITY_PERIOD_CONTENT_BLUEPRINTS.update(
    {
        pair: CityPanelBlueprint(**payload)
        for pair, payload in build_imperial_1868_city_content_blueprints().items()
    }
)

CITY_PERIOD_CONTENT_BLUEPRINTS.update(
    {
        pair: CityPanelBlueprint(**payload)
        for pair, payload in build_independence_1991_city_content_blueprints().items()
    }
)

CITY_PERIOD_CONTENT_BLUEPRINTS.update(
    {
        pair: CityPanelBlueprint(**payload)
        for pair, payload in build_transition_1998_city_content_blueprints().items()
    }
)

CITY_PERIOD_CONTENT_BLUEPRINTS.update(
    {
        pair: CityPanelBlueprint(**payload)
        for pair, payload in build_soviet_1925_city_content_blueprints().items()
    }
)


def _build_default_image_keys(city: str, period_code: str) -> list[str]:
    slug = CITY_IMAGE_SLUGS[city]
    return [
        f"{slug}-{period_code}-hero",
        f"{slug}-{period_code}-map",
        f"{slug}-{period_code}-landmark",
    ]


def build_supported_city_content_pairs() -> list[tuple[str, str]]:
    pairs: list[tuple[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for entry in build_period_quiz_coverage_matrix():
        pair = (entry.city, entry.period_code)
        if pair in seen:
            continue
        seen.add(pair)
        pairs.append(pair)
    return pairs


def build_city_period_content_seed() -> list[dict[str, object | None]]:
    city_period_lookup = {
        (item["city"], item["period_code"]): item
        for item in build_city_period_catalog()
        if int(item["is_available"]) == 1
    }
    supported_pairs = build_supported_city_content_pairs()

    missing_blueprints = [
        pair for pair in supported_pairs if pair not in CITY_PERIOD_CONTENT_BLUEPRINTS
    ]
    if missing_blueprints:
        formatted = ", ".join(f"{city}/{period}" for city, period in missing_blueprints)
        raise ValueError(
            "Для части поддерживаемых пар нет контент-блупринтов: " + formatted
        )

    unexpected_blueprints = [
        pair
        for pair in CITY_PERIOD_CONTENT_BLUEPRINTS
        if pair not in city_period_lookup
    ]
    if unexpected_blueprints:
        formatted = ", ".join(f"{city}/{period}" for city, period in unexpected_blueprints)
        raise ValueError(
            "Контент-блупринты ссылаются на недоступные пары city_periods: " + formatted
        )

    records: list[dict[str, object | None]] = []
    for city, period_code in supported_pairs:
        city_period = city_period_lookup[(city, period_code)]
        blueprint = CITY_PERIOD_CONTENT_BLUEPRINTS[(city, period_code)]
        records.append(
            {
                "city": city,
                "period_code": period_code,
                "display_name": city_period["display_name"],
                "subtitle": blueprint.subtitle
                if blueprint.subtitle is not None
                else city_period["subtitle"],
                "short_description": blueprint.short_description,
                "history_summary": blueprint.history_summary,
                "interesting_fact": blueprint.interesting_fact,
                "old_name": blueprint.old_name,
                "importance_reason": blueprint.importance_reason,
                "image_keys": list(blueprint.image_keys)
                if blueprint.image_keys
                else _build_default_image_keys(city, period_code),
                "quiz_available": int(blueprint.quiz_available),
                "fact_challenge_available": int(blueprint.fact_challenge_available),
            }
        )
    return records
