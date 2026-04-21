import { api } from "./api.js";
import { getCurrentLanguage, mountLanguageMenu } from "./language.js";
import {
  getCityImage,
  getCityVisual,
  getMarkerIcon,
} from "./city-visuals.js";
import {
  clearPeriodSvgMap,
  getInteractiveSvgCities,
  hasPeriodSvgMap,
  mountPeriodSvgMap,
  updatePeriodSvgMapState,
} from "./period-svg-map.js";
import {
  clearActiveFactSession,
  clearActiveQuizState,
  getActiveFactSession,
  getLastCity,
  getOrCreatePlayerId,
  reconcileStoredAuthUser,
  setActiveFactSession,
  setLastCity,
  setLastPeriodCode,
  setPendingQuizContext,
} from "./storage.js";
import {
  createElementFromHtml,
  escapeHtml,
  formatPercent,
  getErrorMessage,
  setHtml,
  setText,
  setVisible,
} from "./helpers.js";

const state = {
  playerId: null,
  bootstrap: null,
  selectedPeriodCode: null,
  selectedCity: null,
  mapStateCache: {},
  cityContentCache: {},
  factSession: null,
  factResult: null,
};

const elements = {};
let currentLanguage = getCurrentLanguage();

const translations = {
  ru: {
    page_title: "Sapar Quest - Карта",
    nav_home: "Главная",
    nav_map: "Карта",
    nav_leaderboard: "Рейтинг",
    loading_map: "Загрузка карты и прогресса...",
    load_error: "Ошибка загрузки.",
    retry: "Повторить",
    summary_tests: "Тесты",
    summary_achievements: "Достижения",
    timeline_title: "Лента времени степи",
    active_period: "Активный период",
    active_period_value: ({ title }) => `Активный период: ${title}`,
    no_period: "Не выбран",
    locked_period_tooltip: "Недоступно до прохождения предыдущего периода",
    locked_period_status:
      "Этот период откроется после прохождения всех городских тестов предыдущего периода.",
    historical_period: "Исторический период",
    city_role_default: "Город периода",
    select_city: "Выберите город",
    select_city_subtitle: "На карте появятся доступные города выбранного периода.",
    city_description_placeholder: "Исторический контент загрузится после выбора города.",
    historical_city_default: "Исторический город выбранного периода.",
    short_description_unavailable: "Краткое описание пока недоступно.",
    history_unavailable: "Историческая справка будет доступна после загрузки.",
    fact_unavailable: "Интересный факт появится после загрузки контента.",
    achievements_empty: "Достижения появятся после первых успешных действий на карте.",
    old_name_prefix: ({ name }) => `Ранее: ${name}`,
    quiz_available: "Тест доступен",
    quiz_unavailable: "Тест пока недоступен",
    fact_available: "Факт-вызов доступен",
    fact_unavailable_chip: "Факт-вызов пока недоступен",
    city_achievement_unlocked: "Достижение города открыто",
    best_score: "Лучший результат",
    attempts: "Попыток",
    attempts_period: "Попыток в периоде",
    short_history: "Краткая история",
    interesting_fact: "Интересный факт",
    city_progress: "Прогресс по городу",
    city_test_passed: "Тест по городу уже пройден",
    city_test_not_passed: "Тест по городу ещё не пройден",
    fact_challenge: "Факт-вызов",
    fact_challenge_period: "Факт-вызов периода",
    fact_answer_accepted: "Ответ принят",
    fact_answer_checked: "Ответ проверен",
    fact_correct: ({ city }) => `Верно! Правильный город: ${city}.`,
    fact_wrong: ({ city }) => `Пока нет. Правильный город: ${city}.`,
    fact_text_default: "Получите короткий исторический факт и угадайте нужный город прямо на карте.",
    fact_helper_default: "Результат сохранится в backend и повлияет на прогресс игрока.",
    fact_helper_active: "Нажмите на один из подсвеченных городов на карте, чтобы отправить ответ.",
    fact_button_active: "Факт-вызов активен",
    fact_button_new: "Начать новый факт-вызов",
    fact_helper_available: "Факт-вызов использует выбранный период и сохраняет результат в backend.",
    fact_helper_unavailable: "Для этого города в выбранном периоде факт-вызов пока недоступен.",
    fact_candidate_warning: "Для факт-вызова выберите один из подсвеченных городов.",
    start_test: "Начать тест",
    start_fact_challenge: "Начать факт-вызов",
    cancel: "Сбросить",
    loading: "Загрузка...",
    quiz_unavailable_status: "Для этого города в выбранном периоде тест пока недоступен.",
  },
  en: {
    page_title: "Sapar Quest - Map",
    nav_home: "Home",
    nav_map: "Map",
    nav_leaderboard: "Leaderboard",
    loading_map: "Loading map and progress...",
    load_error: "Loading error.",
    retry: "Try again",
    summary_tests: "Tests",
    summary_achievements: "Achievements",
    timeline_title: "Steppe timeline",
    active_period: "Active period",
    active_period_value: ({ title }) => `Active period: ${title}`,
    no_period: "Not selected",
    locked_period_tooltip: "Unavailable until the previous period is completed",
    locked_period_status:
      "This period will unlock after all city tests in the previous period are completed.",
    historical_period: "Historical period",
    city_role_default: "Period city",
    select_city: "Select a city",
    select_city_subtitle: "Available cities for the selected period will appear on the map.",
    city_description_placeholder: "Historical content will load after you select a city.",
    historical_city_default: "Historical city of the selected period.",
    short_description_unavailable: "A short description is not available yet.",
    history_unavailable: "Historical notes will be available after loading.",
    fact_unavailable: "An interesting fact will appear after the content loads.",
    achievements_empty: "Achievements will appear after your first successful actions on the map.",
    old_name_prefix: ({ name }) => `Earlier name: ${name}`,
    quiz_available: "Test available",
    quiz_unavailable: "Test not available yet",
    fact_available: "Fact challenge available",
    fact_unavailable_chip: "Fact challenge not available yet",
    city_achievement_unlocked: "City achievement unlocked",
    best_score: "Best score",
    attempts: "Attempts",
    attempts_period: "Attempts in this period",
    short_history: "Short history",
    interesting_fact: "Interesting fact",
    city_progress: "City progress",
    city_test_passed: "City test completed",
    city_test_not_passed: "City test not completed yet",
    fact_challenge: "Fact challenge",
    fact_challenge_period: "Period fact challenge",
    fact_answer_accepted: "Answer accepted",
    fact_answer_checked: "Answer checked",
    fact_correct: ({ city }) => `Correct. The right city is ${city}.`,
    fact_wrong: ({ city }) => `Not yet. The right city is ${city}.`,
    fact_text_default: "Get a short historical fact and guess the right city directly on the map.",
    fact_helper_default: "The result will be saved in the backend and will affect player progress.",
    fact_helper_active: "Click one of the highlighted cities on the map to submit your answer.",
    fact_button_active: "Fact challenge active",
    fact_button_new: "Start a new fact challenge",
    fact_helper_available: "The fact challenge uses the selected period and saves the result in the backend.",
    fact_helper_unavailable: "The fact challenge is not available for this city in the selected period yet.",
    fact_candidate_warning: "For the fact challenge, choose one of the highlighted cities.",
    start_test: "Start test",
    start_fact_challenge: "Start fact challenge",
    cancel: "Reset",
    loading: "Loading...",
    quiz_unavailable_status: "The test is not available for this city in the selected period yet.",
  },
  kk: {
    page_title: "Sapar Quest - Карта",
    nav_home: "Басты бет",
    nav_map: "Карта",
    nav_leaderboard: "Рейтинг",
    loading_map: "Карта мен прогресс жүктелуде...",
    load_error: "Жүктеу қатесі.",
    retry: "Қайталау",
    summary_tests: "Тесттер",
    summary_achievements: "Жетістіктер",
    timeline_title: "Дала уақыт жолағы",
    active_period: "Белсенді кезең",
    active_period_value: ({ title }) => `Белсенді кезең: ${title}`,
    no_period: "Таңдалмаған",
    locked_period_tooltip: "Алдыңғы кезең аяқталғаннан кейін қолжетімді болады",
    locked_period_status:
      "Бұл кезең алдыңғы кезеңдегі барлық қала тесттері аяқталғаннан кейін ашылады.",
    historical_period: "Тарихи кезең",
    city_role_default: "Кезең қаласы",
    select_city: "Қаланы таңдаңыз",
    select_city_subtitle: "Таңдалған кезеңнің қолжетімді қалалары картада пайда болады.",
    city_description_placeholder: "Тарихи ақпарат қала таңдалғаннан кейін жүктеледі.",
    historical_city_default: "Таңдалған кезеңнің тарихи қаласы.",
    short_description_unavailable: "Қысқаша сипаттама әзірге қолжетімді емес.",
    history_unavailable: "Тарихи анықтама жүктелгеннен кейін қолжетімді болады.",
    fact_unavailable: "Қызықты факт ақпарат жүктелгеннен кейін пайда болады.",
    achievements_empty: "Жетістіктер картадағы алғашқы сәтті әрекеттерден кейін пайда болады.",
    old_name_prefix: ({ name }) => `Бұрынғы атауы: ${name}`,
    quiz_available: "Тест қолжетімді",
    quiz_unavailable: "Тест әзірге қолжетімді емес",
    fact_available: "Факт-челлендж қолжетімді",
    fact_unavailable_chip: "Факт-челлендж әзірге қолжетімді емес",
    city_achievement_unlocked: "Қала жетістігі ашылды",
    best_score: "Үздік нәтиже",
    attempts: "Талпыныс",
    attempts_period: "Осы кезеңдегі талпыныстар",
    short_history: "Қысқаша тарих",
    interesting_fact: "Қызықты факт",
    city_progress: "Қала прогресі",
    city_test_passed: "Қала тесті орындалды",
    city_test_not_passed: "Қала тесті әлі орындалмады",
    fact_challenge: "Факт-челлендж",
    fact_challenge_period: "Кезең факт-челленджі",
    fact_answer_accepted: "Жауап қабылданды",
    fact_answer_checked: "Жауап тексерілді",
    fact_correct: ({ city }) => `Дұрыс. Дұрыс қала: ${city}.`,
    fact_wrong: ({ city }) => `Әзірге дұрыс емес. Дұрыс қала: ${city}.`,
    fact_text_default: "Қысқа тарихи факт алып, картадан дұрыс қаланы тап.",
    fact_helper_default: "Нәтиже backend-те сақталып, ойыншы прогресіне әсер етеді.",
    fact_helper_active: "Жауап жіберу үшін картадағы белгіленген қалалардың бірін басыңыз.",
    fact_button_active: "Факт-челлендж белсенді",
    fact_button_new: "Жаңа факт-челлендж бастау",
    fact_helper_available: "Факт-челлендж таңдалған кезеңді пайдаланып, нәтижені backend-те сақтайды.",
    fact_helper_unavailable: "Бұл қала үшін таңдалған кезеңде факт-челлендж әзірге қолжетімді емес.",
    fact_candidate_warning: "Факт-челлендж үшін белгіленген қалалардың бірін таңдаңыз.",
    start_test: "Тест бастау",
    start_fact_challenge: "Факт-челлендж бастау",
    cancel: "Қалпына келтіру",
    loading: "Жүктелуде...",
    quiz_unavailable_status: "Бұл қала үшін таңдалған кезеңде тест әзірге қолжетімді емес.",
  },
};

const periodTitleTranslations = {
  en: {
    khanate_1465: "Kazakh Khanate",
    imperial_1731: "Russian Empire Influence",
    imperial_1868: "Imperial Administrative Reform",
    soviet_1925: "Soviet Kazakhstan",
    independence_1991: "Independent Kazakhstan",
    transition_1998: "Capital Relocation Era",
    modern_2025: "Modern Kazakhstan",
  },
  kk: {
    khanate_1465: "Қазақ хандығы",
    imperial_1731: "Ресей империясының ықпалы",
    imperial_1868: "Империялық әкімшілік реформа",
    soviet_1925: "Кеңестік Қазақстан",
    independence_1991: "Тәуелсіз Қазақстан",
    transition_1998: "Астананы көшіру кезеңі",
    modern_2025: "Қазіргі Қазақстан",
  },
};

