const I18N = {
  ru: {
    title: "Защити крепость",
    ready:
      "Нажимай на всадников. Ближайший свободный лучник займёт линию огня; если цели долго живут, подключатся остальные. Проживи минуту, разблокируй период.",
    start: "Начать",
    exit: "Выйти",
    wall: "Стена: {n}%",
    coins: "Монеты: {n}",
    time: "Время: {n} с",
    pause: "Пауза",
    continue: "Продолжить",
    victory: "Победа! Период разблокирован",
    survivedAfterFall: "Вы продержались минуту. Игра пройдена, даже если крепость пала.",
    fail: "Крепость пала",
    replay: "Играть снова",
    restart: "Заново",
    next: "Перейти к следующему периоду",
    result: "Монеты: {coins} · Стена: {wall}% · Время: {time} с",
  },
  en: {
    title: "Defend the Fortress",
    ready:
      "Click raiders. The nearest free archer takes the shot line; if a target survives, others join in sequence. Survive one minute to unlock the period.",
    start: "Start",
    exit: "Exit",
    wall: "Wall: {n}%",
    coins: "Coins: {n}",
    time: "Time: {n} s",
    pause: "Pause",
    continue: "Continue",
    victory: "Victory! Period unlocked",
    survivedAfterFall: "You held for a minute. The game is complete, even if the fortress fell.",
    fail: "The fortress fell",
    replay: "Play again",
    restart: "Restart",
    next: "Continue to next period",
    result: "Coins: {coins} · Wall: {wall}% · Time: {time} s",
  },
  kk: {
    title: "Қамалды қорға",
    ready:
      "Салт аттыны бас. Ең жақын бос садақшы атыс орнына барады; нысана ұзақ тірі қалса, қалғандары қосылады. Бір минут шыдап, кезеңді аш.",
    start: "Бастау",
    exit: "Шығу",
    wall: "Қабырға: {n}%",
    coins: "Теңге: {n}",
    time: "Уақыт: {n} с",
    pause: "Кідіріс",
    continue: "Жалғастыру",
    victory: "Жеңіс! Кезең ашылды",
    survivedAfterFall: "Бір минут шыдадың. Қамал құласа да, ойын өтті.",
    fail: "Қамал құлады",
    replay: "Қайта ойнау",
    restart: "Қайта бастау",
    next: "Келесі кезеңге өту",
    result: "Теңге: {coins} · Қабырға: {wall}% · Уақыт: {time} с",
  },
};

const DEFENSE_SECONDS = 60;
const INITIAL_COINS = 5;
const ENEMY_HP = 3;
const ELITE_ENEMY_HP = 10;
const ELITE_ENEMY_START_SECONDS = 30;
const ELITE_ENEMY_SPAWN_CHANCE = 0.65;
const ARCHER_COUNT = 3;
const ARCHER_MOVE_SPEED = 46;
const ARCHER_FIRE_COOLDOWN = 1.35;
const BASE_ARROW_SPEED_FACTOR = 0.78;
const FIRST_REINFORCEMENT_DELAY = 2.5;
const SECOND_REINFORCEMENT_DELAY = 2;
const ENEMY_SPEED_STEP_SECONDS = 10;
const ENEMY_SPEED_STEP = 0.15;
const SURVIVAL_BONUS_SECONDS = 45;
const SURVIVAL_BONUS_COINS = 15;
const PROGRESS_KEY_PREFIX = "sapar-minigame-progress:fortress-defense";

const SHOP_PACKS = [
  { id: "speed_1", type: "speed", ru: "Лёгкие тетивы", en: "Light bowstrings", kk: "Жеңіл адырна", cost: 4, move: 0.14, cooldown: 0.9 },
  { id: "speed_2", type: "speed", ru: "Степная школа", en: "Steppe drill", kk: "Дала машығы", cost: 9, move: 0.36, cooldown: 0.78 },
  { id: "speed_3", type: "speed", ru: "Смена караула", en: "Guard rotation", kk: "Қарауыл ауысымы", cost: 16, move: 0.72, cooldown: 0.62 },
  { id: "power_1", type: "power", ru: "Закалённые стрелы", en: "Hardened arrows", kk: "Шыңдалған жебе", cost: 6, damage: 1, arrow: 0.18 },
  { id: "power_2", type: "power", ru: "Составной лук", en: "Composite bow", kk: "Құрама садақ", cost: 13, damage: 2, arrow: 0.42 },
  { id: "power_3", type: "power", ru: "Мастерский залп", en: "Master volley", kk: "Шеберлер залпы", cost: 22, damage: 3, arrow: 0.75 },
];

