export const PERIOD_MAP_ASSETS = Object.freeze({
  khanate_1465: "../assets/kazakhstan_timeline_khanate_1465.svg",
  imperial_1731: "../assets/kazakhstan_timeline_imperial_1731.svg",
  imperial_1868: "../assets/kazakhstan_timeline_imperial_1868.svg",
  soviet_1925: "../assets/kazakhstan_timeline_soviet_1925.svg",
  independence_1991: "../assets/kazakhstan_timeline_independence_1991.svg",
  transition_1998: "../assets/kazakhstan_timeline_transition_1998.svg",
  modern_2025: "../assets/kazakhstan_timeline_modern_2025.svg",
});

export const MODERN_MAP_ASSET = PERIOD_MAP_ASSETS.modern_2025;

export const CITY_NAME_TRANSLATIONS = Object.freeze({
  en: Object.freeze({
    "Акмолинск": "Akmolinsk",
    "Акмола": "Akmola",
    "Актау": "Aktau",
    "Ақтау": "Aktau",
    "Актобе": "Aktobe",
    "Актюбинск": "Aktyubinsk",
    "Ақтөбе": "Aktobe",
    "Алма-Ата": "Alma-Ata",
    "Алматы": "Almaty",
    "Астана": "Astana",
    "Атырау": "Atyrau",
    "Аулие-Ата": "Aulie-Ata",
    "Верный": "Verny",
    "Гурьев": "Guryev",
    "Джамбул": "Dzhambul",
    "Казалинск": "Kazalinsk",
    "Караганда": "Karaganda",
    "Қарағанды": "Karaganda",
    "Костанай": "Kostanay",
    "Кустанай": "Kustanay",
    "Қостанай": "Kostanay",
    "Кзыл-Орда": "Kzyl-Orda",
    "Кызылорда": "Kyzylorda",
    "Қызылорда": "Kyzylorda",
    "Орал": "Oral",
    "Оскемен": "Oskemen",
    "Өскемен": "Oskemen",
    "Отрар": "Otrar",
    "Павлодар": "Pavlodar",
    "Перовск": "Perovsk",
    "Петропавл": "Petropavl",
    "Петропавловск": "Petropavlovsk",
    "Сайрам": "Sairam",
    "Сауран": "Sauran",
    "Семей": "Semey",
    "Семипалатинск": "Semipalatinsk",
    "Сыгнак": "Sygnak",
    "Тараз": "Taraz",
    "Туркестан": "Turkestan",
    "Түркістан": "Turkestan",
    "Уральск": "Uralsk",
    "Усть-Каменогорск": "Ust-Kamenogorsk",
    "Целиноград": "Tselinograd",
    "Чимкент": "Chimkent",
    "Шевченко": "Shevchenko",
    "Шымкент": "Shymkent",
    "Яссы": "Yassy",
    "ЕНТ": "UNT",
  }),
});

export function getLocalizedCityName(city, language = "ru") {
  if (!city) {
    return "";
  }

  if (language !== "en") {
    return city;
  }

  return CITY_NAME_TRANSLATIONS.en[city] || city;
}

export function getLocalizedCityDisplayName(
  city,
  displayName = null,
  language = "ru"
) {
  return getLocalizedCityName(displayName || city, language);
}

export const PERIOD_CAPITAL_MARKERS = Object.freeze({
  khanate_1465: Object.freeze({
    backendCity: null,
    labelKeys: Object.freeze(["сыгнак"]),
  }),
  imperial_1731: Object.freeze({
    backendCity: null,
    labelKeys: Object.freeze(["туркестан", "туркестан яссы", "яссы"]),
  }),
  imperial_1868: Object.freeze({
    backendCity: "Алматы",
    labelKeys: Object.freeze(["верный"]),
  }),
  soviet_1925: Object.freeze({
    backendCity: "Кызылорда",
    labelKeys: Object.freeze(["кзыл-орда"]),
  }),
  independence_1991: Object.freeze({
    backendCity: "Алматы",
    labelKeys: Object.freeze(["алма-ата"]),
  }),
  transition_1998: Object.freeze({
    backendCity: "Астана",
    labelKeys: Object.freeze(["астана", "акмола"]),
  }),
  modern_2025: Object.freeze({
    backendCity: "Астана",
    labelKeys: Object.freeze(["астана"]),
  }),
});