const khanateCityContentTranslations = {
  en: {
    "Сыгнак": {
      subtitle: "Сыгнак was a city of the Middle Syr Darya and an important political center of the steppe.",
      short_description:
        "By the mid-15th century, Сыгнак remained one of the main cities of the Middle Syr Darya and was tied to the early history of the Kazakh Khanate.",
      history_summary:
        "Archaeology.kz describes Сыгнак as the capital of the Ak Orda in the 14th-15th centuries and as a city connected with the Kazakh Khanate in the 15th-16th centuries. The city stood on Syr Darya routes, had khan burials, and remained important as a political and trading center.",
      interesting_fact: "Coins were already minted in Сыгнак in the 14th century.",
      role: "Political center of the Syr Darya",
    },
    "Яссы": {
      subtitle: "Яссы was a city of pilgrimage and spiritual memory in Southern Kazakhstan.",
      short_description:
        "In 1465, Яссы was known as the city of Khoja Ahmed Yasawi and an important spiritual center of the southern region.",
      history_summary:
        "UNESCO and the Azret-Sultan museum note that the Mausoleum of Khoja Ahmed Yasawi stood in the city of Яссы, later known as Turkestan. By the 15th century, mosques and other religious buildings had grown around the shrine, strengthening the city's role among the Syr Darya cities.",
      interesting_fact: "The city of Яссы later became known as Turkestan.",
      role: "Spiritual center of the south",
    },
    "Отрар": {
      subtitle: "Отрар was the main oasis city near the Arys and Syr Darya rivers.",
      short_description:
        "By 1465, Отрар remained a major city of the southern oasis and an important link between farming regions and the steppe.",
      history_summary:
        "Archaeology.kz writes that the Otrar oasis was supplied by the waters of the Arys and Syr Darya, while Отрар itself played a major political, economic, and spiritual role. After the Mongol period, the city developed again in the 14th-15th centuries and was one of the notable centers of the south.",
      interesting_fact: "The main water sources for the Otrar oasis were the Arys and Syr Darya rivers.",
      role: "Oasis and trade center",
    },
    "Сауран": {
      subtitle: "Сауран was a fortified city on the roads of the Turkestan region.",
      short_description:
        "In 1465, Сауран was known as a strong fortress and one of the notable cities of southern Kazakhstan.",
      history_summary:
        "The official Azret-Sultan museum site notes that in the 14th century Сауран was called one of the cities of the White Horde, and in the 15th-16th centuries it was often mentioned in struggles for the cities of the Turkestan region. The city was known for powerful walls, towers, gates, and a moat.",
      interesting_fact: "In late medieval Сауран, northern and southern gates led into the city.",
      role: "Fortified city",
    },
    "Сайрам": {
      subtitle: "Сайрам was the ancient city of Ispidjab and a sacred center of the south.",
      short_description:
        "In 1465, Сайрам remained a well-known southern city associated with ancient Ispidjab and trade routes.",
      history_summary:
        "Archaeology.kz calls Сайрам one of the largest monuments of urban culture in southern Kazakhstan and identifies it with Ispidjab. The city developed on caravan roads, kept sacred importance for a long time, and was known for many religious monuments.",
      interesting_fact: "In medieval sources, Сайрам was often called Ispidjab.",
      role: "Sacred trade city",
    },
    "Тараз": {
      subtitle: "Тараз was an ancient city of the Talas valley and a historical landmark of the south.",
      short_description:
        "By the 15th century, ancient Тараз had lost some of its earlier influence, but the place of the city still preserved its historical importance in the south.",
      history_summary:
        "Archaeology.kz connects Тараз with two millennia of urban history and a central position on the Great Silk Road. The source notes that the city of Talas ceased to exist in the 15th century, but settled life continued in the area later, so the district of ancient Тараз preserved historical memory.",
      interesting_fact: "Тараз stood in the Talas River valley and was long one of the main cities of the south.",
      role: "Ancient southern city",
    },
  },
  kk: {
    "Сыгнак": {
      subtitle: "Сыгнак Орта Сырдариядағы қала және даланың маңызды саяси орталығы болды.",
      short_description:
        "XV ғасырдың ортасында Сыгнак Орта Сырдарияның басты қалаларының бірі болып қалып, Қазақ хандығының ерте тарихымен байланысты болды.",
      history_summary:
        "Archaeology.kz Сыгнақты XIV-XV ғасырларда Ақ Орданың астанасы және XV-XVI ғасырларда Қазақ хандығымен байланысты қала ретінде атайды. Қала Сырдария жолдарының бойында орналасып, хан жерлеулерімен, саяси және сауда орталығы ретіндегі маңызымен ерекшеленді.",
      interesting_fact: "Сыгнакта XIV ғасырдың өзінде теңге соғылған.",
      role: "Сырдариядағы саяси орталық",
    },
    "Яссы": {
      subtitle: "Яссы Оңтүстік Қазақстандағы зиярат пен рухани жад қаласы болды.",
      short_description:
        "1465 жылы Яссы Қожа Ахмет Ясауи қаласы және оңтүстік өңірдің маңызды рухани орталығы ретінде белгілі болды.",
      history_summary:
        "UNESCO және «Әзірет-Сұлтан» музейі Қожа Ахмет Ясауи кесенесі кейін Түркістан аталған Яссы қаласында тұрғанын атап өтеді. XV ғасырда қасиетті орынның айналасында мешіттер мен басқа діни құрылыстар көбейіп, қала Сырдария бойындағы орталықтар арасында маңызын күшейтті.",
      interesting_fact: "Кейін Яссы қаласы Түркістан атауымен белгілі болды.",
      role: "Оңтүстіктің рухани орталығы",
    },
    "Отрар": {
      subtitle: "Отрар Арыс пен Сырдария маңындағы оазистің басты қаласы болды.",
      short_description:
        "1465 жылға қарай Отрар оңтүстік оазистің ірі қаласы және егіншілік аймақтары мен даланы байланыстыратын маңызды нүкте болып қалды.",
      history_summary:
        "Archaeology.kz Отрар оазисі Арыс пен Сырдария суларымен қамтамасыз етілгенін, ал Отрардың саяси, шаруашылық және рухани рөлі үлкен болғанын жазады. Моңғол дәуірінен кейін қала XIV-XV ғасырларда қайта дамып, оңтүстіктің көрнекті орталықтарының қатарына кірді.",
      interesting_fact: "Отрар оазисінің негізгі су көздері Арыс пен Сырдария болды.",
      role: "Оазис және сауда орталығы",
    },
    "Сауран": {
      subtitle: "Сауран Түркістан өңірінің жолдарындағы бекіністі қала болды.",
      short_description:
        "1465 жылы Сауран мықты қамал және оңтүстік Қазақстанның көрнекті қалаларының бірі ретінде белгілі болды.",
      history_summary:
        "«Әзірет-Сұлтан» музейінің ресми сайты XIV ғасырда Сауран Ақ Орданың қалаларының бірі аталғанын, ал XV-XVI ғасырларда Түркістан өңіріндегі қалалар үшін күресте жиі айтылғанын көрсетеді. Қала қуатты қабырғаларымен, мұнараларымен, қақпаларымен және орларымен танылды.",
      interesting_fact: "Кейінгі орта ғасырдағы Сауранға солтүстік және оңтүстік қақпалар арқылы кірген.",
      role: "Бекіністі қала",
    },
    "Сайрам": {
      subtitle: "Сайрам ежелгі Испиджаб және оңтүстіктің қасиетті орталығы болды.",
      short_description:
        "1465 жылы Сайрам ежелгі Испиджабпен және сауда жолдарымен байланысты белгілі оңтүстік қала болып қала берді.",
      history_summary:
        "Archaeology.kz Сайрамды оңтүстік Қазақстандағы қала мәдениетінің ең ірі ескерткіштерінің бірі деп атап, оны Испиджабпен сәйкестендіреді. Қала керуен жолдарында дамып, ұзақ уақыт қасиетті маңызын сақтады және көптеген діни ескерткіштерімен белгілі болды.",
      interesting_fact: "Ортағасырлық деректерде Сайрам жиі Испиджаб деп аталған.",
      role: "Қасиетті сауда қаласы",
    },
    "Тараз": {
      subtitle: "Тараз Талас аңғарындағы ежелгі қала және оңтүстіктің тарихи бағдары болды.",
      short_description:
        "XV ғасырда ежелгі Тараз бұрынғы ықпалының бір бөлігін жоғалтса да, қаланың орны оңтүстіктегі тарихи маңызын сақтады.",
      history_summary:
        "Archaeology.kz Таразды екі мың жылдық қала тарихымен және Ұлы Жібек жолындағы орталық орнымен байланыстырады. Дереккөз Талас қаласы XV ғасырда өмір сүруін тоқтатқанын, бірақ бұл жерде отырықшы халық кейін де өмір сүргенін айтады, сондықтан ежелгі Тараз аймағы тарихи жадты сақтады.",
      interesting_fact: "Тараз Талас өзені аңғарында орналасып, ұзақ уақыт оңтүстіктің басты қалаларының бірі болды.",
      role: "Ежелгі оңтүстік қала",
    },
  },
};

const imperial1731CityContentTranslations = {
  en: {
    "Туркестан": {
      subtitle: "Туркестан was a southern city and a residence of Kazakh khans.",
      short_description:
        "In 1731, Туркестан remained one of the main cities of the south, connected with khan authority and pilgrimage.",
      history_summary:
        "The city, also known as Yasy, was long connected with the political life of the Kazakh Khanate. It was home to the Mausoleum of Khoja Ahmed Yasawi, and Туркестан was seen as an important spiritual and symbolic center of the steppe.",
      interesting_fact: "Many Kazakh khans were buried in the Mausoleum of Khoja Ahmed Yasawi in Туркестан.",
      role: "Khan residence city",
    },
    "Сыгнак": {
      subtitle: "Сыгнак was a lower Syr Darya city with ancient capital memory.",
      short_description:
        "In 1731, Сыгнак remained a known historical city in the lower Syr Darya area.",
      history_summary:
        "Сыгнак was known as one of the old cities of the south and had earlier been the capital of the Ak Orda. In the 16th-18th centuries, the city was associated with Kazakh possessions, while farming, trade, and Syr Darya routes supported its importance.",
      interesting_fact: "Historians call Сыгнак one of the well-known medieval capitals of Desht-i Kipchak.",
      role: "Historic Syr Darya city",
    },
    "Отрар": {
      subtitle: "Отрар was the main oasis city near the Arys and Syr Darya rivers.",
      short_description:
        "In 1731, Отрар remained a famous ancient city of the south and an important landmark of oasis life.",
      history_summary:
        "Отрар, also known as Farab, was one of the best-known cities of the south. It stood in a large oasis and was an important crossroads where farming, crafts, and trade developed.",
      interesting_fact: "Отрар became famous as one of the largest historical cities of Southern Kazakhstan and Central Asia.",
      role: "Oasis crossroads",
    },
    "Сайрам": {
      subtitle: "Сайрам was an ancient southern city known as Ispidjab.",
      short_description:
        "In 1731, Сайрам remained a known southern city near the routes to Tashkent and Shymkent.",
      history_summary:
        "Сайрам, the old Ispidjab, was one of the notable cities of Southern Kazakhstan. The city was known as a fortified trade and craft center and as an important point on the road between the steppe and Central Asia.",
      interesting_fact: "Сайрам is often connected with the ancient name Ispidjab.",
      role: "Trade and craft city",
    },
    "Тараз": {
      subtitle: "Тараз was an ancient city of the Talas valley.",
      short_description:
        "In 1731, Тараз remained a known historical city of the south and a node of old trade routes.",
      history_summary:
        "Тараз was one of the oldest cities of the region and long remained an important landmark in the south. The city stood in the Talas valley and was connected with the history of the Great Silk Road, trade, and urban culture.",
      interesting_fact: "Тараз is often called one of the oldest cities of Kazakhstan.",
      role: "Ancient Talas city",
    },
  },
  kk: {
    "Туркестан": {
      subtitle: "Туркестан оңтүстіктегі қала және қазақ хандарының ордасы болды.",
      short_description:
        "1731 жылы Туркестан хан билігімен және зиярат дәстүрімен байланысты оңтүстіктің басты қалаларының бірі болып қалды.",
      history_summary:
        "Ясы атымен де белгілі қала ұзақ уақыт Қазақ хандығының саяси өмірімен байланысты болды. Мұнда Қожа Ахмет Ясауи кесенесі орналасқан, ал Туркестан даланың маңызды рухани және символдық орталығы ретінде қабылданды.",
      interesting_fact: "Көптеген қазақ хандары Туркестандағы Қожа Ахмет Ясауи кесенесінде жерленген.",
      role: "Хандар ордасы",
    },
    "Сыгнак": {
      subtitle: "Сыгнак төменгі Сырдариядағы көне астаналық жады бар қала болды.",
      short_description:
        "1731 жылы Сыгнак төменгі Сырдария аймағындағы белгілі тарихи қала болып қала берді.",
      history_summary:
        "Сыгнак оңтүстіктің ескі қалаларының бірі ретінде белгілі және бұрын Ақ Орданың астанасы болған. XVI-XVIII ғасырларда қала қазақ иеліктерімен байланыстырылып, оның маңызын егіншілік, сауда және Сырдария бойындағы жолдар сақтап тұрды.",
      interesting_fact: "Тарихшылар Сыгнақты Дешті Қыпшақтың белгілі ортағасырлық астаналарының бірі деп атайды.",
      role: "Сырдариядағы тарихи қала",
    },
    "Отрар": {
      subtitle: "Отрар Арыс пен Сырдария маңындағы оазистің басты қаласы болды.",
      short_description:
        "1731 жылы Отрар оңтүстіктің әйгілі ежелгі қаласы және оазистік өмірдің маңызды бағдары болып қалды.",
      history_summary:
        "Фараб атымен де белгілі Отрар оңтүстіктің ең танымал қалаларының бірі болды. Ол ірі оазисте орналасып, егіншілік, қолөнер және сауда дамыған жолдар торабындағы маңызды пункт болды.",
      interesting_fact: "Отрар Оңтүстік Қазақстан мен Орта Азияның ең ірі тарихи қалаларының бірі ретінде әйгілі болды.",
      role: "Оазис жол торабы",
    },
    "Сайрам": {
      subtitle: "Сайрам Испиджаб атымен белгілі ежелгі оңтүстік қала болды.",
      short_description:
        "1731 жылы Сайрам Ташкент пен Шымкентке баратын жолдар маңындағы белгілі оңтүстік қала болып қалды.",
      history_summary:
        "Ескі Испиджаб болған Сайрам Оңтүстік Қазақстанның көрнекті қалаларының бірі еді. Қала бекіністі сауда-қолөнер орталығы және дала мен Орта Азия арасындағы жолдағы маңызды орын ретінде танылды.",
      interesting_fact: "Сайрамды жиі ежелгі Испиджаб атауымен байланыстырады.",
      role: "Сауда және қолөнер қаласы",
    },
    "Тараз": {
      subtitle: "Тараз Талас аңғарындағы ежелгі қала болды.",
      short_description:
        "1731 жылы Тараз оңтүстіктің белгілі тарихи қаласы және ескі сауда жолдарының торабы болып қалды.",
      history_summary:
        "Тараз өңірдегі ең көне қалалардың бірі болып, оңтүстіктегі маңызды тарихи бағдар ретінде ұзақ сақталды. Қала Талас аңғарында орналасып, Ұлы Жібек жолы, сауда және қала мәдениеті тарихымен байланысты болды.",
      interesting_fact: "Таразды Қазақстанның ең көне қалаларының бірі деп жиі атайды.",
      role: "Ежелгі Талас қаласы",
    },
  },
};