function clamp(min, value, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function moveToward(current, target, maxStep) {
  if (Math.abs(target - current) <= maxStep) return target;
  return current + Math.sign(target - current) * maxStep;
}

function t(language, key, params = {}) {
  const value = I18N[language]?.[key] ?? I18N.ru[key] ?? key;
  return Object.entries(params).reduce(
    (text, [name, replacement]) => text.replaceAll(`{${name}}`, String(replacement)),
    value,
  );
}

function endText(language, key) {
  const copy = {
    ru: {
      alreadyWonTitle: "Игра уже пройдена",
      alreadyWonBody: "Период уже разблокирован. Можно перейти дальше или сыграть ещё раз.",
      retryFailBody: "Пока не засчитано. Нужно продержаться 60 секунд.",
    },
    en: {
      alreadyWonTitle: "Game already completed",
      alreadyWonBody: "The period is already unlocked. You can continue or play again.",
      retryFailBody: "Not completed yet. Hold for 60 seconds.",
    },
    kk: {
      alreadyWonTitle: "Ойын өтілген",
      alreadyWonBody: "Кезең ашылған. Келесіге өтуге немесе қайта ойнауға болады.",
      retryFailBody: "Әлі есептелмеді. 60 секунд шыдау керек.",
    },
  };
  return copy[language]?.[key] ?? copy.ru[key] ?? key;
}

function progressStorageKey() {
  const playerId =
    typeof window !== "undefined"
      ? window.localStorage.getItem("kazakhstan-timeline-player-id") || "guest"
      : "guest";
  return `${PROGRESS_KEY_PREFIX}:${playerId}`;
}

function readLocalProgress() {
  if (typeof window === "undefined") return { attempts: 0, won: false };
  try {
    const raw = window.localStorage.getItem(progressStorageKey());
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      attempts: Number(parsed.attempts) || 0,
      won: Boolean(parsed.won),
    };
  } catch {
    return { attempts: 0, won: false };
  }
}

function writeLocalProgress(progress) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(progressStorageKey(), JSON.stringify(progress));
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function createOverlay(host, title, body, actions) {
  const overlay = document.createElement("div");
  overlay.className =
    "absolute inset-0 z-20 flex items-center justify-center bg-black/35 px-4 backdrop-blur-[2px]";

  const panel = document.createElement("div");
  panel.className =
    "w-full max-w-md rounded-2xl border border-white/70 bg-white/95 p-6 text-center shadow-xl";

  const heading = document.createElement("h2");
  heading.className = "text-2xl font-black text-on-surface";
  heading.textContent = title;
  panel.appendChild(heading);

  if (body) {
    const paragraph = document.createElement("p");
    paragraph.className = "mt-3 text-sm leading-6 text-on-surface-variant";
    paragraph.textContent = body;
    panel.appendChild(paragraph);
  }

  const actionHost = document.createElement("div");
  actionHost.className = "mt-6 flex flex-wrap justify-center gap-3";
  actions.forEach((action, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className =
      index === 0
        ? "inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-bold text-on-primary"
        : "inline-flex h-11 items-center rounded-full bg-surface-container px-6 text-sm font-bold text-on-surface";
    button.textContent = action.label;
    button.addEventListener("click", action.onClick);
    actionHost.appendChild(button);
  });
  panel.appendChild(actionHost);
  overlay.appendChild(panel);
  host.appendChild(overlay);
  return overlay;
}

