import { getApiBaseUrl } from "./config.js";
import { escapeHtml, setHtml, setText } from "./helpers.js";
import { getCurrentLanguage, markLanguageReady, mountLanguageMenu } from "./language.js";
import { getOrCreatePlayerId, reconcileStoredAuthUser } from "./storage.js?v=20260423d";

const AVATAR_STORAGE_KEY = "sapar-avatar-by-user";

const translations = {
  ru: {
    page_title: "Sapar Quest - Лидерборд",
    nav_explore: "Главная",
    nav_map: "Карта",
    nav_leaderboard: "Рейтинг",
    leaderboard_subtitle: "Топ игроков",
    leaderboard_title: "Лидерборд",
    leaderboard_desc: "Лучшие исследователи Казахстана по набранным очкам.",
    table_rank: "Ранг",
    table_player: "Игрок",
    table_accuracy: "Точность",
    table_score: "Очки",
    load_error: "Ошибка загрузки.",
    load_error_status: ({ status }) => `Ошибка ${status}`,
    empty_title: "Рейтинг пока пуст",
    empty_body: "Пройдите хотя бы один тест, и результаты появятся здесь.",
    row_tests: "Тестов",
    row_achievements: "Достижений",
    podium_detail: ({ tests, accuracy }) => `Тестов: ${tests} • Точность: ${accuracy}%`,
    current_player: "Вы",
  },
  en: {
    page_title: "Sapar Quest - Leaderboard",
    nav_explore: "Home",
    nav_map: "Map",
    nav_leaderboard: "Leaderboard",
    leaderboard_subtitle: "Top players",
    leaderboard_title: "Leaderboard",
    leaderboard_desc: "The best Kazakhstan explorers ranked by earned points.",
    table_rank: "Rank",
    table_player: "Player",
    table_accuracy: "Accuracy",
    table_score: "Score",
    load_error: "Loading error.",
    load_error_status: ({ status }) => `Error ${status}`,
    empty_title: "The leaderboard is empty",
    empty_body: "Complete at least one test and your results will appear here.",
    row_tests: "Tests",
    row_achievements: "Achievements",
    podium_detail: ({ tests, accuracy }) => `Tests: ${tests} • Accuracy: ${accuracy}%`,
    current_player: "You",
  },
  kk: {
    page_title: "Sapar Quest - Рейтинг",
    nav_explore: "Басты бет",
    nav_map: "Карта",
    nav_leaderboard: "Рейтинг",
    leaderboard_subtitle: "Үздік ойыншылар",
    leaderboard_title: "Рейтинг",
    leaderboard_desc: "Жинаған ұпайы бойынша Қазақстанды зерттеуші үздік ойыншылар.",
    table_rank: "Орын",
    table_player: "Ойыншы",
    table_accuracy: "Дәлдік",
    table_score: "Ұпай",
    load_error: "Жүктеу қатесі.",
    load_error_status: ({ status }) => `Қате ${status}`,
    empty_title: "Рейтинг әзірге бос",
    empty_body: "Кемінде бір тесттен өтіңіз, нәтижелер осы жерде пайда болады.",
    row_tests: "Тесттер",
    row_achievements: "Жетістіктер",
    podium_detail: ({ tests, accuracy }) => `Тесттер: ${tests} • Дәлдік: ${accuracy}%`,
    current_player: "Сіз",
  },
};

let currentLanguage = getCurrentLanguage();

async function fetchLeaderboard() {
  const res = await fetch(`${getApiBaseUrl()}/api/leaderboard`, { cache: "no-store" });
  if (!res.ok) throw new Error(translate("load_error_status", { status: res.status }));
  return res.json();
}

async function fetchCurrentPlayerFallback() {
  let authUser = await reconcileStoredAuthUser();

  if (!authUser) {
    try {
      const raw = localStorage.getItem("sapar-user");
      authUser = raw ? JSON.parse(raw) : null;
    } catch {
      authUser = null;
    }
  }

  const playerId = authUser?.id || getOrCreatePlayerId();
  const progressRes = await fetch(
    `${getApiBaseUrl()}/api/progress/${encodeURIComponent(playerId)}`,
    { cache: "no-store" }
  );

  if (!progressRes.ok) {
    return null;
  }

  const progress = await progressRes.json();
  const totalScore = (progress.city_progress || [])
    .filter((item) => item.city !== "ЕНТ")
    .reduce((sum, item) => sum + (Number(item.best_score) || 0), 0);
  const totalTests = Number(progress.total_tests_completed || 0);
  const achievementsCount = Number(progress.total_achievements_unlocked || 0);
  const accuracy = Number(progress.overall_accuracy_percent || 0);

  if (totalScore <= 0 && totalTests <= 0 && achievementsCount <= 0) {
    return null;
  }

  return {
    id: playerId,
    username: authUser?.username || translate("current_player"),
    total_score: totalScore,
    total_tests: totalTests,
    accuracy,
    achievements_count: achievementsCount,
  };
}