const imperial1868CityContentTranslations = {
  en: {
    "Верный": {
      subtitle: "Верный was the administrative center of Semirechye near the Trans-Ili Alatau.",
      short_description:
        "In 1868, Верный was the main city of Semirechye and an important administrative point in the southeast.",
      history_summary:
        "The city grew from the Zailiysky fortification and by the late 1860s became the center of the Semirechensk Oblast within the Turkestan Governor-Generalship. Its foothill location, local trade links, and roads toward Kulja made it an important administrative and commercial city.",
      interesting_fact: "Modern Almaty was known as Верный during the imperial period.",
      role: "Semirechye administrative center",
    },
    "Семипалатинск": {
      subtitle: "Семипалатинск was an Irtysh oblast center and a major eastern trading city.",
      short_description:
        "In 1868, Семипалатинск was an oblast city of eastern Kazakhstan and one of the main trade centers on the Irtysh.",
      history_summary:
        "The city began as a Russian fortress and was later moved to its current site to avoid floods. By the late 19th century it developed as an oblast center linked with the Irtysh and caravan routes between Siberia, Central Asia, and China.",
      interesting_fact:
        "The name Семипалатинск is connected with the ruins known as the Seven Chambers near the first fortress.",
      role: "Irtysh trade center",
    },
    "Петропавловск": {
      subtitle: "Петропавловск was a northern trading city on the Ishim and a steppe route hub.",
      short_description:
        "In 1868, Петропавловск was a notable trade center of northern Kazakhstan and a link between Russia, the steppe, and Central Asia.",
      history_summary:
        "The city emerged as a Russian fortress on the Ishim and soon became an important trading point. In the second half of the 19th century, its role was supported by ties with Russia, steppe districts, and caravan trade toward Central Asia.",
      interesting_fact: "Петропавловск was founded as a Russian fortress in 1752.",
      role: "Northern trade hub",
    },
    "Уральск": {
      subtitle: "Уральск was the center of the Ural Oblast on the Ural River.",
      short_description:
        "In 1868, Уральск was the main city of the western border region and a notable trade center on the Ural.",
      history_summary:
        "The city was known as Yaitsky Gorodok before its renaming in 1775. In the second half of the 19th century, Уральск served as the center of the Ural Oblast and traded actively with European Russia, especially through fish from the Ural and livestock products from the steppe.",
      interesting_fact: "Before 1775, the city was called Yaitsky Gorodok.",
      role: "Western oblast center",
    },
    "Усть-Каменогорск": {
      subtitle: "Усть-Каменогорск was an eastern city by the Irtysh and Ulba, linked with Rudny Altai.",
      short_description:
        "In 1868, Усть-Каменогорск was an important eastern city connected with mining routes and border trade.",
      history_summary:
        "The city was founded as a Russian fortress at the meeting point of the Irtysh and Ulba. In the late imperial period, its importance came from proximity to Rudny Altai, roads to mountain districts, and trade links with eastern Kazakhstan, Mongolia, and China.",
      interesting_fact: "Усть-Каменогорск grew from a Russian fortress founded in 1720.",
      role: "Eastern fortress city",
    },
    "Гурьев": {
      subtitle: "Гурьев was a western city near the lower Ural and the route toward the Caspian.",
      short_description:
        "In 1868, Гурьев was an important western city connected with fishing, trade, and the fortified Ural line.",
      history_summary:
        "The city began as a fishing settlement founded by Mikhail Guryev and later became a fortress on the Ural line. In the second half of the 19th century, its role depended on its lower Ural location, closeness to the Caspian, and the fishing and trade life of the western region.",
      interesting_fact: "Modern Atyrau was long called Гурьев in the imperial and Soviet periods.",
      role: "Lower Ural trade city",
    },
    "Аулие-Ата": {
      subtitle: "Аулие-Ата was a southern city on the Talas and an uyezd center of the Syr Darya Oblast.",
      short_description:
        "In 1868, Аулие-Ата was an important southern city and an uyezd center in the Turkestan administration.",
      history_summary:
        "The city stood in the Talas valley on an important southern route. After the region entered the Turkestan Governor-Generalship, Аулие-Ата became the center of its own uyezd while preserving the importance of an old city tied to trade, roads, and southern economic life.",
      interesting_fact: "On October 21, 1868, the Aulie-Ata uyezd was formed with its center in Аулие-Ата.",
      role: "Southern uyezd center",
    },
    "Перовск": {
      subtitle: "Перовск was an uyezd center on the Syr Darya, grown from the former Ak-Mechet fortress.",
      short_description:
        "In 1868, Перовск was an important Syr Darya city and the administrative center of the Perovsk uyezd.",
      history_summary:
        "The city gained importance after Ak-Mechet was captured by the troops of V. A. Perovsky in 1853 and later renamed. In the Turkestan administration, Перовск became an uyezd center and an important point on the Syr Darya line.",
      interesting_fact: "Перовск grew from the Ak-Mechet fortress, captured by Russian troops in 1853.",
      role: "Syr Darya uyezd center",
    },
    "Акмолинск": {
      subtitle: "Акмолинск was the main city of Akmolinsk uyezd on the Ishim and a caravan point.",
      short_description:
        "In 1868, Акмолинск was an important steppe city on the Ishim and the main city of Akmolinsk uyezd.",
      history_summary:
        "After the Akmolinsk Oblast was established, Акмолинск remained the main city of its uyezd, while the oblast center was in Omsk. The city stood on the Ishim, was linked by road with other steppe towns, and served as a gathering point for caravans from Tashkent and Bukhara.",
      interesting_fact:
        "In 1868, Акмолинск was the main city of its uyezd, while the oblast center remained Omsk.",
      role: "Steppe caravan point",
    },
    "Туркестан": {
      subtitle: "Туркестан was an ancient southern city, uyezd center, and religious landmark.",
      short_description:
        "In 1868, Туркестан kept its role as an ancient southern city tied to administration, trade, and spiritual memory.",
      history_summary:
        "Туркестан, also known as Yasy, was an old center of caravan trade and spiritual life in the south. After coming under Russian rule in 1864, it entered the Turkestan administration and remained an important uyezd city of the Syr Darya Oblast.",
      interesting_fact: "Туркестан was also known by the historical name Yasy.",
      role: "Ancient southern center",
    },
    "Казалинск": {
      subtitle: "Казалинск was a lower Syr Darya city and an uyezd center near the Aral direction.",
      short_description:
        "In 1868, Казалинск was an important city of the lower Syr Darya and the center of Kazalinsk uyezd.",
      history_summary:
        "The city on the lower Syr Darya grew from Fort No. 1 and became part of the Syr Darya Oblast of the Turkestan Governor-Generalship. Its importance came from its river location, routes toward the Aral area, and uyezd functions in a sparsely populated but strategic region.",
      interesting_fact: "The early name of the city was connected with Fort No. 1 on the Syr Darya line.",
      role: "Lower Syr Darya center",
    },
    "Чимкент": {
      subtitle: "Чимкент was a southern city on a caravan route and an uyezd center of the Syr Darya Oblast.",
      short_description:
        "In 1868, Чимкент was an important southern city connected with trade, crafts, and uyezd administration.",
      history_summary:
        "The city stood on an old caravan route and in the 19th century belonged to the southern urban network connected with Kokand and then Russia. After Russian troops took it in 1864, Чимкент entered the Turkestan administration and became an uyezd center of the Syr Darya Oblast.",
      interesting_fact: "Чимкент was taken by Russian troops in 1864.",
      role: "Southern caravan city",
    },
  },
  kk: {
    "Верный": {
      subtitle: "Верный Заилий Алатауы етегіндегі Жетісу облысының әкімшілік орталығы болды.",
      short_description:
        "1868 жылы Верный Жетісудың басты қаласы және оңтүстік-шығыстағы маңызды басқару тірегі болды.",
      history_summary:
        "Қала Заилийск бекінісінен өсіп, 1860-жылдардың соңына қарай Түркістан генерал-губернаторлығындағы Жетісу облысының орталығына айналды. Тау етегіндегі орны, көшпелі және отырықшы аймақтармен байланысы, Құлжаға баратын жолдар оны маңызды әкімшілік және сауда қаласы етті.",
      interesting_fact: "Қазіргі Алматы империялық кезеңде Верный деп аталды.",
      role: "Жетісу әкімшілік орталығы",
    },
    "Семипалатинск": {
      subtitle: "Семипалатинск Ертіс бойындағы облыс орталығы және шығыстың ірі сауда қаласы болды.",
      short_description:
        "1868 жылы Семипалатинск шығыс Қазақстандағы облыстық қала және Ертістегі басты сауда орталықтарының бірі болды.",
      history_summary:
        "Қала орыс бекінісі ретінде құрылып, кейін су тасқынынан қорғану үшін қазіргі орнына көшірілді. XIX ғасырдың соңына қарай ол Ертіспен және Сібір, Орта Азия, Қытай арасындағы керуен жолдарымен байланысты облыс орталығы ретінде дамыды.",
      interesting_fact:
        "Семипалатинск атауы алғашқы бекініс маңындағы «Жеті палата» қирандыларымен байланысты.",
      role: "Ертіс сауда орталығы",
    },
    "Петропавловск": {
      subtitle: "Петропавловск Есіл бойындағы солтүстік сауда қаласы және дала жолдарының торабы болды.",
      short_description:
        "1868 жылы Петропавловск солтүстік Қазақстанның көрнекті сауда орталығы және дала мен Орта Азияға шығатын маңызды нүкте болды.",
      history_summary:
        "Қала Есіл бойындағы орыс бекінісі ретінде пайда болып, тез арада маңызды сауда пунктіне айналды. XIX ғасырдың екінші жартысында оның маңызын Ресеймен байланыс, дала аудандары және Орта Азияға бағытталған керуен саудасы күшейтті.",
      interesting_fact: "Петропавловск 1752 жылы орыс бекінісі ретінде құрылған.",
      role: "Солтүстік сауда торабы",
    },
    "Уральск": {
      subtitle: "Уральск Жайық өзеніндегі Орал облысының әкімшілік орталығы болды.",
      short_description:
        "1868 жылы Уральск батыс шекаралық өңірдің басты қаласы және Жайық бойындағы маңызды сауда орталығы болды.",
      history_summary:
        "Қала 1775 жылғы атау өзгерісіне дейін Яицкий городок деп аталды. XIX ғасырдың екінші жартысында Уральск Орал облысының орталығы болып, Ресейдің еуропалық бөлігімен, әсіресе Жайық балығы және дала мал шаруашылығы өнімдері арқылы белсенді сауда жүргізді.",
      interesting_fact: "1775 жылға дейін қала Яицкий городок деп аталды.",
      role: "Батыс облыс орталығы",
    },
    "Усть-Каменогорск": {
      subtitle: "Усть-Каменогорск Ертіс пен Үлбі маңындағы, Рудный Алтаймен байланысты шығыс қала болды.",
      short_description:
        "1868 жылы Усть-Каменогорск кенді Алтай жолдары және шекаралық саудамен байланысты маңызды шығыс қала болды.",
      history_summary:
        "Қала Ертіс пен Үлбі қосылған жерде орыс бекінісі ретінде құрылды. Кейінгі империялық кезеңде оның маңызын Рудный Алтайға жақындық, тау аудандарына баратын жолдар және Шығыс Қазақстан, Моңғолия, Қытаймен сауда байланыстары айқындады.",
      interesting_fact: "Усть-Каменогорск 1720 жылы құрылған орыс бекінісінен өсті.",
      role: "Шығыс бекініс қаласы",
    },
    "Гурьев": {
      subtitle: "Гурьев Жайықтың төменгі ағысы мен Каспий бағытына жақын батыс қала болды.",
      short_description:
        "1868 жылы Гурьев балықшылық, сауда және Жайық бойындағы бекініс желісімен байланысты маңызды батыс қала болды.",
      history_summary:
        "Қала Михаил Гурьев негізін қалаған балықшы қонысы ретінде пайда болып, кейін Жайық желісіндегі бекініске айналды. XIX ғасырдың екінші жартысында оның маңызын Жайықтың төменгі ағысы, Каспийге жақындық және батыс өлкенің балықшылық пен сауда өмірі айқындады.",
      interesting_fact: "Қазіргі Атырау империялық және кеңестік кезеңде ұзақ уақыт Гурьев деп аталды.",
      role: "Төменгі Жайық сауда қаласы",
    },
    "Аулие-Ата": {
      subtitle: "Аулие-Ата Талас өзеніндегі оңтүстік қала және Сырдария облысының уездік орталығы болды.",
      short_description:
        "1868 жылы Аулие-Ата Түркістан өлкесінің басқару жүйесіндегі маңызды оңтүстік қала және уездік орталық болды.",
      history_summary:
        "Қала Талас аңғарында, маңызды оңтүстік бағытта орналасқан. Аймақ Түркістан генерал-губернаторлығы құрамына кіргеннен кейін Аулие-Ата өз уезінің орталығы болып, сауда, жолдар және оңтүстіктің шаруашылық өмірімен байланысты көне қала ретіндегі маңызын сақтады.",
      interesting_fact: "1868 жылғы 21 қазанда орталығы Аулие-Ата болған Аулие-Ата уезі құрылды.",
      role: "Оңтүстік уездік орталық",
    },
    "Перовск": {
      subtitle: "Перовск Сырдария бойындағы уездік орталық, бұрынғы Ақ-Мешіт бекінісінен өскен қала болды.",
      short_description:
        "1868 жылы Перовск Сырдариядағы маңызды қала және Перовск уезінің әкімшілік орталығы болды.",
      history_summary:
        "Қала 1853 жылы В. А. Перовский әскерлері Ақ-Мешітті алғаннан кейін маңызға ие болып, кейін қайта аталды. Түркістан өлкесінің басқару жүйесінде Перовск уездік орталық және Сырдария желісіндегі маңызды пункт болды.",
      interesting_fact: "Перовск 1853 жылы орыс әскерлері алған Ақ-Мешіт бекінісінен өсті.",
      role: "Сырдария уездік орталығы",
    },
    "Акмолинск": {
      subtitle: "Акмолинск Есіл бойындағы Ақмола уезінің басты қаласы және даладағы керуен пункті болды.",
      short_description:
        "1868 жылы Акмолинск Есіл бойындағы маңызды дала қаласы және Ақмола уезінің басты қаласы болды.",
      history_summary:
        "Ақмола облысы құрылғаннан кейін Акмолинск аттас уездің басты қаласы болып қалды, ал облыс орталығы Омбыда орналасты. Қала Есіл бойында тұрды, басқа дала қалаларымен жол арқылы байланысып, Ташкент пен Бұхарадан келетін керуендердің жиналу орны болды.",
      interesting_fact:
        "1868 жылы Акмолинск уездің басты қаласы болды, ал облыс орталығы Омбы болып қалды.",
      role: "Дала керуен пункті",
    },
    "Туркестан": {
      subtitle: "Туркестан көне оңтүстік қала, уездік орталық және діни бағдар болды.",
      short_description:
        "1868 жылы Туркестан уездік басқару, сауда және рухани жадпен байланысты көне оңтүстік қала ретіндегі маңызын сақтады.",
      history_summary:
        "Ясы атымен де белгілі Туркестан оңтүстіктегі керуен саудасы мен рухани өмірдің көне орталығы болды. 1864 жылы Ресей билігіне өткеннен кейін ол Түркістан өлкесінің жүйесіне кіріп, Сырдария облысының маңызды уездік қаласы болып қалды.",
      interesting_fact: "Туркестан Ясы деген тарихи атаумен де белгілі болды.",
      role: "Көне оңтүстік орталық",
    },
    "Казалинск": {
      subtitle: "Казалинск төменгі Сырдариядағы қала және Арал бағытына жақын уездік орталық болды.",
      short_description:
        "1868 жылы Казалинск төменгі Сырдариядағы маңызды қала және Казалинск уезінің орталығы болды.",
      history_summary:
        "Төменгі Сырдариядағы қала №1 форттан өсіп, Түркістан генерал-губернаторлығындағы Сырдария облысының жүйесіне кірді. Оның маңызын өзен бойындағы орны, Арал бағытына апаратын жолдар және сирек қоныстанған, бірақ стратегиялық өңірдегі уездік қызметтер айқындады.",
      interesting_fact: "Қаланың ерте атауы Сырдария желісіндегі №1 фортпен байланысты болды.",
      role: "Төменгі Сырдария орталығы",
    },
    "Чимкент": {
      subtitle: "Чимкент керуен жолындағы оңтүстік қала және Сырдария облысының уездік орталығы болды.",
      short_description:
        "1868 жылы Чимкент сауда, қолөнер және уездік басқарумен байланысты маңызды оңтүстік қала болды.",
      history_summary:
        "Қала ескі керуен жолында орналасып, XIX ғасырда Қоқанмен, кейін Ресеймен байланысты оңтүстік қалалар жүйесіне кірді. 1864 жылы орыс әскерлері алғаннан кейін Чимкент Түркістан өлкесіне кіріп, Сырдария облысының уездік орталығына айналды.",
      interesting_fact: "Чимкентті орыс әскерлері 1864 жылы алды.",
      role: "Оңтүстік керуен қаласы",
    },
  },
};

