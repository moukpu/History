import { api } from "./api.js";
import { getOrCreatePlayerId, reconcileStoredAuthUser } from "./storage.js";
import { getErrorMessage, setText } from "./helpers.js";
import { getCurrentLanguage, mountLanguageMenu } from "./language.js";

const translations = {
  ru: {
    page_title: "Sapar Quest - Живая история Казахстана",
    nav_explore: "Главная",
    nav_map: "Карта",
    nav_leaderboard: "Рейтинг",
    home_error_default: "Ошибка загрузки главной страницы.",
    hero_title: "Открой историю степи",
    hero_subtitle:
      "Интерактивное путешествие по эпохам Казахстана. Пройди путь от древних поселений до современных мегаполисов.",
    btn_start_exploring: "Начать путешествие",
    btn_about_project: "Узнать о проекте",
    label_current_quest: "ТЕКУЩИЙ КВЕСТ",
    current_quest_fallback: "Историческая карта Казахстана",
    current_quest_subtitle: ({ unlocked, total, cities }) =>
      `Открыто периодов: ${unlocked} из ${total}. Городов текущего периода: ${cities}.`,
    section_legendary: "Легендарные места",
    badge_popular: "ПОПУЛЯРНОЕ",
    card_popular_title: "Потерянный оазис Отрара",
    card_popular_desc:
      "Откройте города Казахстана в разные эпохи и сравните, как менялась карта страны.",
    card_victories_title: "История ваших побед",
    card_victories_desc: "Ваши тесты и достижения всегда под рукой в вашем профиле.",
    btn_view_profile: "Открыть профиль",
    card_ent_title: "Подготовка к ЕНТ",
    card_ent_desc: "Решайте исторические тесты, проверяйте свои знания и уверенно сдавайте ЕНТ.",
    btn_take_test: "Пройти тест",
    card_ancestors_title: "Следы предков",
    card_ancestors_desc: "Перейдите к карте и начните путь через 7 исторических периодов Казахстана.",
    btn_map_location: "Открыть карту",
  },
  en: {
    page_title: "Sapar Quest - The Living Story of Kazakhstan",
    nav_explore: "Home",
    nav_map: "Map",
    nav_leaderboard: "Leaderboard",
    home_error_default: "Failed to load the home page.",
    hero_title: "Discover the history of the steppe",
    hero_subtitle:
      "An interactive journey through the eras of Kazakhstan, from early settlements to modern cities.",
    btn_start_exploring: "Start the journey",
    btn_about_project: "Learn about the project",
    label_current_quest: "CURRENT QUEST",
    current_quest_fallback: "Historical map of Kazakhstan",
    current_quest_subtitle: ({ unlocked, total, cities }) =>
      `Unlocked periods: ${unlocked} of ${total}. Cities in the current period: ${cities}.`,
    section_legendary: "Legendary places",
    badge_popular: "POPULAR",
    card_popular_title: "The lost oasis of Otrar",
    card_popular_desc:
      "Explore Kazakhstan's cities across different eras and compare how the country's map changed.",
    card_victories_title: "Your victory history",
    card_victories_desc: "Your tests and achievements are always available in your profile.",
    btn_view_profile: "Open profile",
    card_ent_title: "UNT preparation",
    card_ent_desc: "Practice history tests, check your knowledge, and prepare for the UNT with confidence.",
    btn_take_test: "Take test",
    card_ancestors_title: "Traces of ancestors",
    card_ancestors_desc: "Open the map and begin your path through 7 historical periods of Kazakhstan.",
    btn_map_location: "Open map",
  },
  kk: {
    page_title: "Sapar Quest - Қазақстанның тірі тарихы",
    nav_explore: "Басты бет",
    nav_map: "Карта",
    nav_leaderboard: "Рейтинг",
    home_error_default: "Басты бетті жүктеу қатесі.",
    hero_title: "Дала тарихын аш",
    hero_subtitle:
      "Қазақстан дәуірлері бойынша интерактивті саяхат: көне қоныстардан қазіргі қалаларға дейін.",
    btn_start_exploring: "Саяхатты бастау",
    btn_about_project: "Жоба туралы білу",
    label_current_quest: "АҒЫМДАҒЫ КВЕСТ",
    current_quest_fallback: "Қазақстанның тарихи картасы",
    current_quest_subtitle: ({ unlocked, total, cities }) =>
      `Ашылған кезеңдер: ${unlocked}/${total}. Ағымдағы кезең қалалары: ${cities}.`,
    section_legendary: "Аңызға айналған орындар",
    badge_popular: "ТАНЫМАЛ",
    card_popular_title: "Отырардың жоғалған оазисі",
    card_popular_desc:
      "Қазақстан қалаларын әр дәуірде ашып, ел картасының қалай өзгергенін салыстыр.",
    card_victories_title: "Жеңістеріңіздің тарихы",
    card_victories_desc: "Тесттеріңіз бен жетістіктеріңіз әрдайым профиліңізде сақталады.",
    btn_view_profile: "Профильді ашу",
    card_ent_title: "ҰБТ-ға дайындық",
    card_ent_desc: "Тарих тесттерін шешіп, біліміңізді тексеріп, ҰБТ-ға сенімді дайындалыңыз.",
    btn_take_test: "Тест тапсыру",
    card_ancestors_title: "Бабалар ізі",
    card_ancestors_desc: "Картаға өтіп, Қазақстанның 7 тарихи кезеңі арқылы саяхатты бастаңыз.",
    btn_map_location: "Картаны ашу",
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

const elements = {};
let currentLanguage = getCurrentLanguage();

function queryRequired(selector) {
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }

  return element;
}

function cacheElements() {
  elements.heroButton = queryRequired("[data-start-exploring]");
  elements.mapButton = document.querySelector("[data-map-location]");
  elements.leaderboardButton = queryRequired("[data-view-standings]");
  elements.eraBadge = queryRequired("[data-era-badge]");
  elements.questTitle = queryRequired("[data-current-quest-title]");
  elements.questSubtitle = queryRequired("[data-current-quest-subtitle]");
  elements.errorMessage = queryRequired("[data-home-error]");
}

let lastBootstrapData = null;

function translate(key, params) {
  const value = translations[currentLanguage]?.[key] ?? translations.ru[key] ?? key;
  return typeof value === "function" ? value(params || {}) : value;
}

function setTranslatedElementText(element, value) {
  const firstIcon = Array.from(element.children).find((child) =>
    child.classList.contains("material-symbols-outlined")
  );

  if (!firstIcon) {
    setText(element, value);
    return;
  }

  const textNode = Array.from(element.childNodes).find(
    (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0
  );

  if (textNode) {
    textNode.textContent = `${value} `;
  } else {
    element.insertBefore(document.createTextNode(`${value} `), firstIcon);
  }
}

function applyTranslations() {
  document.documentElement.lang = currentLanguage;
  document.title = translate("page_title");

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    if (element.closest("footer")) return;
    setTranslatedElementText(element, translate(element.dataset.i18n));
  });

}