export const PERIOD_SVG_CITY_ALIASES = Object.freeze({
  khanate_1465: Object.freeze({
    "сыгнак": "Сыгнак",
    "яссы": "Яссы",
    "отрар": "Отрар",
    "сауран": "Сауран",
    "сайрам": "Сайрам",
    "тараз": "Тараз",
  }),
  imperial_1731: Object.freeze({
    "туркестан": "Туркестан",
    "сыгнак": "Сыгнак",
    "отрар": "Отрар",
    "сайрам": "Сайрам",
    "тараз": "Тараз",
  }),
  imperial_1868: Object.freeze({
    "верный": "Верный",
    "семипалатинск": "Семипалатинск",
    "петропавловск": "Петропавловск",
    "уральск": "Уральск",
    "усть-каменогорск": "Усть-Каменогорск",
    "гурьев": "Гурьев",
    "аулие-ата": "Аулие-Ата",
    "перовск": "Перовск",
    "акмолинск": "Акмолинск",
    "туркестан": "Туркестан",
    "казалинск": "Казалинск",
    "чимкент": "Чимкент",
  }),
  soviet_1925: Object.freeze({
    "кзыл-орда": "Кызылорда",
    "алма-ата": "Алматы",
    "верный": "Алматы",
    "семипалатинск": "Семей",
    "петропавловск": "Петропавл",
    "уральск": "Орал",
    "актюбинск": "Актобе",
    "павлодар": "Павлодар",
    "усть-каменогорск": "Оскемен",
    "аулие-ата": "Тараз",
    "гурьев": "Атырау",
    "акмолинск": "Астана",
    "кустанай": "Костанай",
    "чимкент": "Шымкент",
  }),
  independence_1991: Object.freeze({
    "алма-ата": "Алматы",
    "целиноград": "Астана",
    "чимкент": "Шымкент",
    "актюбинск": "Актобе",
    "караганда": "Караганда",
    "қарағанды": "Караганда",
    "джамбул": "Тараз",
    "павлодар": "Павлодар",
    "усть-каменогорск": "Оскемен",
    "семипалатинск": "Семей",
    "гурьев": "Атырау",
    "кустанай": "Костанай",
    "кзыл-орда": "Кызылорда",
    "уральск": "Орал",
    "петропавловск": "Петропавл",
    "актау": "Актау",
    "шевченко": "Актау",
  }),
  transition_1998: Object.freeze({
    "астана": "Астана",
    "алматы": "Алматы",
    "шымкент": "Шымкент",
    "актобе": "Актобе",
    "ақтөбе": "Актобе",
    "актюбинск": "Актобе",
    "қарағанды": "Караганда",
    "тараз": "Тараз",
    "павлодар": "Павлодар",
    "өскемен": "Оскемен",
    "семей": "Семей",
    "семипалатинск": "Семей",
    "атырау": "Атырау",
    "қостанай": "Костанай",
    "қызылорда": "Кызылорда",
    "орал": "Орал",
    "петропавл": "Петропавл",
    "ақтау": "Актау",
  }),
  modern_2025: Object.freeze({
    "астана": "Астана",
    "алматы": "Алматы",
    "шымкент": "Шымкент",
    "актобе": "Актобе",
    "қарағанды": "Караганда",
    "тараз": "Тараз",
    "павлодар": "Павлодар",
    "өскемен": "Оскемен",
    "семей": "Семей",
    "атырау": "Атырау",
    "қостанай": "Костанай",
    "қызылорда": "Кызылорда",
    "орал": "Орал",
    "петропавл": "Петропавл",
    "ақтау": "Актау",
  }),
});

const DEFAULT_CITY_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCT5W0TF5S1dKPW4eADJPUuKhJz1SGqJILZtua-Eg5OybaWmDXOi7TyEW9tupLkLrNRqcs25udQD5odGj_lh0-1wno5I9rdo-Z3BdLEywFVnu7rbyGMLBuXSIj75OUvKXV50c2mvTIsH8pnc5zHEkB-EVE8yZAdAyqNQcCR2kviQmXx4UlwP6Hjgo6htoarPLL6e0AOAL0f2p-5mcajSYLygQgi5csxzqRJSxfKIU9_05ZkI9lkPL9ZkE5CXGMN5DQHBN-PJoaTCA";