const soviet1925CityContentTranslations = {
  en: {
    "Кызылорда": {
      subtitle: "Кзыл-Орда was the capital of the Kazak ASSR on the Syr Darya.",
      short_description:
        "In 1925, Кзыл-Орда was the capital of the Kazak ASSR and the main political center of the republic.",
      history_summary:
        "In 1925, the city on the Syr Darya received capital status and became central to the first decisions of early Soviet Kazakhstan. Republican affairs were directed from here before the capital moved to Alma-Ata.",
      interesting_fact: "On the 1925 map, the capital is marked as Кзыл-Орда.",
      role: "Early Soviet capital",
    },
    "Алматы": {
      subtitle: "Алма-Ата was a large southeastern city near the Trans-Ili Alatau.",
      short_description:
        "In 1925, Алма-Ата was an important center of Zhetysu and one of the most notable cities in the southeast.",
      history_summary:
        "After being renamed from Верный, the city quickly strengthened its role in Zhetysu. In 1925, Алма-Ата was not yet the capital, but it already played a major role in the administrative and economic life of the southeast.",
      interesting_fact: "The name Алма-Ата was already used on the 1925 map.",
      role: "Southeastern regional center",
    },
    "Семей": {
      subtitle: "Семипалатинск was an important eastern city on the Irtysh.",
      short_description:
        "In 1925, Семипалатинск remained a major trading and cultural city of eastern Kazakhstan.",
      history_summary:
        "The city on the Irtysh had long been an important point of trade and regional connections. In 1925, Семипалатинск kept its role as a notable cultural and economic center in the eastern part of the republic.",
      interesting_fact: "On the 1925 map, the city is shown with the old form Семипалатинск.",
      role: "Eastern cultural city",
    },
    "Петропавл": {
      subtitle: "Петропавловск was a northern city on the Ishim and the railway.",
      short_description:
        "In 1925, Петропавловск was an important transport and trade hub of northern Kazakhstan.",
      history_summary:
        "The city served the northern grain belt and railway connections of the republic. In 1925, Петропавловск remained one of the key cities of the northern direction.",
      interesting_fact: "On the 1925 map, the city is shown as Петропавловск.",
      role: "Northern transport hub",
    },
    "Орал": {
      subtitle: "Уральск was a western city on the Ural River.",
      short_description:
        "In 1925, Уральск remained an important western trading and administrative city.",
      history_summary:
        "The city on the Ural connected western districts of the republic with border routes. In 1925, Уральск kept its role as a notable center of the western region.",
      interesting_fact: "The 1925 map uses the historical form Уральск.",
      role: "Western regional city",
    },
    "Актобе": {
      subtitle: "Актюбинск was a western city on the Ilek River.",
      short_description:
        "In 1925, Актюбинск was a notable western center of industry and transport.",
      history_summary:
        "The city connected western districts of the republic with roads and economic routes. In 1925, Актюбинск strengthened its role as an industrial and railway hub.",
      interesting_fact: "On the 1925 map, the city is signed as Актюбинск.",
      role: "Western transport center",
    },
    "Павлодар": {
      subtitle: "Павлодар was a large Irtysh city in the northeast of the republic.",
      short_description:
        "In 1925, Павлодар was an important industrial and transport center of the Irtysh region.",
      history_summary:
        "The city on the Irtysh connected the northeast of the republic with river and land routes. In 1925, Павлодар was already a notable economic center of the Irtysh area.",
      interesting_fact: "On the 1925 map, Павлодар already appears under a name familiar today.",
      role: "Irtysh economic center",
    },
    "Оскемен": {
      subtitle: "Усть-Каменогорск was an eastern city near the Irtysh and Ulba.",
      short_description:
        "In 1925, Усть-Каменогорск was an important eastern city near rivers and mountain districts.",
      history_summary:
        "The city held a notable place in the east thanks to its position at the meeting of the Irtysh and Ulba. In 1925, Усть-Каменогорск was linked with the mining and mountain direction of eastern Kazakhstan.",
      interesting_fact: "The 1925 map uses the Russian form Усть-Каменогорск.",
      role: "Eastern mountain gateway",
    },
    "Тараз": {
      subtitle: "Аулие-Ата was an ancient southern city on the Talas River.",
      short_description:
        "In 1925, Аулие-Ата remained an important southern city with ancient history and trade links.",
      history_summary:
        "The city on the Talas preserved the memory of its ancient past and served as a notable center of the south. In 1925, it was still marked on the map as Аулие-Ата, not as the future Тараз.",
      interesting_fact: "On the 1925 map, the city is signed as Аулие-Ата.",
      role: "Ancient southern city",
    },
    "Атырау": {
      subtitle: "Гурьев was a western city near the Ural River and the Caspian route.",
      short_description:
        "In 1925, Гурьев was an important western city connected with the Ural, fishing, and the Caspian direction.",
      history_summary:
        "The city near the lower Ural played a notable role in the west of the republic. In 1925, Гурьев was associated with the river, fishing, trade, and roads toward the Caspian Sea.",
      interesting_fact: "The 1925 map uses the historical name Гурьев.",
      role: "Caspian direction city",
    },
    "Астана": {
      subtitle: "Акмолинск was a northern steppe city on the Ishim.",
      short_description:
        "In 1925, Акмолинск was an important northern city of the steppe region and agricultural belt.",
      history_summary:
        "The city on the Ishim served the northern steppe region and the economic ties of a wide district. In 1925, Акмолинск was not yet a capital, but it remained a notable northern center.",
      interesting_fact: "On the 1925 map, present-day Астана is signed as Акмолинск.",
      role: "Northern steppe center",
    },
    "Костанай": {
      subtitle: "Кустанай was a northern city on the Tobol and an important steppe economy center.",
      short_description:
        "In 1925, Кустанай was an important northern city of the grain region and trade roads of steppe Kazakhstan.",
      history_summary:
        "The city on the Tobol served the northern agricultural belt and connected steppe districts with trade and roads. In 1925, Кустанай kept its role as a notable center in the northern part of the republic.",
      interesting_fact: "The 1925 map uses the spelling Кустанай, not the modern Костанай.",
      role: "Northern grain center",
    },
    "Шымкент": {
      subtitle: "Чимкент was a large southern city near the Turkestan-route roads.",
      short_description:
        "In 1925, Чимкент was one of the notable cities of southern Kazakhstan and an important center of trade and crafts.",
      history_summary:
        "The southern city kept its role on routes between the Syr Darya, the Tashkent direction, and ancient centers of the region. In 1925, Чимкент was associated with markets, crafts, and active urban life in the south.",
      interesting_fact: "On the 1925 map, the city is signed as Чимкент, not Шымкент.",
      role: "Southern trade city",
    },
  },
  kk: {
    "Кызылорда": {
      subtitle: "Кзыл-Орда Сырдария бойындағы Қазақ АКСР астанасы болды.",
      short_description:
        "1925 жылы Кзыл-Орда Қазақ АКСР-інің астанасы және республиканың басты саяси орталығы болды.",
      history_summary:
        "1925 жылы Сырдария бойындағы қала астаналық мәртебе алып, ерте кеңестік Қазақстанның алғашқы шешімдерінің орталығына айналды. Республика істері астана Алма-Атаға көшкенге дейін осы жерден басқарылды.",
      interesting_fact: "1925 жылғы картада астана «Кзыл-Орда» атауымен көрсетілген.",
      role: "Ерте кеңестік астана",
    },
    "Алматы": {
      subtitle: "Алма-Ата Заилий Алатауы етегіндегі ірі оңтүстік-шығыс қала болды.",
      short_description:
        "1925 жылы Алма-Ата Жетісудың маңызды орталығы және республиканың оңтүстік-шығысындағы ең көрнекті қалалардың бірі болды.",
      history_summary:
        "Верный атауынан кейін қала Жетісудағы маңызын тез күшейтті. 1925 жылы Алма-Ата әлі астана болмағанымен, оңтүстік-шығыстың әкімшілік және шаруашылық өмірінде үлкен рөл атқарды.",
      interesting_fact: "«Алма-Ата» атауы 1925 жылғы картада қолданылған.",
      role: "Оңтүстік-шығыс өңір орталығы",
    },
    "Семей": {
      subtitle: "Семипалатинск Ертіс бойындағы маңызды шығыс қала болды.",
      short_description:
        "1925 жылы Семипалатинск шығыс Қазақстанның ірі сауда және мәдени қаласы болып қалды.",
      history_summary:
        "Ертіс бойындағы қала ұзақ уақыт бойы сауда мен шығыс өңір байланыстарының маңызды нүктесі болды. 1925 жылы Семипалатинск республиканың шығыс бөлігіндегі көрнекті мәдени және шаруашылық орталық рөлін сақтады.",
      interesting_fact: "1925 жылғы картада қала ескі «Семипалатинск» түрінде көрсетілген.",
      role: "Шығыс мәдени қаласы",
    },
    "Петропавл": {
      subtitle: "Петропавловск Есіл мен теміржол бойындағы солтүстік қала болды.",
      short_description:
        "1925 жылы Петропавловск солтүстік Қазақстанның маңызды көлік және сауда торабы болды.",
      history_summary:
        "Қала республиканың солтүстік астық белдеуіне және теміржол байланыстарына қызмет етті. 1925 жылы Петропавловск солтүстік бағыттағы негізгі қалалардың бірі болып қалды.",
      interesting_fact: "1925 жылғы картада қала «Петропавловск» атауымен көрсетілген.",
      role: "Солтүстік көлік торабы",
    },
    "Орал": {
      subtitle: "Уральск Жайық өзеніндегі батыс қала болды.",
      short_description:
        "1925 жылы Уральск маңызды батыс сауда және әкімшілік қаласы болып қалды.",
      history_summary:
        "Жайық бойындағы қала республиканың батыс аудандарын шекаралық бағыттармен байланыстырды. 1925 жылы Уральск батыс өңірдің көрнекті орталығы рөлін сақтады.",
      interesting_fact: "1925 жылғы картада тарихи «Уральск» түрі қолданылған.",
      role: "Батыс өңір қаласы",
    },
    "Актобе": {
      subtitle: "Актюбинск Елек өзеніндегі батыс қала болды.",
      short_description:
        "1925 жылы Актюбинск өнеркәсіп пен көліктің көрнекті батыс орталығы болды.",
      history_summary:
        "Қала республиканың батыс аудандарын жолдармен және шаруашылық бағыттарымен байланыстырды. 1925 жылы Актюбинск өнеркәсіптік және теміржол торабы ретіндегі маңызын күшейтті.",
      interesting_fact: "1925 жылғы картада қала «Актюбинск» деп жазылған.",
      role: "Батыс көлік орталығы",
    },
    "Павлодар": {
      subtitle: "Павлодар республиканың солтүстік-шығысындағы Ертіс бойындағы ірі қала болды.",
      short_description:
        "1925 жылы Павлодар Ертіс өңірінің маңызды өнеркәсіп және көлік орталығы болды.",
      history_summary:
        "Ертіс бойындағы қала республиканың солтүстік-шығысын өзен және құрлық жолдарымен байланыстырды. 1925 жылы Павлодар Ертіс өңірінің көрнекті шаруашылық орталығы еді.",
      interesting_fact: "1925 жылғы картада Павлодар қазіргі оқырманға таныс атаумен көрсетілген.",
      role: "Ертіс шаруашылық орталығы",
    },
    "Оскемен": {
      subtitle: "Усть-Каменогорск Ертіс пен Үлбі маңындағы шығыс қала болды.",
      short_description:
        "1925 жылы Усть-Каменогорск өзендер мен таулы өлке жанындағы маңызды шығыс қала болды.",
      history_summary:
        "Қала Ертіс пен Үлбі қосылған жердегі орны арқылы республиканың шығысында көрнекті орын алды. 1925 жылы Усть-Каменогорск Шығыс Қазақстанның кенді және таулы бағытымен байланыстырылды.",
      interesting_fact: "1925 жылғы картада орысша «Усть-Каменогорск» түрі қолданылған.",
      role: "Шығыс тау қақпасы",
    },
    "Тараз": {
      subtitle: "Аулие-Ата Талас өзеніндегі көне оңтүстік қала болды.",
      short_description:
        "1925 жылы Аулие-Ата ежелгі тарихы және сауда байланыстары бар маңызды оңтүстік қала болып қалды.",
      history_summary:
        "Талас бойындағы қала ежелгі өткеннің жадын сақтап, республиканың оңтүстігіндегі көрнекті орталық болды. 1925 жылы картада ол болашақ Тараз емес, әлі де Аулие-Ата деп көрсетілді.",
      interesting_fact: "1925 жылғы картада қала «Аулие-Ата» деп жазылған.",
      role: "Көне оңтүстік қала",
    },
    "Атырау": {
      subtitle: "Гурьев Жайық өзені мен Каспий бағытына жақын батыс қала болды.",
      short_description:
        "1925 жылы Гурьев Жайықпен, балықшылықпен және Каспий бағытымен байланысты маңызды батыс қала болды.",
      history_summary:
        "Жайықтың төменгі ағысы маңындағы қала республиканың батысында көрнекті рөл атқарды. 1925 жылы Гурьев өзенмен, балықпен, саудамен және Каспий теңізіне апаратын жолдармен байланыстырылды.",
      interesting_fact: "1925 жылғы картада тарихи «Гурьев» атауы қолданылған.",
      role: "Каспий бағыты қаласы",
    },
    "Астана": {
      subtitle: "Акмолинск Есіл бойындағы солтүстік дала қаласы болды.",
      short_description:
        "1925 жылы Акмолинск дала өңірі мен ауыл шаруашылығы белдеуінің маңызды солтүстік қаласы болды.",
      history_summary:
        "Есіл бойындағы қала солтүстік дала өңіріне және үлкен округтің шаруашылық байланыстарына қызмет етті. 1925 жылы Акмолинск әлі астана болмағанымен, көрнекті солтүстік орталық болып қалды.",
      interesting_fact: "1925 жылғы картада қазіргі Астана «Акмолинск» деп көрсетілген.",
      role: "Солтүстік дала орталығы",
    },
    "Костанай": {
      subtitle: "Кустанай Тобыл бойындағы солтүстік қала және дала шаруашылығының маңызды орталығы болды.",
      short_description:
        "1925 жылы Кустанай астық өңірі мен дала Қазақстанының сауда жолдарындағы маңызды солтүстік қала болды.",
      history_summary:
        "Тобыл бойындағы қала солтүстік ауыл шаруашылығы белдеуіне қызмет етіп, дала аудандарын сауда және жолдармен байланыстырды. 1925 жылы Кустанай республиканың солтүстік бөлігіндегі көрнекті орталық рөлін сақтады.",
      interesting_fact: "1925 жылғы картада қазіргі «Костанай» емес, «Кустанай» жазылуы қолданылған.",
      role: "Солтүстік астық орталығы",
    },
    "Шымкент": {
      subtitle: "Чимкент Түркістан бағыты жолдары маңындағы ірі оңтүстік қала болды.",
      short_description:
        "1925 жылы Чимкент оңтүстік Қазақстанның көрнекті қалаларының бірі және сауда мен қолөнердің маңызды орталығы болды.",
      history_summary:
        "Оңтүстік қала Сырдария, Ташкент бағыты және өңірдің көне орталықтары арасындағы жолдарда маңызын сақтады. 1925 жылы Чимкент базарлармен, қолөнермен және оңтүстіктің жанданған қала өмірімен байланыстырылды.",
      interesting_fact: "1925 жылғы картада қала «Шымкент» емес, ескі «Чимкент» түрінде көрсетілген.",
      role: "Оңтүстік сауда қаласы",
    },
  },
};