function getLocalizedPeriodTitle(period) {
  if (!period) {
    return translate("current_quest_fallback");
  }

  return periodTitleTranslations[currentLanguage]?.[period.code] || period.title || translate("current_quest_fallback");
}

function renderDynamicContent() {
  if (!lastBootstrapData) return;

  const bootstrap = lastBootstrapData;
  const period =
    bootstrap.periods.find((item) => item.code === bootstrap.default_period_code) ||
    null;

  setText(elements.eraBadge, "");
  setText(elements.questTitle, getLocalizedPeriodTitle(period));
  setText(
    elements.questSubtitle,
    translate("current_quest_subtitle", {
      unlocked: bootstrap.quest_summary?.unlocked_periods_count ?? 1,
      total: bootstrap.periods.length,
      cities: bootstrap.available_cities_for_default_period.length,
    })
  );
}

async function init() {
  cacheElements();
  mountLanguageMenu({
    onChange: (language) => {
      currentLanguage = language;
      applyTranslations();
      renderDynamicContent();
    },
  });
  applyTranslations();

  await reconcileStoredAuthUser();
  const playerId = getOrCreatePlayerId();
  elements.heroButton.href = "../map_hub/code.html";
  if (elements.mapButton) elements.mapButton.href = "../map_hub/code.html";
  elements.leaderboardButton.href = "../profile/code.html";

  try {
    lastBootstrapData = await api.getBootstrap(playerId);
    renderDynamicContent();
  } catch (error) {
    setText(elements.errorMessage, getErrorMessage(error) || translate("home_error_default"));
    elements.errorMessage.classList.remove("hidden");
  }
}

init().catch((error) => {
  if (elements.errorMessage) {
    setText(elements.errorMessage, getErrorMessage(error));
    elements.errorMessage.classList.remove("hidden");
  }
});