const CITY_FALLBACK_PALETTES = [
  ["#006668", "#52f2f5", "#befeff"],
  ["#04647d", "#9ae1ff", "#e3f6ff"],
  ["#6c5a00", "#ffd709", "#fff2cd"],
  ["#00595b", "#3de4e7", "#d9ffff"],
  ["#005267", "#8cd3f0", "#dbf6ff"],
];

const VISUALS = [
  { city: "Астана", slug: "astana", top: 30, left: 60, badge: "location_on", role: "Столица степи" },
  { city: "Алматы", slug: "almaty", top: 75, left: 75, badge: "castle", role: "Южный культурный центр" },
  { city: "Шымкент", slug: "shymkent", top: 82, left: 56, badge: "temple_hindu", role: "Южный торговый узел" },
  { city: "Актобе", slug: "aktobe", top: 37, left: 28, badge: "location_on", role: "Западный перекресток" },
  { city: "Караганда", slug: "karaganda", top: 40, left: 64, badge: "factory", role: "Центральный индустриальный узел" },
  { city: "Тараз", slug: "taraz", top: 79, left: 60, badge: "history_edu", role: "Древний южный город" },
  { city: "Павлодар", slug: "pavlodar", top: 26, left: 72, badge: "waves", role: "Город на Иртыше" },
  { city: "Оскемен", slug: "oskemen", top: 39, left: 85, badge: "terrain", role: "Восточные ворота" },
  { city: "Семей", slug: "semey", top: 36, left: 80, badge: "auto_stories", role: "Исторический центр Прииртышья" },
  { city: "Атырау", slug: "atyrau", top: 55, left: 17, badge: "water", role: "Прикаспийский город" },
  { city: "Костанай", slug: "kostanay", top: 20, left: 43, badge: "agriculture", role: "Северный регион" },
  { city: "Кызылорда", slug: "kyzylorda", top: 68, left: 47, badge: "route", role: "Город у Сырдарьи" },
  { city: "Орал", slug: "oral", top: 32, left: 15, badge: "travel_explore", role: "Западный рубеж" },
  { city: "Петропавл", slug: "petropavl", top: 11, left: 55, badge: "ac_unit", role: "Северный город" },
  { city: "Актау", slug: "aktau", top: 75, left: 15, badge: "sailing", role: "Каспийский порт" },
];

const LOCAL_CITY_HERO_IMAGES = Object.freeze({
  "Астана": "../assets/cities/astana/hero.webp",
  "Алматы": "../assets/cities/almaty/hero.webp",
  "Шымкент": "../assets/cities/shymkent/hero.webp",
  "Актобе": "../assets/cities/aktobe/hero.webp",
  "Караганда": "../assets/cities/karaganda/hero.webp",
  "Тараз": "../assets/cities/taraz/hero.webp",
  "Павлодар": "../assets/cities/pavlodar/hero.webp",
  "Оскемен": "../assets/cities/oskemen/hero.webp",
  "Семей": "../assets/cities/semey/hero.jpg",
  "Атырау": "../assets/cities/atyrau/hero.webp",
  "Костанай": "../assets/cities/kostanay/hero.jpg",
  "Кызылорда": "../assets/cities/kyzylorda/hero.jpg",
  "Орал": "../assets/cities/oral/hero.jpg",
  "Петропавл": "../assets/cities/petropavl/hero.jpg",
  "Актау": "../assets/cities/aktau/hero.webp",
  "Сыгнак": "../assets/cities/sygnak/hero.jpg",
});

const PERIOD_CITY_IMAGE_OVERRIDES = Object.freeze({
  "khanate_1465::Сыгнак": "Сыгнак",
  "khanate_1465::Яссы": "Туркестан",
  "khanate_1465::Отрар": "Отрар",
  "khanate_1465::Сауран": "Сауран",
  "khanate_1465::Сайрам": "Сайрам",
  "imperial_1731::Туркестан": "Туркестан",
  "imperial_1731::Сыгнак": "Сыгнак",
  "imperial_1731::Отрар": "Отрар",
  "imperial_1731::Сайрам": "Сайрам",
  "imperial_1731::Тараз": "Тараз",
  "imperial_1868::Казалинск": "Казалинск",
});

