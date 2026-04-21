from __future__ import annotations

from dataclasses import dataclass
import random
import re


PERIOD_CODE = "imperial_1731"


def _sanitize_city_reference(city: str, text: str) -> str:
    value = str(text or "").strip()
    if not value:
        return value
    value = re.sub(re.escape(city), "этот город", value, flags=re.IGNORECASE)
    value = re.sub(r"\s+", " ", value).strip()
    return value[:1].upper() + value[1:] if value else value


@dataclass(frozen=True)
class Imperial1731City:
    city: str
    display_name_1731: str
    coverage_note: str
    subtitle: str
    short_description: str
    history_summary: str
    interesting_fact: str
    old_name: str | None
    importance_reason: str
    macro_region: str
    admin_role: str
    waterway: str
    natural_setting: str
    economy_focus: str
    transport_role: str
    period_role: str
    name_note: str
    development_note: str
    geographic_note: str
    landmark_note: str
    regional_connection: str
    city_feature: str
    civic_role: str
    reason_on_map: str
    memory_fact: str


IMPERIAL_1731_CITIES: tuple[Imperial1731City, ...] = (
    Imperial1731City(
        city="Туркестан",
        display_name_1731="Туркестан",
        coverage_note="Историческая столица казахских ханов и духовный центр юга в 1731 году.",
        subtitle="Туркестан - город юга и резиденция казахских ханов.",
        short_description="В 1731 году Туркестан оставался одним из главных городов юга, связанным с ханской властью и паломничеством.",
        history_summary="Город, известный также как Ясы, долгое время был связан с политической жизнью Казахского ханства. Здесь находился мавзолей Ходжи Ахмеда Ясауи, а сам Туркестан воспринимался как важный духовный и символический центр степи.",
        interesting_fact="Многие казахские ханы были похоронены в мавзолее Ходжи Ахмеда Ясауи в Туркестане.",
        old_name="Ясы",
        importance_reason="город связывал ханскую власть, религиозный авторитет и торговые пути юга",
        macro_region="в среднем течении Сырдарьи на юге Казахстана",
        admin_role="резиденцией казахских ханов и важным духовным центром",
        waterway="с районом Сырдарьи и южными путями степи",
        natural_setting="с южным городом у Сырдарьи рядом с караванными дорогами",
        economy_focus="с торговлей, обслуживанием паломников и ремеслом крупного города",
        transport_role="с крупным узлом путей между степью и городами Средней Азии",
        period_role="с исторической столицей ханской власти на юге",
        name_note="Исторически город был известен как Ясы, но в XVIII веке широко употреблялось название «Туркестан».",
        development_note="В начале XVIII века Туркестан сохранял значение как политический и духовный центр.",
        geographic_note="Город находился на юге Казахстана в полосе городов Сырдарьи.",
        landmark_note="с мавзолеем Ходжи Ахмеда Ясауи и ханскими захоронениями",
        regional_connection="с городами Сырдарьи и южными землями Казахского ханства",
        city_feature="ханская столица и духовный авторитет степи",
        civic_role="служил местом ханской власти, религиозной памяти и торговли",
        reason_on_map="На карте 1731 года Туркестан важен как главный южный центр ханской эпохи.",
        memory_fact="Именно Туркестан часто называют городом, где особенно ясно видна связь ханской власти и мавзолея Ясауи.",
    ),
    Imperial1731City(
        city="Сыгнак",
        display_name_1731="Сыгнак",
        coverage_note="Город нижней Сырдарьи с памятью о столице Ак Орды и хозяйством южной степи.",
        subtitle="Сыгнак - город нижней Сырдарьи с древней столичной памятью.",
        short_description="В 1731 году Сыгнак оставался известным историческим городом в районе нижней Сырдарьи.",
        history_summary="Сыгнак был известен как один из старых городов юга и ранее был столицей Ак Орды. В XVI-XVIII веках город относили к казахским владениям, а его значение поддерживали земледелие, торговля и дороги вдоль Сырдарьи.",
        interesting_fact="Историки называют Сыгнак одной из известных средневековых столиц Дешт-и Кыпчака.",
        old_name=None,
        importance_reason="город напоминал о старых государственных центрах и поддерживал хозяйственную жизнь нижней Сырдарьи",
        macro_region="в нижнем течении Сырдарьи на юге степи",
        admin_role="историческим городом казахских владений с памятью о столице Ак Орды",
        waterway="с нижней Сырдарьей и путями вдоль ее долины",
        natural_setting="с городом речной долины у края степных пространств",
        economy_focus="с земледелием оазиса и торговлей по сырдарьинскому направлению",
        transport_role="с караванными дорогами нижней Сырдарьи",
        period_role="с историческим центром южной степи в зоне казахских городов",
        name_note="Название «Сыгнак» встречается в источниках как имя старого города нижней Сырдарьи.",
        development_note="К XVIII веку Сыгнак уже сохранял значение прежде всего как старый городской центр юга.",
        geographic_note="Город располагался в районе нижней Сырдарьи и был связан с южной степью.",
        landmark_note="с памятью о столице Ак Орды и городах нижней Сырдарьи",
        regional_connection="с нижнесырдарьинскими городами и землями юга Казахстана",
        city_feature="память о столице Ак Орды и старый городской узел",
        civic_role="поддерживал торговлю и хозяйственную жизнь нижней Сырдарьи",
        reason_on_map="На карте 1731 года Сыгнак показывает, что у нижней Сырдарьи сохранялись важные старые города.",
        memory_fact="Сыгнак часто вспоминают как город, связанный с историей Ак Орды и нижней Сырдарьи.",
    ),
    Imperial1731City(
        city="Отрар",
        display_name_1731="Отрар",
        coverage_note="Главный город Отрарского оазиса и караванный перекресток у Арыси и Сырдарьи.",
        subtitle="Отрар - главный город оазиса у Арыси и Сырдарьи.",
        short_description="В 1731 году Отрар оставался известным древним городом юга и важным ориентиром оазисной жизни.",
        history_summary="Отрар, известный также как Фараб, был одним из самых известных городов юга. Он стоял в крупном оазисе и был важным пунктом на пересечении дорог, где развивались земледелие, ремесло и торговля.",
        interesting_fact="Отрар прославился как один из крупнейших исторических городов Южного Казахстана и Средней Азии.",
        old_name="Фараб",
        importance_reason="оазис, перекресток путей и ремесло делали город заметным центром юга",
        macro_region="в Отрарском оазисе у слияния Арыси и Сырдарьи",
        admin_role="главным городом крупного южного оазиса",
        waterway="с Арысью, Сырдарьей и орошаемыми землями оазиса",
        natural_setting="с оазисным городом среди ирригационных земель юга",
        economy_focus="с поливным земледелием, ремеслом и торговлей",
        transport_role="с крупным перекрестком караванных путей",
        period_role="с древним городом-узлом южного Казахстана",
        name_note="В источниках прошлых веков город нередко упоминается под названием «Фараб».",
        development_note="К началу XVIII века значение Отрара держалось на его оазисе и перекрестке дорог.",
        geographic_note="Отрар находился на юге Казахстана там, где район Арыси связан с Сырдарьей.",
        landmark_note="с Отрарским оазисом и именем Фараб",
        regional_connection="с южными оазисами и дорогами между степью и Средней Азией",
        city_feature="оазисный перекресток и древняя городская традиция",
        civic_role="служил центром оазиса, ремесла и торговли",
        reason_on_map="На карте 1731 года Отрар показывает роль южных оазисов в жизни региона.",
        memory_fact="Отрар легко узнать по связи с оазисом, названием Фараб и караванными дорогами.",
    ),
    Imperial1731City(
        city="Сайрам",
        display_name_1731="Сайрам",
        coverage_note="Древний южный город Испиджаб, известный ремеслом и дорогами к Ташкенту.",
        subtitle="Сайрам - древний южный город, известный как Испиджаб.",
        short_description="В 1731 году Сайрам оставался известным городом юга рядом с путями к Ташкенту и Шымкенту.",
        history_summary="Сайрам, старый Испиджаб, был одним из заметных городов Южного Казахстана. Город прославился как укрепленный торгово-ремесленный центр и как важный пункт на дороге между степью и Средней Азией.",
        interesting_fact="Сайрам часто связывают с древним названием Испиджаб.",
        old_name="Испиджаб",
        importance_reason="город помогал торговле, ремеслу и связи южных земель со Средней Азией",
        macro_region="у предгорий юга Казахстана рядом с Шымкентом",
        admin_role="укрепленным торгово-ремесленным городом юга",
        waterway="с предгорным югом и дорогами к Ташкентскому направлению",
        natural_setting="с городом у предгорий и южных караванных дорог",
        economy_focus="с ремеслом, рынком и торговлей южного региона",
        transport_role="с дорогой между степью, Ташкентом и городами юга",
        period_role="с древним пограничным и торговым центром юга",
        name_note="Историческое название города - Испиджаб, но на поздних картах он известен как Сайрам.",
        development_note="В начале XVIII века Сайрам сохранял значение благодаря торговле и удобному положению у дорог.",
        geographic_note="Город находился на юге Казахстана у предгорной полосы рядом с Шымкентом.",
        landmark_note="с древним именем Испиджаб и южным торговым узлом",
        regional_connection="с южными городами и путями к Ташкенту",
        city_feature="древнее имя Испиджаб и ремесленный характер города",
        civic_role="служил укрепленным южным центром торговли и ремесла",
        reason_on_map="На карте 1731 года Сайрам напоминает о старых южных городах рядом с предгорьями.",
        memory_fact="Сайрам узнают по древнему имени Испиджаб и роли южного торгового города.",
    ),
    Imperial1731City(
        city="Тараз",
        display_name_1731="Тараз",
        coverage_note="Древний город долины Таласа и устойчивый ориентир караванных путей юга.",
        subtitle="Тараз - древний город долины Таласа.",
        short_description="В 1731 году Тараз оставался известным историческим городом юга и узлом старых торговых путей.",
        history_summary="Тараз был одним из древнейших городов региона и долгое время оставался важным ориентиром на юге. Город стоял в долине Таласа и связывался с историей Великого шелкового пути, торговли и городской культуры.",
        interesting_fact="Тараз часто называют одним из самых древних городов Казахстана.",
        old_name=None,
        importance_reason="город в долине Таласа сохранял значение как известный южный центр и точка старых караванных дорог",
        macro_region="в долине реки Талас на юге Казахстана",
        admin_role="крупным древним городом южного направления",
        waterway="с рекой Талас и путями южного Казахстана",
        natural_setting="с древним городом в плодородной таласской долине",
        economy_focus="с торговлей, ремеслом и хозяйством речной долины",
        transport_role="с одним из известных участков Великого шелкового пути",
        period_role="с древним городом юга, пережившим многие эпохи",
        name_note="Название «Тараз» относится к очень древней городской традиции юга Казахстана.",
        development_note="К XVIII веку Тараз прежде всего сохранял значение как исторический ориентир южного региона.",
        geographic_note="Город располагался на юге Казахстана в долине реки Талас.",
        landmark_note="с долиной Таласа и славой древнего города Великого шелкового пути",
        regional_connection="с Таласской долиной и южными караванными дорогами",
        city_feature="древность города и связь с Великим шелковым путем",
        civic_role="служил городским ориентиром юга и точкой торговых связей",
        reason_on_map="На карте 1731 года Тараз показывает долговечность старых городов юга Казахстана.",
        memory_fact="Тараз особенно легко узнать по реке Талас и репутации одного из древнейших городов страны.",
    ),
)