function getStoredAvatarMap() {
  try {
    const raw = localStorage.getItem(AVATAR_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function getEntryAvatar(entry) {
  return entry?.avatar_url || getStoredAvatarMap()?.[entry.id]?.src || null;
}

function renderAvatarMarkup(entry, fallbackIcon = "person", iconClasses = "text-primary") {
  const avatarSrc = getEntryAvatar(entry);
  if (avatarSrc) {
    return `<img alt="${escapeHtml(entry.username)}" class="w-full h-full object-cover pointer-events-none select-none" src="${avatarSrc}" draggable="false" style="-webkit-user-drag:none; user-select:none;" />`;
  }

  return `<span class="material-symbols-outlined ${iconClasses}">${fallbackIcon}</span>`;
}

function translate(key, params) {
  const value = translations[currentLanguage]?.[key] ?? translations.ru[key] ?? key;
  return typeof value === "function" ? value(params || {}) : value;
}

function setTranslatedElementText(element, value) {
  setText(element, value);
}

function applyStaticTranslations() {
  document.documentElement.lang = currentLanguage;
  document.title = translate("page_title");

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    if (element.closest("footer")) return;
    setTranslatedElementText(element, translate(element.dataset.i18n));
  });

  const errorMessage = document.querySelector("[data-error-message]");
  if (errorMessage && errorMessage.textContent.trim() === "") {
    setText(errorMessage, translate("load_error"));
  }

  markLanguageReady();
}

function renderPodium(entries) {
  const top3 = entries.slice(0, 3);

  const mapping = [
    {
      index: 1,
      el: "[data-podium-secondary]",
      fallbackIcon: "workspace_premium",
      iconClasses: "text-primary text-5xl",
    },
    {
      index: 0,
      el: "[data-podium-primary]",
      fallbackIcon: "stars",
      iconClasses: "text-secondary text-6xl",
    },
    {
      index: 2,
      el: "[data-podium-tertiary]",
      fallbackIcon: "workspace_premium",
      iconClasses: "text-tertiary text-5xl",
    },
  ];

  mapping.forEach(({ index, el, fallbackIcon, iconClasses }) => {
    const container = document.querySelector(el);
    if (!container) return;

    const entry = top3[index];
    if (!entry) {
      container.classList.add("opacity-30");
      return;
    }

    const avatarShell = container.querySelector("[data-podium-avatar]");
    if (avatarShell) {
      setHtml(avatarShell, renderAvatarMarkup(entry, fallbackIcon, iconClasses));
    }

    setText(container.querySelector("[data-podium-name]"), entry.username);
    setText(container.querySelector("[data-podium-score]"), `${entry.total_score} XP`);
    setText(
      container.querySelector("[data-podium-detail]"),
      translate("podium_detail", { tests: entry.total_tests, accuracy: entry.accuracy })
    );
  });
}

function renderTable(entries) {
  const container = document.querySelector("[data-leaderboard-rows]");
  if (!container) return;
  if (entries.length === 0) {
    setHtml(
      container,
      `
      <div class="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest px-6 py-10 text-center">
        <div class="text-lg font-headline font-bold text-on-surface">${translate("empty_title")}</div>
        <p class="mt-2 text-sm text-on-surface-variant">${translate("empty_body")}</p>
      </div>`
    );
    return;
  }

  const labelTests = translate("row_tests");
  const labelAchievements = translate("row_achievements");

  const rows = entries
    .map(
      (entry, i) => `
      <div class="grid grid-cols-12 px-6 py-4 items-center hover:bg-surface-container transition-colors rounded-xl group border border-transparent hover:border-outline-variant/10">
        <div class="col-span-2 md:col-span-1 font-black text-outline group-hover:text-primary transition-colors">#${i + 1}</div>
        <div class="col-span-5 md:col-span-7 flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-primary/10 shrink-0 overflow-hidden flex items-center justify-center">
            ${renderAvatarMarkup(entry, i < 3 ? "workspace_premium" : "person", "text-primary")}
          </div>
          <div>
            <div class="font-headline font-bold text-on-surface">${escapeHtml(entry.username)}</div>
            <div class="text-xs text-on-surface-variant">${labelTests}: ${entry.total_tests} • ${labelAchievements}: ${entry.achievements_count}</div>
          </div>
        </div>
        <div class="col-span-3 md:col-span-2 text-right text-sm text-on-surface-variant">${entry.accuracy}%</div>
        <div class="col-span-2 md:col-span-2 text-right font-headline font-black text-primary">${entry.total_score} XP</div>
      </div>`
    )
    .join("");

  setHtml(container, rows);
}

let leaderboardData = [];

async function init() {
  mountLanguageMenu({
    onChange: (language) => {
      currentLanguage = language;
      applyStaticTranslations();
      renderPodium(leaderboardData);
      renderTable(leaderboardData);
    },
  });
  applyStaticTranslations();

  try {
    const data = await fetchLeaderboard();
    leaderboardData = data.entries || [];
    if (leaderboardData.length === 0) {
      const fallbackEntry = await fetchCurrentPlayerFallback();
      if (fallbackEntry) {
        leaderboardData = [fallbackEntry];
      }
    }
    renderPodium(leaderboardData);
    renderTable(leaderboardData);
  } catch (err) {
    const errorEl = document.querySelector("[data-error-state]");
    if (errorEl) {
      errorEl.classList.remove("hidden");
      setText(document.querySelector("[data-error-message]"), err.message || translate("load_error"));
    }
  }
}

init();