const CITY_IMAGE_ALIASES = Object.freeze({
  "Акмолинск": "Астана",
  "Целиноград": "Астана",
  "Верный": "Алматы",
  "Алма-Ата": "Алматы",
  "Чимкент": "Шымкент",
  "Актюбинск": "Актобе",
  "Усть-Каменогорск": "Оскемен",
  "Семипалатинск": "Семей",
  "Гурьев": "Атырау",
  "Кустанай": "Костанай",
  "Кзыл-Орда": "Кызылорда",
  "Перовск": "Кызылорда",
  "Уральск": "Орал",
  "Петропавловск": "Петропавл",
  "Аулие-Ата": "Тараз",
  "Джамбул": "Тараз",
  "Яссы": "Туркестан",
});

const CITY_IMAGES = Object.freeze({
  ...LOCAL_CITY_HERO_IMAGES,
  "Туркестан":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Mausoleum_of_Khoja_Ahmed_Yasawi_in_Hazrat-e_Turkestan%2C_Kazakhstan.jpg",
  "Отрар":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Otrar_aerial_view_from_May_2016.jpg",
  "Сауран":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Sawran%2C_Kazakhstan_01.jpg",
  "Сайрам":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Sayram_minaret.JPG",
  "Казалинск":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Syr_Darya_Oblast._City_of_Kazalinsk._Trade_Stalls_WDL10926.png",
});

export function getCityVisual(city) {
  return VISUALS.find((item) => item.city === city) || null;
}

function hashCityName(city) {
  return Array.from(String(city || ""))
    .map((char) => char.charCodeAt(0))
    .reduce((accumulator, code) => accumulator + code, 0);
}

function buildCityFallbackImage(city) {
  if (!city) {
    return DEFAULT_CITY_IMAGE;
  }

  const visual = getCityVisual(city);
  const [deep, accent, light] =
    CITY_FALLBACK_PALETTES[hashCityName(city) % CITY_FALLBACK_PALETTES.length];
  const safeCity = String(city);
  const safeRole = visual?.role || "Исторический город Казахстана";
  const initials = Array.from(safeCity)
    .filter((character) => /\p{L}/u.test(character))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 720">
      <defs>
        <linearGradient id="hero" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${deep}" />
          <stop offset="100%" stop-color="${accent}" />
        </linearGradient>
      </defs>
      <rect width="960" height="720" fill="url(#hero)" rx="42" />
      <circle cx="760" cy="140" r="140" fill="${light}" opacity="0.18" />
      <circle cx="180" cy="560" r="170" fill="${light}" opacity="0.14" />
      <path d="M0 615 C150 545 280 520 420 558 C565 597 685 632 960 535 L960 720 L0 720 Z" fill="${light}" opacity="0.22" />
      <rect x="72" y="72" width="132" height="132" rx="36" fill="${light}" opacity="0.24" />
      <text x="138" y="156" text-anchor="middle" fill="#ffffff" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="58" font-weight="800">${initials || "SQ"}</text>
      <text x="72" y="412" fill="#ffffff" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="76" font-weight="800">${safeCity}</text>
      <text x="72" y="468" fill="${light}" font-family="Be Vietnam Pro, Arial, sans-serif" font-size="28">${safeRole}</text>
      <text x="72" y="610" fill="#ffffff" fill-opacity="0.84" font-family="Be Vietnam Pro, Arial, sans-serif" font-size="26">Sapar Quest • Карта периода</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function resolveCityImageKey(city, periodCode) {
  const periodOverride = periodCode
    ? PERIOD_CITY_IMAGE_OVERRIDES[`${periodCode}::${city}`]
    : null;
  if (periodOverride) {
    return periodOverride;
  }

  return CITY_IMAGE_ALIASES[city] || city;
}

export function getCityImage(city, periodCode = null) {
  const resolvedCity = resolveCityImageKey(city, periodCode);
  return CITY_IMAGES[resolvedCity] || buildCityFallbackImage(city);
}

export function getPeriodBadgeText(period) {
  if (!period) {
    return "Исторический период";
  }

  return `${period.year_label} • ${period.title}`;
}

export function getMarkerIcon(cityState, factSession) {
  if (factSession?.candidate_cities?.includes(cityState.city)) {
    return "flare";
  }

  if (cityState.passed_quiz_in_this_period) {
    return "verified";
  }

  if (cityState.has_fact_success_in_this_period) {
    return "auto_awesome";
  }

  const visual = getCityVisual(cityState.city);
  return visual?.badge || "location_on";
}
