import { api } from "./api.js";
import { getCurrentLanguage, markLanguageReady, mountLanguageMenu } from "./language.js";
import {
  clearPendingMinigameGate,
  ensureStoredAuthOrRedirect,
  getOrCreatePlayerId,
  getPendingMinigameGate,
  setLastPeriodCode,
  startStoredAuthWatcher,
} from "./storage.js";
import { escapeHtml, setHtml } from "./helpers.js";

const translations = {
  ru: {
    page_title: "Sapar Quest - Мини-игра",
    nav_map: "Карта",
    intro_label: "Перед следующим периодом",
    intro_title: "Караван Шёлкового пути",
    intro_body:
      "Караван уходит через степь на закате. Пройди 300 метров, собирай товары и избегай препятствий, чтобы открыть следующий исторический период.",
    start: "Начать",
    back: "Вернуться к карте",
    loading: "Загрузка мини-игры...",
    win_title: "Победа!",
    win_body:
      "К XVIII веку Шёлковый путь через города Сыгнак, Туркестан и Сайрам угасал из-за набегов и переноса торговли на морские маршруты. Это усиливало поиск новых политических опор.",
    go_next: ({ title }) => `Перейти к периоду: ${title}`,
    error_title: "Мини-игра недоступна",
    error_body: "Заверши предыдущий период на карте, затем мини-игра откроется автоматически.",
  },
  en: {
    page_title: "Sapar Quest - Mini-game",
    nav_map: "Map",
    intro_label: "Before the next period",
    intro_title: "Silk Road Caravan",
    intro_body:
      "A caravan crosses the evening steppe. Travel 300 meters, collect goods, and avoid obstacles to unlock the next historical period.",
    start: "Start",
    back: "Return to map",
    loading: "Loading mini-game...",
    win_title: "Victory!",
    win_body:
      "By the 18th century, Silk Road routes through Sygnak, Turkestan, and Sairam were fading because of raids and the shift of trade to sea routes. This strengthened the search for new political support.",
    go_next: ({ title }) => `Go to period: ${title}`,
    error_title: "Mini-game unavailable",
    error_body: "Complete the previous period on the map first; the mini-game will open automatically.",
  },
  kk: {
    page_title: "Sapar Quest - Шағын ойын",
    nav_map: "Карта",
    intro_label: "Келесі кезең алдында",
    intro_title: "Жібек жолы керуені",
    intro_body:
      "Керуен күн батар шақта дала арқылы өтеді. Келесі тарихи кезеңді ашу үшін 300 метр жүріп, тауар жинап, кедергілерден өт.",
    start: "Бастау",
    back: "Картаға оралу",
    loading: "Шағын ойын жүктелуде...",
    win_title: "Жеңіс!",
    win_body:
      "XVIII ғасырға қарай Сығанақ, Түркістан және Сайрам арқылы өткен Жібек жолы жорықтар мен теңіз саудасының күшеюінен әлсіреді. Бұл жаңа саяси тірек іздеуді күшейтті.",
    go_next: ({ title }) => `Кезеңге өту: ${title}`,
    error_title: "Шағын ойын қолжетімсіз",
    error_body: "Алдымен картада алдыңғы кезеңді аяқта. Содан кейін ойын автоматты түрде ашылады.",
  },
};

const gameLoaders = {
  "caravan-runner": () => import("./minigames/games/caravan-runner/index.js"),
  "fortress-defense": () => import("./minigames/games/fortress-defense/index.js"),
  "monument-puzzle": () => import("./minigames/games/monument-puzzle/index.js"),
  "figures-memory": () => import("./minigames/games/figures-memory/index.js"),
  "tenge-catch": () => import("./minigames/games/tenge-catch/index.js"),
  "timeline-sort": () => import("./minigames/games/timeline-sort/index.js"),
};

const gameMounts = {
  "caravan-runner": "mountCaravanRunner",
  "fortress-defense": "mountFortressDefense",
  "monument-puzzle": "mountMonumentPuzzle",
  "figures-memory": "mountFiguresMemory",
  "tenge-catch": "mountTengeCatch",
  "timeline-sort": "mountTimelineSort",
};