export async function mountFortressDefense(host, options = {}) {
  const language = options.language || "ru";
  host.innerHTML = `
    <div class="relative w-full h-full overflow-hidden sm:rounded-2xl sm:border sm:border-white/70 bg-[#b98f58] sm:shadow-lg select-none" style="touch-action:none;overscroll-behavior:contain">
      <canvas class="block w-full h-full bg-[#c69b62] sm:max-h-[620px]" data-game-canvas></canvas>
      <div class="pointer-events-none absolute left-2 right-2 top-2 z-10 flex items-center justify-between gap-2 text-[10px] font-black text-white drop-shadow-sm sm:left-4 sm:right-4 sm:top-4 sm:text-sm" data-hud-row>
        <div class="flex items-center gap-2">
          <button class="pointer-events-auto hidden rounded-full bg-[#f2b83a] px-3 py-1.5 text-[10px] font-black text-[#35200b] shadow-lg ring-1 ring-white/70 sm:px-4 sm:py-2 sm:text-sm" type="button" data-shop-toggle>Магазин</button>
          <div class="rounded-full bg-black/35 px-3 py-1.5 sm:px-4 sm:py-2" data-wall></div>
          <div class="rounded-full bg-[#ffd91f] px-3 py-1.5 text-[#2a1706] font-black shadow-lg ring-2 ring-[#8a5a12] text-[12px] sm:text-base sm:px-5 sm:py-2.5" data-timer></div>
        </div>
        <button class="pointer-events-auto rounded-full bg-black/35 px-3 py-1.5 sm:px-4 sm:py-2" type="button" data-pause></button>
        <div class="rounded-full bg-black/35 px-3 py-1.5 sm:px-4 sm:py-2" data-coins></div>
      </div>
      <div class="pointer-events-none absolute inset-0 z-20 hidden bg-black/10 backdrop-blur-[3px]" data-shop-backdrop></div>
      <div class="pointer-events-auto absolute left-1/2 top-1/2 z-30 hidden max-h-[min(74vh,520px)] w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-white/70 bg-white/95 p-5 shadow-2xl" data-shop-panel></div>

      <!-- Orientation lock overlay (z-50, highest priority) -->
      <div class="absolute inset-0 z-50 hidden flex-col items-center justify-center bg-black px-6 text-center text-white" data-orientation-lock>
        <svg viewBox="0 0 24 24" class="mb-6 h-16 w-16 sm:h-24 sm:w-24 animate-pulse text-[#ffd709]" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="5" y="2" width="14" height="20" rx="2"></rect>
          <path d="M12 18h.01"></path>
          <path d="M20 10a8 8 0 0 1 0 4"></path>
          <path d="M4 10a8 8 0 0 0 0 4"></path>
        </svg>
        <h3 class="mb-2 text-2xl sm:text-3xl font-black tracking-tight text-[#ffd709]">Поверни телефон</h3>
        <p class="max-w-sm text-sm sm:text-base text-white/70 leading-relaxed font-medium">
          Игра рассчитана на горизонтальную ориентацию экрана. Переверни устройство, чтобы продолжить.
        </p>
      </div>
    </div>
  `;

  const frame = host.firstElementChild;
  const canvas = host.querySelector("[data-game-canvas]");
  const ctx = canvas.getContext("2d");
  const wallEl = host.querySelector("[data-wall]");
  const coinsEl = host.querySelector("[data-coins]");
  const timerEl = host.querySelector("[data-timer]");
  const pauseButton = host.querySelector("[data-pause]");
  const shopToggle = host.querySelector("[data-shop-toggle]");
  const shopPanel = host.querySelector("[data-shop-panel]");
  const shopBackdrop = host.querySelector("[data-shop-backdrop]");
  const baseUrl = new URL(".", import.meta.url);
  const raider = await loadImage(new URL("../caravan-runner/assets/raider_on_horse_static_left.png", baseUrl).href);
  const eliteRaider = await loadImage(new URL("./assets/elite-raider-left.png", import.meta.url).href);
  const battlefieldMap = await loadImage(new URL("./assets/battlefield-map.webp", import.meta.url).href);

  let width = 960;
  let height = 540;
  let rafId = 0;
  let lastTime = 0;
  let running = false;
  let paused = false;
  let shopOpen = false;
  let overlay = null;
  let nextEnemyId = 1;

  const state = {
    wall: 100,
    coins: INITIAL_COINS,
    score: 0,
    attemptNumber: readLocalProgress().attempts,
    elapsed: 0,
    enemies: [],
    projectiles: [],
    coinDrops: [],
    spawnTimer: 0,
    survivalBonusAwarded: false,
    archers: [],
    purchased: new Set(),
    effects: [],
    upgrades: {
      moveMultiplier: 1,
      cooldownMultiplier: 1,
      damage: 1,
      arrowSpeedMultiplier: 1,
    },
  };

  function roofRect() {
    return {
      x: width * 0.035,
      y: height * 0.055,
      width: Math.max(132, width * 0.22),
      height: height * 0.86,
    };
  }

  // Slot positions measured from battlefield-map.webp (1659×948).
  // Three round stone pads sit inside the fortress on the left side; archers
  // must render centered on them. Using image-space ratios (not canvas-space)
  // so slots stay aligned regardless of how `drawGround` cover-fits the image
  // into the current canvas.
  const SLOT_RATIOS = [
    { x: 0.137, y: 0.231 }, // top
    { x: 0.137, y: 0.453 }, // middle
    { x: 0.137, y: 0.650 }, // bottom
  ];

  // Per-lane pixel nudges applied only on fine-pointer desktop where the
  // art-space ratios don't perfectly land archers on top of the stone pads.
  // Tuned by user feedback (2026-05-03).
  const isDesktopPointer =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const DESKTOP_NUDGE = [
    { dx: 16, dy: 9 },  // top:    right 16, down 9
    { dx: 16, dy: -8 }, // middle: right 16, up 8
    { dx: 16, dy: -7 }, // bottom: right 16, up 7
  ];

  function groundTransform() {
    const imgW = battlefieldMap.naturalWidth || 1659;
    const imgH = battlefieldMap.naturalHeight || 948;
    const scale = Math.max(width / imgW, height / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    return {
      scale,
      drawW,
      drawH,
      offsetX: (width - drawW) / 2,
      offsetY: (height - drawH) / 2,
    };
  }

  function archerSlot(lane) {
    if (isDesktopPointer) {
      // Desktop: image-space ratios + per-lane nudges tuned to the sprite art.
      const g = groundTransform();
      const r = SLOT_RATIOS[lane] || SLOT_RATIOS[1];
      const nudge = DESKTOP_NUDGE[lane] || { dx: 0, dy: 0 };
      return {
        x: g.offsetX + g.drawW * r.x + nudge.dx,
        y: g.offsetY + g.drawH * r.y + nudge.dy,
      };
    }
    // Mobile / touch: legacy canvas-space math. Archers were already
    // aligned correctly on phones; restore the pre-refactor formula
    // per user feedback (2026-05-03).
    const roof = roofRect();
    const laneOffset = [-17, -2, 13][lane] ?? 0;
    return {
      x: roof.x + roof.width * 0.54 - 1,
      y: roof.y + roof.height * ([0.18, 0.44, 0.7][lane] ?? 0.44) + laneOffset,
    };
  }

  function laneY(lane) {
    if (isDesktopPointer) return archerSlot(lane).y;
    // Mobile: legacy lane centers so enemy paths align with archers.
    const centers = [0.2, 0.43, 0.66];
    return height * (centers[lane] ?? centers[1]);
  }

  function coinTarget() {
    return { x: width - 58, y: 34 };
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(320, Math.floor(rect.width));
    height = Math.max(220, Math.floor(rect.height));
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    state.archers.forEach((archer, index) => {
      const slot = archerSlot(index);
      archer.x = archer.x || slot.x;
      archer.y = archer.y || slot.y;
      archer.homeLane = index;
    });
  }

  function removeOverlay() {
    overlay?.remove();
    overlay = null;
  }

  function updateHud() {
    wallEl.textContent = t(language, "wall", { n: Math.max(0, Math.round(state.wall)) });
    coinsEl.textContent = t(language, "coins", { n: state.coins });
    if (timerEl) {
      const secondsLeft = Math.max(0, Math.ceil(DEFENSE_SECONDS - state.elapsed));
      timerEl.textContent = t(language, "time", { n: secondsLeft });
      // Visual cue when < 10 s.
      timerEl.classList.toggle("text-red-700", secondsLeft <= 10);
      timerEl.classList.toggle("animate-pulse", secondsLeft <= 10);
    }
    pauseButton.textContent = paused ? t(language, "continue") : t(language, "pause");
    shopToggle.classList.toggle("hidden", !running);
  }

  function packTitle(pack) {
    return pack[language] || pack.ru;
  }

  function packDescription(pack) {
    if (pack.type === "speed") {
      return `Бег +${Math.round(pack.move * 100)}%, скорость огня +${Math.round((1 - pack.cooldown) * 100)}%`;
    }
    return `Урон +${pack.damage}, скорость стрел +${Math.round(pack.arrow * 100)}%`;
  }

  function renderShop() {
    if (!shopPanel) return;
    shopPanel.classList.toggle("hidden", !shopOpen);
    shopBackdrop?.classList.toggle("hidden", !shopOpen);
    if (!shopOpen) return;
    const cards = SHOP_PACKS.map((pack) => {
      const bought = state.purchased.has(pack.id);
      const affordable = state.coins >= pack.cost;
      return `
        <div class="flex min-w-0 items-stretch gap-3 border p-3 transition ${
          bought
            ? "border-emerald-300 bg-emerald-50 text-emerald-900"
            : affordable
              ? "border-[#d8b46c] bg-[#fff0b8] text-[#35200b] shadow-sm"
              : "border-slate-200 bg-slate-100 text-slate-400 opacity-70 saturate-50"
        }" style="border-radius:18px;">
          <div class="flex min-w-0 flex-1 flex-col justify-center">
            <div class="flex min-w-0 items-center justify-between gap-2">
              <span class="min-w-0 truncate text-sm font-black tracking-tight">${packTitle(pack)}</span>
              <span class="shrink-0 whitespace-nowrap rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide">${bought ? "куплено" : `${pack.cost} мон.`}</span>
            </div>
            <div class="mt-1.5 break-words text-[11px] font-semibold leading-snug opacity-80">${packDescription(pack)}</div>
          </div>
          <button class="grid w-11 shrink-0 place-items-center self-stretch text-2xl font-black transition ${
            bought
              ? "bg-emerald-200 text-emerald-800"
              : affordable
                ? "bg-[#f2b83a] text-[#35200b] shadow-md hover:brightness-105 active:scale-95"
                : "cursor-not-allowed bg-slate-300 text-slate-500"
          }" style="border-radius:14px;" type="button" data-buy-pack="${pack.id}" ${bought || !affordable ? "disabled" : ""}>${bought ? "✓" : "+"}</button>
        </div>
      `;
    }).join("");
    shopPanel.innerHTML = `
      <div class="mb-4 flex items-start justify-between gap-3 border-b border-[#d8b46c]/40 pb-3">
        <div class="min-w-0">
          <div class="text-lg font-black tracking-tight text-on-surface">Магазин лучников</div>
          <div class="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-on-surface-variant">
            <span class="inline-flex items-center gap-1 rounded-full bg-[#f2b83a]/90 px-2.5 py-0.5 text-[#4a2e15] shadow-sm ring-1 ring-white/50">
              Монеты: ${state.coins}
            </span>
          </div>
        </div>
        <button class="shrink-0 grid h-9 w-9 place-items-center rounded-full bg-black/5 text-xl font-black leading-none text-on-surface-variant transition hover:bg-black/10 hover:text-on-surface" type="button" data-shop-close aria-label="Закрыть">×</button>
      </div>
      <div class="grid gap-2 sm:grid-cols-2">${cards}</div>
    `;
    shopPanel.querySelector("[data-shop-close]")?.addEventListener("click", toggleShop);
    shopPanel.querySelectorAll("[data-buy-pack]").forEach((button) => {
      button.addEventListener("click", () => buyPack(button.dataset.buyPack));
    });
  }

  function buyPack(packId) {
    const pack = SHOP_PACKS.find((item) => item.id === packId);
    if (!pack || state.purchased.has(pack.id) || state.coins < pack.cost) return;
    state.coins -= pack.cost;
    state.purchased.add(pack.id);
    state.upgrades.moveMultiplier += pack.move || 0;
    state.upgrades.cooldownMultiplier *= pack.cooldown || 1;
    state.upgrades.damage += pack.damage || 0;
    state.upgrades.arrowSpeedMultiplier += pack.arrow || 0;
    state.effects.push({
      kind: "buy",
      text: packTitle(pack),
      x: archerSlot(1).x,
      y: roofRect().y + 28,
      age: 0,
    });
    updateHud();
    renderShop();
  }

  function toggleShop() {
    if (!running) return;
    shopOpen = !shopOpen;
    renderShop();
  }

  function drawTopDownFortress() {
    [0, 1, 2].forEach((lane) => {
      const slot = archerSlot(lane);
      ctx.fillStyle = "rgba(255, 232, 172, 0.08)";
      ctx.beginPath();
      ctx.arc(slot.x, slot.y, 27, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 232, 172, 0.24)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(slot.x, slot.y, 25, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  function drawGround() {
    const scale = Math.max(width / battlefieldMap.naturalWidth, height / battlefieldMap.naturalHeight);
    const drawWidth = battlefieldMap.naturalWidth * scale;
    const drawHeight = battlefieldMap.naturalHeight * scale;
    ctx.drawImage(battlefieldMap, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
    ctx.fillStyle = "rgba(70, 41, 18, 0.08)";
    ctx.fillRect(0, 0, width, height);
  }

  function drawArcher(archer) {
    const busy = Boolean(archer.targetId);
    ctx.save();
    ctx.translate(archer.x, archer.y);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#1f1710";
    ctx.fillStyle = "rgba(23, 16, 10, 0.22)";
    ctx.beginPath();
    ctx.ellipse(1, 12, 15, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = busy ? "#0e6f68" : "#2f8750";
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = busy ? "#f0b23d" : "#d88d37";
    ctx.fillRect(-9, -4, 18, 5);
    ctx.strokeRect(-9, -4, 18, 5);
    ctx.fillStyle = "#d8aa63";
    ctx.beginPath();
    ctx.arc(0, -10, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#f0d27a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-7, 7);
    ctx.lineTo(7, -2);
    ctx.stroke();
    ctx.strokeStyle = "#4b2b16";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(12, -1, 10, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawRaider(enemy) {
    const image = enemy.type === "elite" ? eliteRaider : raider;
    const maxWidth = Math.min(155, width * 0.2);
    const maxHeight = Math.min(116, height * 0.18);
    const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;

    ctx.fillStyle = "rgba(38, 28, 18, 0.12)";
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y + drawHeight * 0.34, drawWidth * 0.28, drawHeight * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(image, enemy.x - drawWidth / 2, enemy.y - drawHeight / 2, drawWidth, drawHeight);

    const barWidth = Math.max(44, drawWidth * 0.72);
    const barX = enemy.x - barWidth / 2;
    const barY = enemy.y - drawHeight * 0.58;
    ctx.fillStyle = "rgba(30, 20, 16, 0.58)";
    ctx.fillRect(barX, barY, barWidth, 7);
    const maxHp = enemy.maxHp || ENEMY_HP;
    ctx.fillStyle = enemy.type === "elite" ? "#d6422b" : enemy.hp > 1 ? "#36b56a" : "#d64a36";
    ctx.fillRect(barX, barY, barWidth * (enemy.hp / maxHp), 7);
    ctx.strokeStyle = "#211710";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, 7);

  }

  function drawArrow(projectile) {
    const angle = Math.atan2(projectile.toY - projectile.y, projectile.toX - projectile.x);
    ctx.save();
    ctx.translate(projectile.x, projectile.y);
    ctx.rotate(angle);
    ctx.strokeStyle = "#2a1c12";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(18, 0);
    ctx.stroke();
    ctx.fillStyle = "#d8c58f";
    ctx.beginPath();
    ctx.moveTo(21, 0);
    ctx.lineTo(9, -5);
    ctx.lineTo(9, 5);
    ctx.fill();
    ctx.restore();
  }

  function drawCoinDrop(coin) {
    const target = coinTarget();
    const delay = 0.75;
    const travel = clamp(0, (coin.age - delay) / 1.05, 1);
    const arc = Math.sin(travel * Math.PI) * 52;
    const x = lerp(coin.startX, target.x, travel);
    const y = lerp(coin.startY, target.y, travel) - arc;
    const pulse = 1 + Math.sin(coin.age * 12) * 0.08;

    ctx.fillStyle = "rgba(70, 42, 10, 0.18)";
    ctx.beginPath();
    ctx.ellipse(x, y + 10, 13, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f2b83a";
    ctx.strokeStyle = "#5e3a12";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 11 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fff2a8";
    ctx.fillRect(x - 4, y - 6, 3, 8);
  }

  function drawEffects(dt = 0) {
    state.effects.forEach((effect) => {
      effect.age += dt;
      const lifetime = effect.kind === "bonus" ? 2.4 : 0.9;
      const fadeIn = effect.kind === "bonus" ? clamp(0, effect.age / 0.18, 1) : 1;
      const fadeOut = clamp(0, (lifetime - effect.age) / 0.45, 1);
      const alpha = Math.min(fadeIn, fadeOut);
      ctx.save();
      ctx.globalAlpha = alpha;
      if (effect.kind === "bonus") {
        const y = 52 - Math.max(0, 1 - fadeIn) * 18;
        const text = effect.text;
        ctx.font = "900 18px system-ui, sans-serif";
        const textWidth = ctx.measureText(text).width;
        const boxWidth = Math.min(width - 40, textWidth + 54);
        const x = width / 2 - boxWidth / 2;
        ctx.fillStyle = "rgba(255, 193, 43, 0.95)";
        ctx.strokeStyle = "rgba(102, 61, 9, 0.45)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, y, boxWidth, 42, 21);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#432607";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, width / 2, y + 21);
        ctx.restore();
        return;
      }
      ctx.fillStyle = effect.kind === "hit" ? "#fff2a8" : "#52f2f5";
      ctx.strokeStyle = "rgba(35, 22, 10, 0.58)";
      ctx.lineWidth = 3;
      if (effect.kind === "hit") {
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, 16 + effect.age * 28, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.font = "900 13px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.strokeText(effect.text, effect.x, effect.y - effect.age * 28);
      ctx.fillText(effect.text, effect.x, effect.y - effect.age * 28);
      ctx.restore();
    });
    state.effects = state.effects.filter((effect) => effect.age < (effect.kind === "bonus" ? 2.4 : 0.9));
  }

  let isPortrait = false;

  function draw(dt = 0) {
    if (isPortrait) {
      // Hide every gameplay element while the orientation prompt is shown.
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, width, height);
      return;
    }
    drawGround();

    state.projectiles.forEach(drawArrow);
    state.enemies.forEach(drawRaider);
    drawTopDownFortress();
    state.archers.forEach(drawArcher);
    state.coinDrops.forEach(drawCoinDrop);
    drawEffects(dt);

    // Time left is now rendered in the DOM HUD (top row), not on canvas —
    // the previous low-contrast canvas text was unreadable on the sand
    // background and obscured on mobile. Keep only the progress bar here.

    const progressWidth = Math.min(360, width * 0.42);
    const progressX = width - progressWidth - 24;
    const progressY = height - 26;
    const progress = clamp(0, state.elapsed / DEFENSE_SECONDS, 1);
    ctx.fillStyle = "rgba(28, 20, 12, 0.28)";
    ctx.fillRect(progressX, progressY, progressWidth, 8);
    ctx.fillStyle = "#f0c65b";
    ctx.fillRect(progressX, progressY, progressWidth * progress, 8);
    ctx.strokeStyle = "rgba(255, 247, 214, 0.68)";
    ctx.lineWidth = 1;
    ctx.strokeRect(progressX, progressY, progressWidth, 8);
  }

  function spawnEnemy() {
    const lane = Math.floor(Math.random() * 3);
    const elite = state.elapsed >= ELITE_ENEMY_START_SECONDS && Math.random() < ELITE_ENEMY_SPAWN_CHANCE;
    state.enemies.push({
      id: nextEnemyId,
      type: elite ? "elite" : "normal",
      lane,
      x: width + 90,
      y: laneY(lane),
      speed: 34 + Math.random() * 16,
      hp: elite ? ELITE_ENEMY_HP : ENEMY_HP,
      maxHp: elite ? ELITE_ENEMY_HP : ENEMY_HP,
      targeted: false,
      assignedArcherIds: [],
      nextReinforcementAt: 0,
      reinforcementStage: 0,
      focusStartedAt: 0,
    });
    nextEnemyId += 1;
  }

  function findEnemyAt(x, y) {
    return state.enemies.find((enemy) => {
      const dx = Math.abs(enemy.x - x);
      const dy = Math.abs(enemy.y - y);
      return dx < Math.min(88, width * 0.11) && dy < Math.min(62, height * 0.12);
    });
  }

  function assignNearestFreeArcher(enemy) {
    if (!enemy || enemy.hp <= 0) return null;
    const slot = archerSlot(enemy.lane);
    const freeArcher = state.archers
      .filter((archer) => !archer.targetId)
      .sort(
        (left, right) =>
          Math.hypot(left.x - slot.x, left.y - slot.y) -
          Math.hypot(right.x - slot.x, right.y - slot.y),
      )[0];
    if (!freeArcher) return null;

    freeArcher.targetId = enemy.id;
    freeArcher.cooldown = 0.12;
    freeArcher.targetLane = enemy.lane;
    if (!enemy.assignedArcherIds.includes(freeArcher.id)) {
      enemy.assignedArcherIds.push(freeArcher.id);
    }
    enemy.targeted = true;
    enemy.nextReinforcementAt =
      enemy.reinforcementStage <= 1
        ? state.elapsed + FIRST_REINFORCEMENT_DELAY
        : state.elapsed + SECOND_REINFORCEMENT_DELAY;
    return freeArcher;
  }

  function requestFocusFire(enemy) {
    if (!enemy || enemy.hp <= 0) return;
    if (enemy.assignedArcherIds.some((id) => state.archers.some((archer) => archer.id === id && archer.targetId === enemy.id))) {
      return;
    }
    const assigned = assignNearestFreeArcher(enemy);
    if (!assigned) return;
    enemy.reinforcementStage = 1;
    enemy.focusStartedAt = state.elapsed;
    enemy.nextReinforcementAt = state.elapsed + FIRST_REINFORCEMENT_DELAY;
  }

  function damageEnemy(enemy, amount) {
    enemy.hp -= amount;
    state.effects.push({
      kind: "hit",
      text: `-${amount}`,
      x: enemy.x,
      y: enemy.y - 26,
      age: 0,
    });
    if (enemy.hp > 0) return;

    state.score += 1;
    state.coinDrops.push({
      startX: enemy.x,
      startY: enemy.y - 10,
      age: 0,
      collected: false,
    });

    state.archers.forEach((archer) => {
      if (archer.targetId === enemy.id) {
        archer.targetId = null;
        archer.cooldown = 0;
        archer.targetLane = archer.homeLane;
      }
    });
  }

  async function finish(victory, messageKey = "") {
    running = false;
    cancelAnimationFrame(rafId);
    const previousProgress = readLocalProgress();
    const alreadyWon = previousProgress.won;
    const completed = victory || alreadyWon;
    const score = Math.max(0, state.coins * 15 + Math.round(state.wall));
    if (victory) {
      try {
        await options.onWin?.({ score, elapsedSeconds: Math.round(state.elapsed) });
        writeLocalProgress({ ...previousProgress, won: true });
      } catch (error) {
        console.error(error);
      }
    }
    const resultText = t(language, "result", {
      coins: state.coins,
      wall: Math.max(0, Math.round(state.wall)),
      time: Math.round(state.elapsed),
    });
    const title = completed
      ? alreadyWon
        ? endText(language, "alreadyWonTitle")
        : t(language, "victory")
      : t(language, "fail");
    const statusText = alreadyWon
      ? endText(language, "alreadyWonBody")
      : messageKey
        ? t(language, messageKey)
        : !victory && state.attemptNumber > 1
          ? endText(language, "retryFailBody")
          : "";
    overlay = createOverlay(
      frame,
      title,
      statusText ? `${statusText}\n${resultText}` : resultText,
      completed
        ? [
            { label: t(language, "next"), onClick: () => options.goToNextPeriod?.() ?? (window.location.href = "../map_hub/code.html") },
            { label: t(language, "replay"), onClick: resetGame },
          ]
        : [{ label: t(language, "restart"), onClick: resetGame }],
    );
  }

  function updateReinforcements() {
    const freeArchers = state.archers.filter((archer) => !archer.targetId);
    if (!freeArchers.length) return;
    const candidates = state.enemies
      .filter((enemy) => enemy.targeted && enemy.hp > 0 && enemy.reinforcementStage > 0 && enemy.reinforcementStage < 3)
      .filter((enemy) => state.elapsed >= enemy.nextReinforcementAt)
      .sort((left, right) => {
        const assignedLeft = state.archers.filter((archer) => archer.targetId === left.id).length;
        const assignedRight = state.archers.filter((archer) => archer.targetId === right.id).length;
        return assignedLeft - assignedRight || left.focusStartedAt - right.focusStartedAt;
      });

    candidates.forEach((enemy) => {
      if (!state.archers.some((archer) => !archer.targetId)) return;
      const assigned = assignNearestFreeArcher(enemy);
      if (!assigned) return;
      enemy.reinforcementStage += 1;
      enemy.nextReinforcementAt =
        enemy.reinforcementStage >= 3
          ? Number.POSITIVE_INFINITY
          : state.elapsed + SECOND_REINFORCEMENT_DELAY;
    });
  }

  function updateArchers(dt) {
    state.archers.forEach((archer) => {
      const target = state.enemies.find((enemy) => enemy.id === archer.targetId && enemy.hp > 0);
      if (!target) {
        archer.targetId = null;
        archer.targetLane = archer.homeLane;
      }

      const slot = archerSlot(archer.targetLane ?? archer.homeLane);
      const maxStep = ARCHER_MOVE_SPEED * state.upgrades.moveMultiplier * dt;
      archer.x = moveToward(archer.x, slot.x, maxStep);
      archer.y = moveToward(archer.y, slot.y, maxStep);

      if (!target) return;
      archer.cooldown -= dt;
      const readyToFire =
        archer.cooldown <= 0 &&
        Math.hypot(archer.x - slot.x, archer.y - slot.y) < 8;
      if (!readyToFire) return;

      state.projectiles.push({
        archerId: archer.id,
        targetId: target.id,
        x: archer.x + 12,
        y: archer.y,
        toX: target.x,
        toY: target.y - 8,
        speed: width * BASE_ARROW_SPEED_FACTOR * state.upgrades.arrowSpeedMultiplier,
        damage: state.upgrades.damage,
      });
      archer.cooldown = ARCHER_FIRE_COOLDOWN * state.upgrades.cooldownMultiplier;
    });
  }

  function updateProjectiles(dt) {
    state.projectiles.forEach((projectile) => {
      const target = state.enemies.find((enemy) => enemy.id === projectile.targetId && enemy.hp > 0);
      if (target) {
        projectile.toX = target.x;
        projectile.toY = target.y - 8;
      }
      const dx = projectile.toX - projectile.x;
      const dy = projectile.toY - projectile.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 14) {
        projectile.hit = true;
        if (target) damageEnemy(target, projectile.damage || 1);
        return;
      }
      const step = Math.min(distance, projectile.speed * dt);
      projectile.x += (dx / distance) * step;
      projectile.y += (dy / distance) * step;
    });
    state.projectiles = state.projectiles.filter((projectile) => !projectile.hit);
  }

  function updateCoins(dt) {
    let collectedAny = false;
    state.coinDrops.forEach((coin) => {
      coin.age += dt;
      if (!coin.collected && coin.age >= 1.85) {
        coin.collected = true;
        state.coins += 1;
        collectedAny = true;
      }
    });
    state.coinDrops = state.coinDrops.filter((coin) => coin.age < 2.05);
    if (collectedAny && shopOpen) renderShop();
  }

  function update(dt) {
    state.elapsed += dt;
    if (!state.survivalBonusAwarded && state.elapsed >= SURVIVAL_BONUS_SECONDS) {
      state.survivalBonusAwarded = true;
      state.coins += SURVIVAL_BONUS_COINS;
      state.effects.push({
        kind: "bonus",
        text: `Бонус: ${SURVIVAL_BONUS_COINS} монет`,
        age: 0,
      });
      if (shopOpen) renderShop();
    }
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnEnemy();
      state.spawnTimer = clamp(1.35, 2.65 - state.elapsed / 42, 2.65);
    }

    const roof = roofRect();
    const breachX = roof.x + roof.width + 18;
    const speedMultiplier =
      1 + Math.floor(state.elapsed / ENEMY_SPEED_STEP_SECONDS) * ENEMY_SPEED_STEP;
    state.enemies.forEach((enemy) => {
      enemy.x -= enemy.speed * speedMultiplier * dt;
    });

    updateReinforcements();
    updateArchers(dt);
    updateProjectiles(dt);
    updateCoins(dt);

    state.enemies = state.enemies.filter((enemy) => {
      if (enemy.hp <= 0) return false;
      if (enemy.x <= breachX) {
        state.wall -= 16;
        state.archers.forEach((archer) => {
          if (archer.targetId === enemy.id) {
            archer.targetId = null;
            archer.targetLane = archer.homeLane;
          }
        });
        return false;
      }
      return true;
    });

    const survivedFullMinute = state.elapsed >= DEFENSE_SECONDS;
    if (state.wall <= 0) {
      finish(survivedFullMinute, survivedFullMinute ? "survivedAfterFall" : "");
      return;
    }
  }

  function loop(time) {
    if (!running || paused) return;
    const dt = Math.min(0.033, (time - lastTime) / 1000 || 0);
    lastTime = time;
    update(dt);
    draw(dt);
    updateHud();
    rafId = requestAnimationFrame(loop);
  }

  function resetGame() {
    removeOverlay();
    resize();
    const progress = readLocalProgress();
    const nextAttemptNumber = progress.attempts + 1;
    writeLocalProgress({ ...progress, attempts: nextAttemptNumber });
    state.attemptNumber = nextAttemptNumber;
    state.wall = 100;
    state.coins = INITIAL_COINS;
    state.score = 0;
    state.elapsed = 0;
    state.enemies = [];
    state.projectiles = [];
    state.coinDrops = [];
    state.effects = [];
    state.purchased = new Set();
    state.upgrades = {
      moveMultiplier: 1,
      cooldownMultiplier: 1,
      damage: 1,
      arrowSpeedMultiplier: 1,
    };
    state.spawnTimer = 0.8;
    state.survivalBonusAwarded = false;
    state.archers = Array.from({ length: ARCHER_COUNT }, (_, index) => {
      const slot = archerSlot(index);
      return {
        id: index + 1,
        homeLane: index,
        targetLane: index,
        targetId: null,
        cooldown: 0,
        x: slot.x,
        y: slot.y,
      };
    });
    paused = false;
    shopOpen = false;
    renderShop();
    running = true;
    lastTime = performance.now();
    updateHud();
    draw();
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  resize();
  state.archers = Array.from({ length: ARCHER_COUNT }, (_, index) => {
    const slot = archerSlot(index);
    return {
      id: index + 1,
      homeLane: index,
      targetLane: index,
      targetId: null,
      cooldown: 0,
      x: slot.x,
      y: slot.y,
    };
  });
  updateHud();
  draw();

  // --- Orientation prompt for narrow portrait screens ---
  const orientationLock = host.querySelector("[data-orientation-lock]");
  const hudRow = host.querySelector("[data-hud-row]");
  const portraitMedia = window.matchMedia(
    "(orientation: portrait) and (max-width: 820px)",
  );
  let pendingReadyOverlay = false;
  const showReadyOverlay = () => {
    overlay = createOverlay(frame, t(language, "title"), t(language, "ready"), [
      { label: t(language, "start"), onClick: resetGame },
      { label: t(language, "exit"), onClick: () => (window.location.href = "../map_hub/code.html") },
    ]);
  };
  const updateOrientationLock = () => {
    if (!orientationLock) return;
    if (portraitMedia.matches) {
      isPortrait = true;
      orientationLock.classList.remove("hidden");
      orientationLock.classList.add("flex");
      hudRow?.classList.add("hidden");
      // Hide any existing in-canvas overlays (ready/finish) until rotated.
      if (overlay) {
        overlay.classList.add("hidden");
      }
      if (running && !paused) {
        paused = true;
        updateHud();
      }
      draw();
    } else {
      isPortrait = false;
      orientationLock.classList.add("hidden");
      orientationLock.classList.remove("flex");
      hudRow?.classList.remove("hidden");
      if (overlay) {
        overlay.classList.remove("hidden");
      }
      if (pendingReadyOverlay) {
        pendingReadyOverlay = false;
        showReadyOverlay();
      }
      draw();
    }
  };
  portraitMedia.addEventListener("change", updateOrientationLock);
  window.addEventListener("orientationchange", updateOrientationLock);

  // Show ready overlay only when in landscape; otherwise wait for rotation.
  if (portraitMedia.matches) {
    pendingReadyOverlay = true;
    updateOrientationLock();
  } else {
    showReadyOverlay();
  }

  pauseButton.addEventListener("click", () => {
    if (!running) return;
    paused = !paused;
    if (!paused) shopOpen = false;
    updateHud();
    if (!paused) {
      lastTime = performance.now();
      rafId = requestAnimationFrame(loop);
    }
  });

  shopToggle.addEventListener("click", toggleShop);

  canvas.addEventListener("pointerdown", (event) => {
    if (!running || paused) return;
    const rect = canvas.getBoundingClientRect();
    const enemy = findEnemyAt(event.clientX - rect.left, event.clientY - rect.top);
    if (enemy) requestFocusFire(enemy);
  });

  window.addEventListener("keydown", (event) => {
    if (event.code !== "Space" && event.code !== "Enter") return;
    const firstUntargeted = state.enemies.find((enemy) => !enemy.targeted) || state.enemies[0];
    if (firstUntargeted) {
      event.preventDefault();
      requestFocusFire(firstUntargeted);
    }
  });

  window.addEventListener("resize", () => {
    resize();
    draw();
  });
}