const independence1991CityContentTranslations = {
  en: {
    "Астана": {
      subtitle: "Целиноград on the Ishim before its future capital stage.",
      short_description:
        "In 1991, Целиноград was a large city of northern Kazakhstan and an important center of the steppe region.",
      history_summary:
        "In the year the USSR collapsed, the city was not yet the capital of the country. It was associated with the Virgin Lands legacy, northern agriculture, and the railway.",
      interesting_fact: "The name Akmola appeared after 1991, and Astana came even later.",
      role: "Northern steppe center",
    },
    "Алматы": {
      subtitle: "Алма-Ата was the republic's capital near the Trans-Ili Alatau.",
      short_description:
        "In 1991, Алма-Ата was the capital of the Kazakh SSR and then of independent Kazakhstan.",
      history_summary:
        "At the start of independence, the country's main state institutions worked here. The city remained the largest cultural, scientific, and business center of the republic.",
      interesting_fact: "The name Алматы became official after 1991.",
      role: "Capital city",
    },
    "Шымкент": {
      subtitle: "Чимкент was a large southern city near the Turkestan-route roads.",
      short_description:
        "In 1991, Чимкент was one of the largest cities of southern Kazakhstan and an important center of trade and industry.",
      history_summary:
        "The city served the southern region, linked roads toward Turkestan and Tashkent, and kept its role as a major industrial hub.",
      interesting_fact: "The form Шымкент became official later, while the 1991 map shows Чимкент.",
      role: "Southern industrial city",
    },
    "Актобе": {
      subtitle: "Актюбинск was a large western city on the Ilek River.",
      short_description:
        "In 1991, Актюбинск was a notable industrial center of western Kazakhstan and an important railway hub.",
      history_summary:
        "The city connected western parts of the country with central and northern routes. In the early 1990s, its industry, transport, and closeness to resource areas were especially important.",
      interesting_fact: "The modern form Актобе became established later than the spelling Актюбинск.",
      role: "Western industrial hub",
    },
    "Караганда": {
      subtitle: "Караганда was the main industrial city of central Kazakhstan.",
      short_description:
        "In 1991, Караганда remained one of the main industrial centers of Kazakhstan.",
      history_summary:
        "The city was closely tied to the coal basin, metallurgy, large factories, and central transport routes of the country.",
      interesting_fact: "Караганда is especially known for its coal basin.",
      role: "Central industrial city",
    },
    "Тараз": {
      subtitle: "Джамбул was a southern oblast center on the Talas River.",
      short_description:
        "In 1991, Джамбул was an important southern city with a very deep history.",
      history_summary:
        "The city on the Talas kept its role as an oblast center and recalled the ancient past of southern Kazakhstan. Later, its historical name Тараз would be restored.",
      interesting_fact:
        "The historical name Тараз would return later, while in 1991 the map signed the city as Джамбул.",
      role: "Southern oblast center",
    },
    "Павлодар": {
      subtitle: "Павлодар was a large industrial city on the Irtysh.",
      short_description:
        "In 1991, Павлодар was an important industrial and energy center of northeastern Kazakhstan.",
      history_summary:
        "Its location on the Irtysh helped the city remain a major production and transport hub. It was associated with factories, energy, and the Irtysh region.",
      interesting_fact: "Павлодар is associated with the Irtysh and northeastern industry.",
      role: "Northeastern industrial center",
    },
    "Оскемен": {
      subtitle: "Усть-Каменогорск was an eastern industrial city near the meeting of rivers.",
      short_description:
        "In 1991, Усть-Каменогорск was one of the main industrial centers of eastern Kazakhstan.",
      history_summary:
        "The city was associated with non-ferrous metallurgy, energy, and roads toward the Altai mountain districts. It remained the key hub of the eastern industrial region.",
      interesting_fact:
        "The modern Kazakh name Өскемен became common later, while the 1991 map shows Усть-Каменогорск.",
      role: "Eastern industrial hub",
    },
    "Семей": {
      subtitle: "Семипалатинск was a large historical city on the Irtysh.",
      short_description:
        "In 1991, Семипалатинск remained a well-known city of eastern Kazakhstan with rich cultural history.",
      history_summary:
        "The city on the Irtysh kept its role as a transport and cultural center of the east. It was often connected with Abai's name and the region's long history.",
      interesting_fact: "Later, the shorter name Семей would be restored for the city.",
      role: "Eastern cultural center",
    },
    "Атырау": {
      subtitle: "Гурьев was a western city near the Ural and the Caspian direction.",
      short_description:
        "In 1991, Гурьев was an important western city connected with oil, the Ural, and the Caspian.",
      history_summary:
        "The city near the lower Ural played a notable role in the oil region and western transport links. Later, the name Атырау would be restored.",
      interesting_fact: "The modern name Атырау became established after 1991.",
      role: "Western oil city",
    },
    "Костанай": {
      subtitle: "Кустанай was a northern oblast center of the grain region.",
      short_description:
        "In 1991, Кустанай was an important city of Kazakhstan's northern agricultural belt.",
      history_summary:
        "The city on the Tobol served the grain region, connected roads to the north, and remained a notable oblast center in the first years of independence.",
      interesting_fact: "The spelling later became fixed as Костанай.",
      role: "Northern grain center",
    },
    "Кызылорда": {
      subtitle: "Кзыл-Орда was an oblast center on the Syr Darya.",
      short_description:
        "In 1991, Кзыл-Орда remained an important city on the Syr Darya and recalled early Kazakh statehood.",
      history_summary:
        "The city on the Syr Darya served as an oblast center and remained known because it had already been the capital of the Kazak ASSR in the 1920s.",
      interesting_fact:
        "The modern spelling Кызылорда became established later than the form Кзыл-Орда shown on the 1991 map.",
      role: "Syr Darya oblast center",
    },
    "Орал": {
      subtitle: "Уральск was a western city on the Ural River.",
      short_description:
        "In 1991, Уральск remained an important western city with trade and border links.",
      history_summary:
        "The city on the Ural had long connected western parts of the country with border territories, trade, and transport. Later, the name Орал would strengthen in Kazakh usage.",
      interesting_fact: "Historically, this city traces back to Yaitsky Gorodok.",
      role: "Western border city",
    },
    "Петропавл": {
      subtitle: "Петропавловск was a northern city on the Ishim and the railway.",
      short_description:
        "In 1991, Петропавловск was an important transport and oblast center of northern Kazakhstan.",
      history_summary:
        "The city served the northern region, the grain belt, and railway directions. It remained a major center of the northern part of the country.",
      interesting_fact: "The modern short Kazakh form of the name is Петропавл.",
      role: "Northern transport center",
    },
    "Актау": {
      subtitle: "Актау was Kazakhstan's main sea city on the Caspian.",
      short_description:
        "In 1991, Актау was Kazakhstan's main seaport and an important city of the western coast.",
      history_summary:
        "The Caspian city was connected with the port, sea routes, and oil and gas logistics of western Kazakhstan. At the start of independence, its role in Caspian connections remained very visible.",
      interesting_fact: "The city was earlier known as Shevchenko, but the 1991 map already shows Актау.",
      role: "Caspian port city",
    },
  },
  kk: {
    "Астана": {
      subtitle: "Целиноград Есіл бойындағы, болашақ астаналық кезеңге дейінгі қала болды.",
      short_description:
        "1991 жылы Целиноград солтүстік Қазақстанның ірі қаласы және дала өңірінің маңызды орталығы болды.",
      history_summary:
        "КСРО тараған жылы қала әлі ел астанасы болған жоқ. Ол тың игеру тарихымен, солтүстік ауыл шаруашылығымен және теміржолмен байланысты болды.",
      interesting_fact: "Ақмола атауы 1991 жылдан кейін, ал Астана атауы одан да кейін пайда болды.",
      role: "Солтүстік дала орталығы",
    },
    "Алматы": {
      subtitle: "Алма-Ата Заилий Алатауы етегіндегі республиканың астанасы болды.",
      short_description:
        "1991 жылы Алма-Ата Қазақ КСР-інің, кейін тәуелсіз Қазақстанның астанасы болды.",
      history_summary:
        "Тәуелсіздіктің басында елдің басты мемлекеттік мекемелері осы жерде жұмыс істеді. Қала республиканың ең ірі мәдени, ғылыми және іскерлік орталығы болып қалды.",
      interesting_fact: "Алматы атауы 1991 жылдан кейін ресми болды.",
      role: "Астана қаласы",
    },
    "Шымкент": {
      subtitle: "Чимкент Түркістан бағыты жолдары маңындағы ірі оңтүстік қала болды.",
      short_description:
        "1991 жылы Чимкент оңтүстік Қазақстанның ең ірі қалаларының бірі және сауда мен өнеркәсіптің маңызды орталығы болды.",
      history_summary:
        "Қала оңтүстік өңірге қызмет етіп, Түркістан мен Ташкент бағытына апаратын жолдарды байланыстырды және ірі өнеркәсіп торабы рөлін сақтады.",
      interesting_fact: "«Шымкент» түрі кейін ресми болды, ал 1991 жылғы картада «Чимкент» нұсқасы көрінеді.",
      role: "Оңтүстік өнеркәсіп қаласы",
    },
    "Актобе": {
      subtitle: "Актюбинск Елек өзеніндегі ірі батыс қала болды.",
      short_description:
        "1991 жылы Актюбинск батыс Қазақстанның көрнекті өнеркәсіп орталығы және маңызды теміржол торабы болды.",
      history_summary:
        "Қала елдің батыс аудандарын орталық және солтүстік бағыттармен байланыстырды. 1990-жылдардың басында оның өнеркәсібі, көлігі және шикізат аудандарына жақындығы маңызды болды.",
      interesting_fact: "Қазіргі «Актобе» түрі «Актюбинск» жазылуынан кейін орнықты.",
      role: "Батыс өнеркәсіп торабы",
    },
    "Караганда": {
      subtitle: "Караганда елдің орталық бөлігіндегі басты индустриялық қала болды.",
      short_description:
        "1991 жылы Караганда Қазақстанның басты өнеркәсіп орталықтарының бірі болып қалды.",
      history_summary:
        "Қала көмір бассейнімен, металлургиямен, ірі зауыттармен және елдің орталық көлік жолдарымен тығыз байланысты болды.",
      interesting_fact: "Караганда әсіресе көмір бассейнімен белгілі.",
      role: "Орталық индустриялық қала",
    },
    "Тараз": {
      subtitle: "Джамбул Талас өзеніндегі оңтүстік облыс орталығы болды.",
      short_description:
        "1991 жылы Джамбул өте терең тарихы бар маңызды оңтүстік қала болды.",
      history_summary:
        "Талас өзеніндегі қала облыс орталығы рөлін сақтап, Оңтүстік Қазақстанның көне өткенін еске салды. Кейін оған тарихи Тараз атауы қайтарылады.",
      interesting_fact:
        "Тараз тарихи атауы қалаға кейін қайтарылады, ал 1991 жылғы картада ол Джамбул деп көрсетілген.",
      role: "Оңтүстік облыс орталығы",
    },
    "Павлодар": {
      subtitle: "Павлодар Ертіс бойындағы ірі өнеркәсіп қаласы болды.",
      short_description:
        "1991 жылы Павлодар солтүстік-шығыс Қазақстанның маңызды өнеркәсіп және энергетика орталығы болды.",
      history_summary:
        "Ертіс бойындағы орны қалаға ірі өндірістік және көлік торабы болып қалуға көмектесті. Ол зауыттармен, энергетикамен және Ертіс өңірімен байланыстырылды.",
      interesting_fact: "Павлодар Ертіспен және елдің солтүстік-шығыс өнеркәсібімен байланыстырылады.",
      role: "Солтүстік-шығыс өнеркәсіп орталығы",
    },
    "Оскемен": {
      subtitle: "Усть-Каменогорск өзендер түйіскен жердегі шығыс өнеркәсіп қаласы болды.",
      short_description:
        "1991 жылы Усть-Каменогорск шығыс Қазақстанның басты индустриялық орталықтарының бірі болды.",
      history_summary:
        "Қала түсті металлургиямен, энергетикамен және Алтайдың таулы аудандарына апаратын жолдармен байланысты болды. Ол шығыс өнеркәсіп өңірінің басты торабы болып қалды.",
      interesting_fact:
        "Қазіргі қазақша Өскемен атауы кейін кеңірек қолданылды, ал 1991 жылғы картада Усть-Каменогорск нұсқасы көрінеді.",
      role: "Шығыс өнеркәсіп торабы",
    },
    "Семей": {
      subtitle: "Семипалатинск Ертіс бойындағы ірі тарихи қала болды.",
      short_description:
        "1991 жылы Семипалатинск бай мәдени тарихы бар шығыс Қазақстанның белгілі қаласы болып қалды.",
      history_summary:
        "Ертіс бойындағы қала шығыстың көлік және мәдени орталығы рөлін сақтады. Оны жиі Абай есімімен және өңірдің бай тарихымен байланыстырды.",
      interesting_fact: "Кейін қалаға қысқа Семей атауы қайтарылады.",
      role: "Шығыс мәдени орталығы",
    },
    "Атырау": {
      subtitle: "Гурьев Жайық пен Каспий бағыты маңындағы батыс қала болды.",
      short_description:
        "1991 жылы Гурьев мұнаймен, Жайықпен және Каспиймен байланысты маңызды батыс қала болды.",
      history_summary:
        "Жайықтың төменгі ағысындағы қала мұнайлы өңірде және батыс көлік байланыстарында көрнекті рөл атқарды. Кейін оған Атырау атауы қайтарылады.",
      interesting_fact: "Қазіргі Атырау атауы 1991 жылдан кейін орнықты.",
      role: "Батыс мұнай қаласы",
    },
    "Костанай": {
      subtitle: "Кустанай астық өңіріндегі солтүстік облыс орталығы болды.",
      short_description:
        "1991 жылы Кустанай Қазақстанның солтүстік ауыл шаруашылығы белдеуіндегі маңызды қала болды.",
      history_summary:
        "Тобыл бойындағы қала астық өңіріне қызмет етіп, солтүстік бағыттағы жолдарды байланыстырды және тәуелсіздіктің алғашқы жылдарында көрнекті облыс орталығы болып қалды.",
      interesting_fact: "Кейін атаудың жазылуы Костанай ретінде бекіді.",
      role: "Солтүстік астық орталығы",
    },
    "Кызылорда": {
      subtitle: "Кзыл-Орда Сырдария бойындағы облыс орталығы болды.",
      short_description:
        "1991 жылы Кзыл-Орда Сырдария бойындағы маңызды қала болып, қазақ мемлекеттілігінің ерте тарихын еске салды.",
      history_summary:
        "Сырдария бойындағы қала облыс орталығы қызметін атқарды және 1920-жылдары Қазақ АКСР-інің астанасы болғанымен белгілі болды.",
      interesting_fact:
        "Қазіргі Қызылорда жазылуы 1991 жылғы картадағы «Кзыл-Орда» түрінен кейін орнықты.",
      role: "Сырдария облыс орталығы",
    },
    "Орал": {
      subtitle: "Уральск Жайық өзеніндегі батыс қала болды.",
      short_description:
        "1991 жылы Уральск сауда және шекаралық байланыстары бар маңызды батыс қала болып қалды.",
      history_summary:
        "Жайық бойындағы қала ұзақ уақыт елдің батыс аудандарын шекаралық аумақтармен, саудамен және көлікпен байланыстырды. Кейін қазақ тіліндегі қолданыста Орал атауы нығаяды.",
      interesting_fact: "Тарихи тұрғыдан бұл қала Яицкий городоктан бастау алады.",
      role: "Батыс шекара қаласы",
    },
    "Петропавл": {
      subtitle: "Петропавловск Есіл мен теміржол бойындағы солтүстік қала болды.",
      short_description:
        "1991 жылы Петропавловск солтүстік Қазақстанның маңызды көлік және облыс орталығы болды.",
      history_summary:
        "Қала солтүстік өңірге, астық белдеуіне және теміржол бағыттарына қызмет етті. Ол елдің солтүстік бөлігіндегі ірі орталық болып қалды.",
      interesting_fact: "Атаудың қазіргі қысқа қазақша түрі - Петропавл.",
      role: "Солтүстік көлік орталығы",
    },
    "Актау": {
      subtitle: "Актау Каспийдегі Қазақстанның басты теңіз қаласы болды.",
      short_description:
        "1991 жылы Актау Қазақстанның басты теңіз порты және батыс жағалаудағы маңызды қала болды.",
      history_summary:
        "Каспийдегі қала портпен, теңіз бағытымен және батыс елдің мұнай-газ логистикасымен байланыстырылды. Тәуелсіздіктің басында оның Каспий байланыстарындағы рөлі өте маңызды болып қалды.",
      interesting_fact: "Бұрын қала Шевченко деп белгілі болды, бірақ 1991 жылғы картада Актау атауы көрінеді.",
      role: "Каспий порт қаласы",
    },
  },
};