const gameIntro = {
  "caravan-runner": {
    ru: {
      title: "Караван Шёлкового пути",
      body:
        "Караван проходит через степь. Пройди 300 метров, собирай товары и избегай препятствий, чтобы открыть следующий период.",
    },
    en: {
      title: "Silk Road Caravan",
      body:
        "A caravan crosses the evening steppe. Travel 300 meters, collect goods, and avoid obstacles to unlock the next historical period.",
    },
    kk: {
      title: "Жібек жолы керуені",
      body:
        "Керуен дала арқылы өтеді. Келесі кезеңді ашу үшін 300 метр жүріп, тауар жина және кедергілерден өт.",
    },
    image: "../shared/minigames/games/caravan-runner/assets/caravan-hero.webp",
  },
  "fortress-defense": {
    ru: {
      title: "Защита казахской крепости",
      body:
        "Удержи крепостную линию против всадников. Выбирай дорожки, бей быстро и сохрани стену, чтобы открыть следующий период.",
    },
    en: {
      title: "Defend the Kazakh Fortress",
      body:
        "Hold the fortress line against incoming raiders. Pick lanes, strike quickly, and keep the wall standing to unlock the next period.",
    },
    kk: {
      title: "Қазақ қамалын қорғау",
      body:
        "Салт аттыларға қарсы қамал шебін қорға. Жолақты таңда, тез соқ және келесі кезеңді ашу үшін қабырғаны сақта.",
    },
    image: "../shared/minigames/games/caravan-runner/assets/raider_on_horse_static_left.png",
  },
  "monument-puzzle": {
    ru: {
      title: "Пазл мавзолея",
      body:
        "Собери изображение мавзолея Ходжи Ахмета Ясауи как скользящий пазл, чтобы открыть советский период.",
    },
    en: {
      title: "Monument Puzzle",
      body:
        "Reassemble the Mausoleum of Khoja Ahmed Yasawi as a sliding puzzle to unlock the Soviet period.",
    },
    kk: {
      title: "Кесене пазлы",
      body:
        "Кеңестік кезеңді ашу үшін Қожа Ахмет Ясауи кесенесінің суретін сырғымалы пазл ретінде құрастыр.",
    },
    image: "../assets/cities/sygnak/hero.jpg",
  },
  "figures-memory": {
    ru: {
      title: "Мемори: исторические личности",
      body:
        "Открывай пары карточек с выдающимися казахстанцами советского периода и дойди до эпохи независимости.",
    },
    en: {
      title: "Memory: Historical Figures",
      body:
        "Match cards with major Kazakhstani figures of the Soviet period and move toward the independence era.",
    },
    kk: {
      title: "Мемори: тарихи тұлғалар",
      body:
        "Кеңестік кезеңдегі белгілі қазақстандық тұлғалардың жұптарын тауып, тәуелсіздік дәуіріне өт.",
    },
    image: "../assets/kazakhstan_timeline_soviet_1925.svg",
  },
  "tenge-catch": {
    ru: {
      title: "Лови тенге",
      body:
        "Лови банкноты первого тенге, избегай лишних предметов и набери нужную сумму для перехода к новой столице.",
    },
    en: {
      title: "Catch the Tenge",
      body:
        "Catch first-issue tenge banknotes, avoid decoys, and collect enough value to move toward the new capital.",
    },
    kk: {
      title: "Теңгені ұста",
      body:
        "Алғашқы теңге банкноттарын ұстап, қажет соманы жина да жаңа астана кезеңіне өт.",
    },
    image: "../assets/kazakhstan_timeline_independence_1991.svg",
  },
  "timeline-sort": {
    ru: {
      title: "Хронология современного Казахстана",
      body:
        "Расставь ключевые события от переноса столицы до референдума 2024 года в правильном порядке.",
    },
    en: {
      title: "Modern Kazakhstan Timeline",
      body:
        "Sort key events from the capital transfer to the 2024 referendum into chronological order.",
    },
    kk: {
      title: "Қазіргі Қазақстан хронологиясы",
      body:
        "Астананы көшіруден 2024 жылғы референдумға дейінгі оқиғаларды дұрыс ретке қой.",
    },
    image: "../assets/kazakhstan_timeline_modern_2025.svg",
  },
};