def _pick_distractors(city: str, field_name: str, answer: str, count: int = 3) -> list[str]:
    unique_values: list[str] = []
    seen: set[str] = set()

    for item in IMPERIAL_1731_CITIES:
        if item.city == city:
            continue
        candidate = _sanitize_city_reference(city, getattr(item, field_name))
        if not candidate or candidate == answer or candidate in seen:
            continue
        seen.add(candidate)
        unique_values.append(candidate)

    if len(unique_values) < count:
        raise ValueError(
            f"Недостаточно уникальных distractors для {city}/{field_name}: найдено {len(unique_values)}."
        )

    randomizer = random.Random(f"{PERIOD_CODE}|{city}|{field_name}")
    return randomizer.sample(unique_values, count)


def _build_field_question(
    item: Imperial1731City,
    field_name: str,
    question: str,
    fact: str,
) -> dict[str, object]:
    answer = _sanitize_city_reference(item.city, getattr(item, field_name))
    distractors = _pick_distractors(item.city, field_name, answer)
    return {
        "question": question,
        "correct": answer,
        "distractors": distractors,
        "fact": _sanitize_city_reference(item.city, fact),
    }


def build_imperial_1731_quiz_blueprints() -> dict[tuple[str, str], list[dict[str, object]]]:
    records: dict[tuple[str, str], list[dict[str, object]]] = {}

    for item in IMPERIAL_1731_CITIES:
        blueprints = [
            _build_field_question(item, "reason_on_map", "Почему этот город выделен на карте периода 1731 года?", item.reason_on_map),
            _build_field_question(item, "name_note", "Какое утверждение о названии этого города верно для периода 1731 года?", item.name_note),
            _build_field_question(item, "macro_region", "В какой части Казахстана находился этот город в 1731 году?", f"В 1731 году этот город находился {item.macro_region}."),
            _build_field_question(item, "admin_role", "Какую роль прежде всего играл этот город в 1731 году?", f"В 1731 году этот город был {item.admin_role}."),
            _build_field_question(item, "waterway", "С каким водным ориентиром или направлением был связан этот город?", f"Этот город особенно связывали {item.waterway}."),
            _build_field_question(item, "natural_setting", "Какой природный ориентир лучше всего помогает узнать этот город?", f"Этот город чаще всего узнают {item.natural_setting}."),
            _build_field_question(item, "economy_focus", "Какая хозяйственная особенность особенно подходила этому городу в 1731 году?", f"Для города в 1731 году было особенно характерно то, что он был связан {item.economy_focus}."),
            _build_field_question(item, "transport_role", "Какая транспортная роль лучше всего описывает этот город?", f"Для этого города была характерна связь {item.transport_role}."),
            _build_field_question(item, "period_role", "Какой статус лучше всего описывал этот город в эпоху 1731 года?", f"В 1731 году этот город прежде всего связывали {item.period_role}."),
            _build_field_question(item, "importance_reason", "Почему этот город был важен для региона в 1731 году?", f"Город был важен потому, что {item.importance_reason}."),
            _build_field_question(item, "subtitle", "Какое краткое определение лучше всего подходит этому городу?", item.subtitle),
            _build_field_question(item, "development_note", "Какое направление исторического развития особенно связано с этим городом к началу XVIII века?", item.development_note),
            _build_field_question(item, "geographic_note", "Какое географическое утверждение об этом городе верно?", item.geographic_note),
            _build_field_question(item, "landmark_note", "Какой ориентир сильнее всего связан с этим городом?", f"Этот город особенно узнают {item.landmark_note}."),
            _build_field_question(item, "regional_connection", "С каким направлением южного региона был связан этот город?", f"Город был связан {item.regional_connection}."),
            _build_field_question(item, "city_feature", "Какая особенность лучше всего выделяет этот город на исторической карте?", f"Особенность этого города - {item.city_feature}."),
            _build_field_question(item, "civic_role", "Какую городскую функцию лучше всего выполнял этот центр?", f"Этот город {item.civic_role}."),
            _build_field_question(item, "reason_on_map", "Почему этот город важно видеть именно на карте 1731 года?", item.reason_on_map),
            _build_field_question(item, "memory_fact", "Какой факт лучше всего помогает запомнить этот город?", item.memory_fact),
            _build_field_question(item, "interesting_fact", "Какой интересный факт верно относится к этому городу?", item.interesting_fact),
        ]
        records[(item.city, PERIOD_CODE)] = blueprints

    return records


def build_imperial_1731_city_content_blueprints() -> dict[tuple[str, str], dict[str, object | None]]:
    return {
        (item.city, PERIOD_CODE): {
            "subtitle": item.subtitle,
            "short_description": item.short_description,
            "history_summary": item.history_summary,
            "interesting_fact": item.interesting_fact,
            "old_name": item.old_name,
            "importance_reason": item.importance_reason,
        }
        for item in IMPERIAL_1731_CITIES
    }