const periodCityContentTranslations = {
  khanate_1465: khanateCityContentTranslations,
  imperial_1731: imperial1731CityContentTranslations,
  imperial_1868: imperial1868CityContentTranslations,
  soviet_1925: soviet1925CityContentTranslations,
  independence_1991: independence1991CityContentTranslations,
};

function translate(key, params = {}) {
  const value = translations[currentLanguage]?.[key] ?? translations.ru[key] ?? key;
  return typeof value === "function" ? value(params) : value;
}

function getLocalizedPeriodTitle(period) {
  if (!period) {
    return translate("no_period");
  }

  return periodTitleTranslations[currentLanguage]?.[period.code] || period.title;
}

function getLocalizedPeriodBadgeText(period) {
  if (!period) {
    return translate("historical_period");
  }

  return `${period.year_label} • ${getLocalizedPeriodTitle(period)}`;
}

function getLocalizedCityContent(content) {
  if (!content) {
    return content;
  }

  const translation =
    periodCityContentTranslations[state.selectedPeriodCode]?.[currentLanguage]?.[content.city];
  if (!translation) {
    return content;
  }

  return {
    ...content,
    ...translation,
    display_name: content.display_name,
    old_name: content.old_name,
  };
}

function getLocalizedCityRole(city, fallbackRole) {
  const role =
    periodCityContentTranslations[state.selectedPeriodCode]?.[currentLanguage]?.[city]?.role;
  if (role) return role;

  if (currentLanguage === "ru" && fallbackRole) {
    return fallbackRole;
  }

  return translate("city_role_default");
}