let playerId = "";
let gate = null;
let stopAuthWatcher = null;
let completedResponse = null;

function translate(key, params = {}) {
  const language = getCurrentLanguage();
  const value = translations[language]?.[key] ?? translations.ru[key] ?? key;
  return typeof value === "function" ? value(params) : value;
}

function periodTitle() {
  return gate?.to_period_title || gate?.to_period_code || "";
}

function mapUrlForPeriod(periodCode) {
  return periodCode
    ? `../map_hub/code.html?period=${encodeURIComponent(periodCode)}`
    : "../map_hub/code.html";
}

function goToNextPeriod(response = completedResponse) {
  const periodCode = response?.unlocked_period_code || gate?.to_period_code || "";
  if (periodCode) {
    setLastPeriodCode(periodCode);
  }
  window.location.href = mapUrlForPeriod(periodCode);
}

function postGateState(state) {
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        { type: "sapar-minigame-state", state, game_id: gate?.game_id || null },
        "*",
      );
    }
  } catch {
    /* ignored */
  }
}

function renderShell(content) {
  const root = document.querySelector("[data-minigame-root]");
  setHtml(
    root,
    `
      <div class="mx-auto flex h-full w-full max-w-6xl flex-col p-2 sm:px-6 sm:py-4">
        <header class="flex shrink-0 items-center justify-between gap-2 pb-2 sm:pb-4">
          <a class="inline-flex h-9 sm:h-11 items-center rounded-full bg-white/80 px-4 sm:px-5 text-xs sm:text-sm font-semibold text-primary shadow-sm transition hover:bg-white" href="../map_hub/code.html">
            ${escapeHtml(translate("nav_map"))}
          </a>
          <div data-language-menu></div>
        </header>
        <div class="flex-1 min-h-0 flex flex-col relative rounded-2xl sm:rounded-3xl overflow-hidden sm:overflow-visible">
          ${content}
        </div>
      </div>
    `,
  );
  mountLanguageMenu(document.querySelector("[data-language-menu]"));
  markLanguageReady();
}

function renderIntro() {
  const introConfig = gameIntro[gate?.game_id] || gameIntro["caravan-runner"];
  const intro =
    introConfig[getCurrentLanguage()] || introConfig.en || introConfig.ru;
  document.title = translate("page_title");
  renderShell(`
    <section class="flex h-full w-full items-center justify-center p-4">
      <div class="grid w-full h-full max-h-[600px] items-center gap-6 sm:gap-8 md:grid-cols-2">
        <div class="order-2 md:order-1 flex flex-col justify-center h-full">
          <p class="mb-1 sm:mb-3 text-[10px] sm:text-xs font-bold uppercase tracking-[0.18em] text-primary">${escapeHtml(translate("intro_label"))}</p>
          <h1 class="max-w-2xl text-2xl sm:text-4xl font-black leading-tight text-on-surface md:text-5xl lg:text-6xl">${escapeHtml(intro.title)}</h1>
          <p class="mt-3 sm:mt-5 max-w-xl text-sm sm:text-base leading-snug sm:leading-7 text-on-surface-variant md:text-lg overflow-y-auto max-h-[30vh] custom-scroll pr-2">${escapeHtml(intro.body)}</p>
          <div class="mt-4 sm:mt-8 flex flex-wrap gap-2 sm:gap-3 shrink-0">
            <button class="inline-flex h-10 sm:h-12 items-center rounded-full bg-primary px-5 sm:px-7 text-xs sm:text-sm font-bold text-on-primary shadow-lg transition hover:bg-primary-dim" type="button" data-start-game>
              ${escapeHtml(translate("start"))}
            </button>
            <a class="inline-flex h-10 sm:h-12 items-center rounded-full bg-white/80 px-5 sm:px-7 text-xs sm:text-sm font-bold text-on-surface shadow-sm transition hover:bg-white" href="../map_hub/code.html">
              ${escapeHtml(translate("back"))}
            </a>
          </div>
        </div>
        <div class="order-1 lg:order-2 flex justify-center items-center overflow-hidden border border-white/70 bg-white/50 shadow-xl shrink-0 h-[35%] lg:h-auto lg:min-h-[280px]" style="border-radius:14px;">
          <img src="${escapeHtml(introConfig.image)}" width="1280" height="720" alt="" class="h-full w-full object-cover" />
        </div>
      </div>
    </section>
  `);
  document.querySelector("[data-start-game]")?.addEventListener("click", startGame);
  postGateState("intro");
}