function applyStaticTranslations() {
  document.documentElement.lang = currentLanguage;
  document.title = translate("page_title");

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    if (element.closest("footer")) return;
    element.textContent = translate(element.dataset.i18n);
  });
}

function queryRequired(selector) {
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }

  return element;
}

function getCurrentPeriod() {
  return (
    state.bootstrap?.periods?.find((period) => period.code === state.selectedPeriodCode) ||
    null
  );
}

function getCurrentMapState() {
  return state.selectedPeriodCode ? state.mapStateCache[state.selectedPeriodCode] || null : null;
}

function getCurrentCityState() {
  const mapState = getCurrentMapState();
  if (!mapState || !state.selectedCity) {
    return null;
  }

  return mapState.cities.find((city) => city.city === state.selectedCity) || null;
}

function getVisibleSvgCitySet() {
  return new Set(getInteractiveSvgCities(elements.mapBackdrop));
}

function getCityContent(city) {
  if (!city || !state.selectedPeriodCode) {
    return null;
  }

  return state.cityContentCache[`${state.selectedPeriodCode}::${city}`] || null;
}

function getFactSessionForCurrentPeriod() {
  if (!state.factSession || state.factSession.period_code !== state.selectedPeriodCode) {
    return null;
  }

  return state.factSession;
}

function renderBootstrapSummary() {
  const summary = state.bootstrap?.player_summary;
  const mapSummary = getCurrentMapState()?.summary;
  const currentPeriod = getCurrentPeriod();
  const passedTests =
    mapSummary?.cities_passed ??
    currentPeriod?.passed_cities ??
    summary?.total_passed_tests ??
    0;
  const totalTests =
    mapSummary?.total_cities ??
    currentPeriod?.total_cities ??
    state.bootstrap?.available_cities_for_default_period?.length ??
    0;

  setText(
    elements.playerSummaryTests,
    `${passedTests} / ${totalTests}`
  );
  setText(
    elements.playerSummaryAchievements,
    String(summary?.total_achievements_unlocked ?? 0)
  );

  const preview = state.bootstrap?.achievements_preview ?? [];
  if (preview.length === 0) {
    setHtml(
      elements.achievementPreview,
      `<p class="text-xs text-on-surface-variant">${escapeHtml(translate("achievements_empty"))}</p>`
    );
    return;
  }

  setHtml(
    elements.achievementPreview,
    preview
      .slice(0, 2)
      .map(
        (achievement) =>
          `<span class="bg-surface-container text-on-surface-variant px-2.5 py-1 rounded-full text-[10px] font-semibold">${escapeHtml(
            achievement.name
          )}</span>`
      )
      .join("")
  );
}

function renderTimeline() {
  const periods = (state.bootstrap?.periods || []).slice().sort((a, b) => a.sort_order - b.sort_order);
  const activeIndex = periods.findIndex((period) => period.code === state.selectedPeriodCode);

  if (periods.length === 0) {
    setHtml(elements.timelinePoints, "");
    return;
  }

  const fillPercent =
    periods.length === 1 ? 100 : Math.max(0, (activeIndex / (periods.length - 1)) * 100);
  elements.timelineFill.style.width = `${fillPercent}%`;
  setText(
    elements.activeEraLabel,
    translate("active_period_value", {
      title: getLocalizedPeriodTitle(getCurrentPeriod()),
    })
  );

  const fragment = document.createDocumentFragment();

  periods.forEach((period, index) => {
    const active = period.code === state.selectedPeriodCode;
    const locked = !period.is_unlocked;
    const tooltipPositionClass =
      index === 0
        ? "left-0"
        : index === 1
          ? "left-1/2 -translate-x-[18%]"
          : index === periods.length - 1
            ? "right-0"
            : index === periods.length - 2
              ? "left-1/2 -translate-x-[82%]"
              : "left-1/2 -translate-x-1/2";
    const button = createElementFromHtml(`
      <button type="button" class="relative group ${
        locked ? "cursor-not-allowed" : "cursor-pointer"
      } z-10 flex flex-col items-center bg-transparent" aria-disabled="${locked ? "true" : "false"}">
        <div class="${
          active
            ? "w-7 h-7 bg-secondary-container rounded-full ring-[3px] ring-white shadow-md scale-110 z-10 flex items-center justify-center"
            : locked
              ? "w-[18px] h-[18px] bg-outline/80 rounded-full ring-[3px] ring-white shadow-md flex items-center justify-center"
              : "w-[18px] h-[18px] bg-primary rounded-full ring-[3px] ring-white shadow-md hover:scale-110 transition-transform"
        }">
          ${
            active
              ? '<span class="material-symbols-outlined text-secondary text-xs fill-icon">stars</span>'
              : locked
                ? '<span class="material-symbols-outlined text-white text-[11px] fill-icon">lock</span>'
              : ""
          }
        </div>
        ${
          active
            ? ""
            : `<div class="pointer-events-none absolute bottom-full mb-3 ${tooltipPositionClass} z-30 w-[12rem] opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 bg-white text-on-surface text-[11px] px-3.5 py-3 rounded-xl whitespace-normal text-center shadow-[0_18px_40px_rgba(46,47,45,0.18)] border border-outline-variant/20">
                <div class="font-bold leading-tight text-[11px]">${escapeHtml(getLocalizedPeriodTitle(period))}</div>
                ${
                  locked
                    ? `<div class="mt-2 text-[10px] leading-relaxed text-on-surface-variant font-medium">${escapeHtml(translate("locked_period_tooltip"))}</div>`
                    : ""
                }
              </div>`
        }
        <div class="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[9px] font-bold ${
          active ? "text-secondary" : locked ? "text-outline/80" : "text-outline"
        } uppercase tracking-wider">${escapeHtml(period.year_label)}</div>
      </button>
    `);

    button.addEventListener("click", () => {
      if (period.code === state.selectedPeriodCode) {
        return;
      }
      if (locked) {
        setStatusMessage(
          translate("locked_period_status"),
          "warning"
        );
        return;
      }

      state.selectedPeriodCode = period.code;
      setLastPeriodCode(period.code);

      const restoredFactSession = getActiveFactSession();
      if (restoredFactSession?.period_code !== period.code) {
        clearActiveFactSession();
        state.factSession = null;
        state.factResult = null;
      }

      loadMapState(period.code).catch(showGlobalError);
    });

    fragment.appendChild(button);
  });

  elements.timelinePoints.replaceChildren(fragment);
}

function renderMapBackground() {
  elements.mapBackdrop.style.backgroundImage = "none";
  elements.mapBackdrop.style.opacity = "1";
}

async function syncMapSurface(periodCode) {
  if (hasPeriodSvgMap(periodCode)) {
    await mountPeriodSvgMap(elements.mapBackdrop, periodCode, (city) => {
      handleCityInteraction(city).catch(showGlobalError);
    });
    setVisible(elements.markerLayer, false);
    return;
  }

  clearPeriodSvgMap(elements.mapBackdrop);
  setVisible(elements.markerLayer, true);
}

async function handleCityInteraction(city) {
  const factSession = getFactSessionForCurrentPeriod();

  if (factSession) {
    if (!factSession.candidate_cities.includes(city)) {
      setStatusMessage(
        translate("fact_candidate_warning"),
        "warning"
      );
      return;
    }

    await submitFactChallenge(city);
    return;
  }

  await selectCity(city);
}

function renderMarkers() {
  const mapState = getCurrentMapState();
  if (!mapState) {
    setHtml(elements.markerLayer, "");
    return;
  }

  const factSession = getFactSessionForCurrentPeriod();

  if (hasPeriodSvgMap(state.selectedPeriodCode)) {
    setHtml(elements.markerLayer, "");
    setVisible(elements.markerLayer, false);
    updatePeriodSvgMapState(elements.mapBackdrop, {
      activeCity: state.selectedCity,
      factSession,
      mapState,
    });
    return;
  }

  setVisible(elements.markerLayer, true);
  const activeCity = state.selectedCity;
  const fragment = document.createDocumentFragment();

  mapState.cities.forEach((cityState) => {
    const visual = getCityVisual(cityState.city);
    if (!visual) {
      return;
    }

    const isActive = activeCity === cityState.city;
    const isFactCandidate = Boolean(
      factSession?.candidate_cities?.includes(cityState.city)
    );
    const isDimmed = Boolean(
      factSession && factSession.candidate_cities && !isFactCandidate
    );
    const passed =
      cityState.passed_quiz_in_this_period ||
      cityState.has_fact_success_in_this_period ||
      cityState.unlocked_city_achievement;

    const marker = createElementFromHtml(`
      <div class="absolute z-10 ${isDimmed ? "opacity-35" : ""}" style="top:${visual.top}%; left:${visual.left}%;">
        <div class="relative">
          ${
            isActive || isFactCandidate
              ? '<div class="absolute -inset-2 bg-primary/20 rounded-full animate-ping"></div>'
              : ""
          }
          <button type="button" class="${
            isActive
              ? "bg-secondary-container text-on-secondary-container p-3 rounded-full shadow-lg border-[3px] border-white hover:scale-105 transition-transform"
              : passed
                ? "bg-tertiary-container text-on-tertiary-container p-2 rounded-full shadow-lg hover:scale-105 transition-transform"
                : "bg-primary text-on-primary p-2 rounded-full shadow-lg hover:scale-105 transition-transform active:scale-90"
          }">
            <span class="material-symbols-outlined text-[18px] ${
              isActive || passed || isFactCandidate ? "fill-icon" : ""
            }">${getMarkerIcon(cityState, factSession)}</span>
          </button>
          <div class="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 bg-surface-container-lowest px-2.5 py-1 rounded-full shadow-sm ${
            isActive ? "ring-2 ring-secondary" : ""
          }">
            <span class="text-[10px] font-bold ${
              isActive
                ? "text-secondary"
                : passed
                  ? "text-tertiary"
                  : "text-primary"
            }">${escapeHtml(cityState.display_name)}</span>
          </div>
        </div>
      </div>
    `);

    marker.querySelector("button").addEventListener("click", () => {
      handleCityInteraction(cityState.city).catch(showGlobalError);
      return;

      if (factSession) {
        if (!factSession.candidate_cities.includes(cityState.city)) {
          setStatusMessage(
            translate("fact_candidate_warning"),
            "warning"
          );
          return;
        }

        submitFactChallenge(cityState.city).catch(showGlobalError);
        return;
      }

      selectCity(cityState.city).catch(showGlobalError);
    });

    fragment.appendChild(marker);
  });

  elements.markerLayer.replaceChildren(fragment);
}

function renderPanel() {
  const cityState = getCurrentCityState();
  const period = getCurrentPeriod();
  const content = getLocalizedCityContent(getCityContent(state.selectedCity));

  if (!cityState) {
    setText(elements.cityName, translate("select_city"));
    setText(elements.citySubtitle, translate("select_city_subtitle"));
    setText(elements.cityDescription, translate("city_description_placeholder"));
    return;
  }

  const visual = getCityVisual(cityState.city);
  const displayName = content?.display_name || cityState.display_name;
  const subtitle =
    content?.subtitle ||
    cityState.subtitle ||
    translate("historical_city_default");
  const shortDescription =
    content?.short_description ||
    subtitle ||
    translate("short_description_unavailable");
  const historySummary =
    content?.history_summary || translate("history_unavailable");
  const interestingFact =
    content?.interesting_fact || translate("fact_unavailable");
  const chips = [
    content?.old_name ? translate("old_name_prefix", { name: content.old_name }) : null,
    cityState.quiz_available ? translate("quiz_available") : translate("quiz_unavailable"),
    cityState.fact_challenge_available ? translate("fact_available") : translate("fact_unavailable_chip"),
    cityState.unlocked_city_achievement ? translate("city_achievement_unlocked") : null,
  ].filter(Boolean);

  elements.cityImage.src = getCityImage(cityState.city, state.selectedPeriodCode);
  elements.cityImage.alt = displayName;
  setText(elements.cityEraBadge, getLocalizedPeriodBadgeText(period));
  setText(elements.cityRole, getLocalizedCityRole(cityState.city, visual?.role));
  setText(elements.cityName, displayName);
  setText(elements.citySubtitle, subtitle);
  setText(elements.cityDescription, shortDescription);

  setHtml(
    elements.cityChipRow,
    chips
      .map(
        (chip) =>
          `<span class="bg-surface-container text-on-surface-variant px-3 py-1.5 rounded-full text-xs font-semibold">${escapeHtml(
            chip
          )}</span>`
      )
      .join("")
  );

  setText(elements.cityMetricPrimary, `${cityState.best_score_in_this_period}%`);
  setText(elements.cityMetricPrimaryLabel, translate("best_score"));
  setText(elements.cityMetricSecondary, String(cityState.total_attempts_in_this_period));
  setText(elements.cityMetricSecondaryLabel, translate("attempts_period"));
  setText(elements.cityHistoryTitle, translate("short_history"));
  setText(elements.cityHistoryText, historySummary);
  setText(elements.cityDidYouKnowTitle, translate("interesting_fact"));
  setText(elements.cityDidYouKnowText, interestingFact);
  setText(
    elements.cityProgressLabel,
    cityState.passed_quiz_in_this_period ? translate("city_test_passed") : translate("city_test_not_passed")
  );
  setText(
    elements.cityProgressValue,
    formatPercent(cityState.passed_quiz_in_this_period ? 100 : cityState.best_score_in_this_period)
  );
  elements.cityProgressBar.style.width = `${Math.max(
    4,
    cityState.passed_quiz_in_this_period ? 100 : cityState.best_score_in_this_period
  )}%`;

  elements.startQuizButton.disabled = !cityState.quiz_available;
  elements.startQuizButton.classList.toggle("opacity-50", !cityState.quiz_available);
  elements.startFactButton.disabled = !cityState.fact_challenge_available;
  elements.startFactButton.classList.toggle(
    "opacity-50",
    !cityState.fact_challenge_available
  );
}

function renderFactState() {
  const factSession = getFactSessionForCurrentPeriod();
  const cityState = getCurrentCityState();

  if (factSession) {
    setVisible(elements.factCancelButton, true);
    setText(elements.factTitle, translate("fact_challenge_period"));
    setText(elements.factText, factSession.fact_text);
    setText(
      elements.factHelper,
      translate("fact_helper_active")
    );
    elements.startFactButton.textContent = translate("fact_button_active");
    elements.startFactButton.disabled = true;
    return;
  }

  setVisible(elements.factCancelButton, false);
  elements.startFactButton.disabled = !cityState?.fact_challenge_available;

  if (state.factResult) {
    setText(
      elements.factTitle,
      state.factResult.is_correct ? translate("fact_answer_accepted") : translate("fact_answer_checked")
    );
    setText(
      elements.factText,
      state.factResult.is_correct
        ? translate("fact_correct", { city: state.factResult.correct_city })
        : translate("fact_wrong", { city: state.factResult.correct_city })
    );
    setText(elements.factHelper, state.factResult.fact_text);
    elements.startFactButton.textContent = translate("fact_button_new");
    return;
  }

  setText(elements.factTitle, translate("fact_challenge"));
  setText(
    elements.factText,
    translate("fact_text_default")
  );
  setText(
    elements.factHelper,
    cityState?.fact_challenge_available
      ? translate("fact_helper_available")
      : translate("fact_helper_unavailable")
  );
  elements.startFactButton.textContent = translate("start_fact_challenge");
}

function setStatusMessage(message, kind = "info") {
  setVisible(elements.statusMessage, true);
  setText(elements.statusMessage, message);
  elements.statusMessage.className =
    "mt-4 rounded-xl px-4 py-3 text-sm " +
    (kind === "warning"
      ? "bg-secondary-container/25 text-on-secondary-container border border-secondary/15"
      : "bg-primary-container/20 text-on-primary-container border border-primary/10");
}

function clearStatusMessage() {
  setVisible(elements.statusMessage, false);
  setText(elements.statusMessage, "");
}

function render() {
  renderBootstrapSummary();
  renderTimeline();
  renderMapBackground();
  renderMarkers();
  renderPanel();
}

async function loadCityContent(city) {
  const cacheKey = `${state.selectedPeriodCode}::${city}`;
  if (cacheKey in state.cityContentCache) {
    return state.cityContentCache[cacheKey];
  }

  try {
    const response = await api.getCityContent(state.selectedPeriodCode, city);
    state.cityContentCache[cacheKey] = response.content;
    return response.content;
  } catch (error) {
    if (error?.status === 404) {
      state.cityContentCache[cacheKey] = null;
      return null;
    }

    throw error;
  }
}

async function selectCity(city) {
  state.selectedCity = city;
  setLastCity(city);
  clearStatusMessage();
  await loadCityContent(city);
  render();
}

async function loadMapState(periodCode) {
  clearStatusMessage();
  setVisible(elements.loadingState, true);
  setVisible(elements.errorState, false);

  try {
    const mapState = await api.getMapState(state.playerId, periodCode);
    state.mapStateCache[periodCode] = mapState;
    await syncMapSurface(periodCode);

    const lastCity = getLastCity();
    const visibleSvgCities = getVisibleSvgCitySet();
    const prefersVisibleSvg = visibleSvgCities.size > 0;
    const matchesVisibleSvg = (city) =>
      !prefersVisibleSvg || visibleSvgCities.has(city.city);
    const isActionable = (city) =>
      city.has_content || city.quiz_available || city.fact_challenge_available;
    const availableCity =
      mapState.cities.find(
        (city) => city.city === state.selectedCity && matchesVisibleSvg(city)
      ) ||
      mapState.cities.find(
        (city) => city.city === lastCity && matchesVisibleSvg(city)
      ) ||
      mapState.cities.find(
        (city) => matchesVisibleSvg(city) && isActionable(city)
      ) ||
      mapState.cities.find((city) => isActionable(city)) ||
      mapState.cities.find((city) => matchesVisibleSvg(city)) ||
      mapState.cities[0] ||
      null;

    state.selectedCity = availableCity ? availableCity.city : null;

    state.factSession = null;
    state.factResult = null;
    clearActiveFactSession();

    if (state.selectedCity) {
      await loadCityContent(state.selectedCity);
      setLastCity(state.selectedCity);
    }

    render();
  } finally {
    setVisible(elements.loadingState, false);
  }
}

async function loadBootstrap() {
  state.bootstrap = await api.getBootstrap(state.playerId);

  const periods = state.bootstrap.periods || [];
  const unlockedPeriods = periods
    .filter((period) => period.is_unlocked)
    .sort((a, b) => a.sort_order - b.sort_order);
  const defaultPeriodCode =
    periods.find(
      (period) =>
        period.code === state.bootstrap.default_period_code && period.is_unlocked
    )?.code ||
    unlockedPeriods.at(-1)?.code ||
    periods[0]?.code;
  state.selectedPeriodCode = defaultPeriodCode;
  setLastPeriodCode(state.selectedPeriodCode);

  renderBootstrapSummary();
  await loadMapState(state.selectedPeriodCode);
}

async function startFactChallenge() {
  if (!localStorage.getItem("sapar-user")) {
    window.location.href = "../registration/code.html";
    return;
  }

  const cityState = getCurrentCityState();
  if (!cityState?.fact_challenge_available) {
    setStatusMessage(
      translate("fact_helper_unavailable"),
      "warning"
    );
    return;
  }

  clearStatusMessage();
  state.factResult = null;
  setText(elements.startFactButton, translate("loading"));
  elements.startFactButton.disabled = true;

  try {
    const response = await api.startFactChallenge({
      player_id: state.playerId,
      period_code: state.selectedPeriodCode,
      candidate_count: 4,
    });

    state.factSession = response;
    setActiveFactSession(response);
    render();
  } catch (error) {
    setStatusMessage(getErrorMessage(error), "warning");
  }
}

async function submitFactChallenge(selectedCity) {
  const factSession = getFactSessionForCurrentPeriod();
  if (!factSession) {
    return;
  }

  clearStatusMessage();

  try {
    const response = await api.submitFactChallenge({
      player_id: state.playerId,
      session_id: factSession.session_id,
      selected_city: selectedCity,
    });

    state.factSession = null;
    clearActiveFactSession();
    state.factResult = response;
    await loadBootstrap();
    state.selectedCity = response.correct_city;
    setLastCity(response.correct_city);
    await loadCityContent(response.correct_city);
    render();
  } catch (error) {
    setStatusMessage(getErrorMessage(error), "warning");
  }
}

function openQuizChallenge() {
  if (!localStorage.getItem("sapar-user")) {
    window.location.href = "../registration/code.html";
    return;
  }

  const cityState = getCurrentCityState();
  if (!cityState?.quiz_available) {
    setStatusMessage(
      translate("quiz_unavailable_status"),
      "warning"
    );
    return;
  }

  clearActiveQuizState();
  setPendingQuizContext({
    city: state.selectedCity,
    periodCode: state.selectedPeriodCode,
  });
  window.location.href = "../quiz_challenge/code.html";
}

function showGlobalError(error) {
  setVisible(elements.loadingState, false);
  setVisible(elements.errorState, true);
  setText(elements.errorMessage, getErrorMessage(error));
}

function bindEvents() {
  elements.startQuizButton.addEventListener("click", openQuizChallenge);
  elements.startFactButton.addEventListener("click", startFactChallenge);
  elements.factCancelButton.addEventListener("click", () => {
    state.factSession = null;
    state.factResult = null;
    clearActiveFactSession();
    clearStatusMessage();
    render();
  });
  elements.retryButton.addEventListener("click", () => {
    loadBootstrap().catch(showGlobalError);
  });
}

function cacheElements() {
  elements.mapBackdrop = queryRequired("[data-map-backdrop]");
  elements.markerLayer = queryRequired("[data-map-markers]");
  elements.timelinePoints = queryRequired("[data-timeline-points]");
  elements.timelineFill = queryRequired("[data-timeline-fill]");
  elements.activeEraLabel = queryRequired("[data-active-era-label]");
  elements.playerSummaryTests = queryRequired("[data-player-tests]");
  elements.playerSummaryAchievements = queryRequired("[data-player-achievements]");
  elements.achievementPreview = queryRequired("[data-achievement-preview]");
  elements.loadingState = queryRequired("[data-loading-state]");
  elements.errorState = queryRequired("[data-error-state]");
  elements.errorMessage = queryRequired("[data-error-message]");
  elements.retryButton = queryRequired("[data-retry-button]");
  elements.cityImage = queryRequired("[data-city-image]");
  elements.cityEraBadge = queryRequired("[data-city-era-badge]");
  elements.cityRole = queryRequired("[data-city-role]");
  elements.cityName = queryRequired("[data-city-name]");
  elements.citySubtitle = queryRequired("[data-city-subtitle]");
  elements.cityDescription = queryRequired("[data-city-description]");
  elements.cityChipRow = queryRequired("[data-city-chips]");
  elements.cityMetricPrimary = queryRequired("[data-city-metric-primary]");
  elements.cityMetricPrimaryLabel = queryRequired("[data-city-metric-primary-label]");
  elements.cityMetricSecondary = queryRequired("[data-city-metric-secondary]");
  elements.cityMetricSecondaryLabel = queryRequired("[data-city-metric-secondary-label]");
  elements.cityHistoryTitle = queryRequired("[data-city-history-title]");
  elements.cityHistoryText = queryRequired("[data-city-history-text]");
  elements.cityDidYouKnowTitle = queryRequired("[data-city-fact-title]");
  elements.cityDidYouKnowText = queryRequired("[data-city-fact-text]");
  elements.cityProgressLabel = queryRequired("[data-city-progress-label]");
  elements.cityProgressValue = queryRequired("[data-city-progress-value]");
  elements.cityProgressBar = queryRequired("[data-city-progress-bar]");
  elements.startQuizButton = queryRequired("[data-start-quiz-button]");
  elements.startFactButton = queryRequired("[data-start-fact-button]");
  elements.factTitle = queryRequired("[data-fact-title]");
  elements.factText = queryRequired("[data-fact-text]");
  elements.factHelper = queryRequired("[data-fact-helper]");
  elements.factCancelButton = queryRequired("[data-fact-cancel-button]");
  elements.statusMessage = queryRequired("[data-status-message]");
}

async function init() {
  cacheElements();
  mountLanguageMenu({
    onChange: (language) => {
      currentLanguage = language;
      applyStaticTranslations();
      render();
    },
  });
  applyStaticTranslations();
  bindEvents();
  clearActiveFactSession();
  state.factSession = null;
  state.factResult = null;
  await reconcileStoredAuthUser();
  state.playerId = getOrCreatePlayerId();
  await loadBootstrap();
}

init().catch(showGlobalError);