function renderError() {
  renderShell(`
    <section class="mx-auto flex h-full w-full max-w-xl flex-col items-center justify-center text-center">
      <h1 class="text-3xl font-black text-on-surface">${escapeHtml(translate("error_title"))}</h1>
      <p class="mt-4 text-on-surface-variant">${escapeHtml(translate("error_body"))}</p>
      <a class="mt-8 inline-flex h-12 items-center rounded-full bg-primary px-7 text-sm font-bold text-on-primary" href="../map_hub/code.html">
        ${escapeHtml(translate("back"))}
      </a>
    </section>
  `);
  postGateState("error");
}

function renderLoading() {
  renderShell(`
    <section class="flex h-full w-full items-center justify-center text-center">
      <p class="rounded-full bg-white/80 px-6 py-3 text-sm font-bold text-on-surface shadow-sm">${escapeHtml(translate("loading"))}</p>
    </section>
  `);
  postGateState("loading");
}

function renderWin(response) {
  const title = response?.unlocked_period_title || periodTitle();
  renderShell(`
    <section class="mx-auto flex h-full w-full max-w-2xl flex-col items-center justify-center text-center p-4">
      <p class="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-primary">${escapeHtml(gate.game_id)}</p>
      <h1 class="text-3xl sm:text-4xl font-black text-on-surface md:text-6xl">${escapeHtml(translate("win_title"))}</h1>
      <p class="mt-4 sm:mt-5 text-sm sm:text-base leading-snug sm:leading-7 text-on-surface-variant md:text-lg">${escapeHtml(translate("win_body"))}</p>
      <button class="mt-6 sm:mt-8 inline-flex h-10 sm:h-12 items-center rounded-full bg-primary px-5 sm:px-7 text-xs sm:text-sm font-bold text-on-primary shadow-lg" type="button" data-go-next>
        ${escapeHtml(translate("go_next", { title }))}
      </button>
    </section>
  `);
  document.querySelector("[data-go-next]")?.addEventListener("click", () => goToNextPeriod(response));
  postGateState("win");
}

async function startGame() {
  renderLoading();
  const loader = gameLoaders[gate.game_id];
  if (!loader) {
    renderError();
    return;
  }

  const module = await loader();
  renderShell(`<section class="flex h-full w-full items-center justify-center p-0 sm:p-2" data-game-host></section>`);
  postGateState("playing");
  const mountName = gameMounts[gate.game_id];
  const mount = mountName ? module[mountName] : null;
  if (typeof mount !== "function") {
    renderError();
    return;
  }

  mount(document.querySelector("[data-game-host]"), {
    language: getCurrentLanguage(),
    nextPeriodTitle: periodTitle(),
    goToNextPeriod,
    onWin: async ({ score, elapsedSeconds }) => {
      const response = await api.completeMinigame({
        player_id: playerId,
        game_id: gate.game_id,
        score,
        elapsed_seconds: elapsedSeconds,
      });
      completedResponse = response;
      clearPendingMinigameGate();
      return response;
    },
  });
}

async function init() {
  const user = await ensureStoredAuthOrRedirect("../registration/code.html");
  if (!user) return;
  playerId = getOrCreatePlayerId();
  stopAuthWatcher = startStoredAuthWatcher("../registration/code.html");
  gate = getPendingMinigameGate();
  if (!gate?.game_id) {
    renderError();
    return;
  }
  renderIntro();
}

window.addEventListener("beforeunload", () => {
  if (stopAuthWatcher) stopAuthWatcher();
});

init().catch((error) => {
  console.error(error);
  renderError();
});
