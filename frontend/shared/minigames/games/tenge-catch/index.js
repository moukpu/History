const I18N = {
  ru: {
    title: "Лови тенге",
    ready: "Собери минимум 1000 тенге за 60 секунд. Лови купюры тенге и избегай знаков штрафа.",
    start: "Начать",
    exit: "Выйти",
    score: "Тенге: {n}",
    time: "Время: {n} с",
    bonus: "Бонус: x2",
    slow: "",
    victory: "Победа! Период разблокирован",
    fail: "Не хватает тенге",
    unlockError: "Цель достигнута, но сервер не сохранил разблокировку. Проверь backend и попробуй ещё раз.",
    fact: "Тенге вошёл в обращение 15 ноября 1993 года, заменив советский рубль и став визуальным символом независимого Казахстана.",
    replay: "Играть снова",
    next: "Перейти к следующему периоду",
    restart: "Заново",
  },
  en: {
    title: "Catch the Tenge",
    ready: "Collect at least 1000 tenge in 60 seconds. Catch tenge banknotes and avoid penalty signs.",
    start: "Start",
    exit: "Exit",
    score: "Tenge: {n}",
    time: "Time: {n} s",
    bonus: "Bonus: x2",
    slow: "",
    victory: "Victory! Period unlocked",
    fail: "Not enough tenge",
    unlockError: "The goal is complete, but the server did not save the unlock. Check the backend and try again.",
    fact: "The tenge entered circulation on November 15, 1993, replacing the Soviet ruble and shaping the visual identity of independent Kazakhstan.",
    replay: "Play again",
    next: "Continue to next period",
    restart: "Restart",
  },
  kk: {
    title: "Теңгені ұста",
    ready: "60 секунд ішінде кемінде 1000 теңге жина. Теңге купюраларын ұста, айыппұл белгілерінен сақтан.",
    start: "Бастау",
    exit: "Шығу",
    score: "Теңге: {n}",
    time: "Уақыт: {n} с",
    bonus: "Бонус: x2",
    slow: "",
    victory: "Жеңіс! Кезең ашылды",
    fail: "Теңге жетпеді",
    unlockError: "Мақсат орындалды, бірақ сервер ашуды сақтамады. Backend жұмысын тексеріп, қайта көр.",
    fact: "Теңге 1993 жылдың 15 қарашасында айналымға еніп, кеңестік рубльді алмастырды және тәуелсіз Қазақстанның визуалды бейнесін қалыптастырды.",
    replay: "Қайта ойнау",
    next: "Келесі кезеңге өту",
    restart: "Қайта бастау",
  },
};

const GAME_SECONDS = 60;
const TARGET_SCORE = 1000;
const FALL_SPEED = 148;
const SPAWN_INTERVAL = 0.62;
const NOTES = [
  { type: "note", value: 1, asset: "tenge_1", width: 106, height: 62 },
  { type: "note", value: 5, asset: "tenge_5", width: 106, height: 62 },
  { type: "note", value: 10, asset: "tenge_10", width: 106, height: 62 },
  { type: "note", value: 20, asset: "tenge_20", width: 106, height: 64 },
  { type: "note", value: 50, asset: "tenge_50", width: 106, height: 61 },
];
const DECOYS = [
  { type: "bad", value: -7, asset: "penalty_minus7", width: 70, height: 70 },
  { type: "bad", value: -6, asset: "penalty_minus6", width: 70, height: 70 },
  { type: "bad", value: -5, asset: "penalty_minus5", width: 70, height: 70 },
];
const BONUSES = [
  { type: "double", value: 0, asset: "bonus_x2", width: 70, height: 70 },
];

function t(language, key, params = {}) {
  const value = I18N[language]?.[key] ?? I18N.ru[key] ?? key;
  return Object.entries(params).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), value);
}

function clamp(min, value, max) {
  return Math.min(max, Math.max(min, value));
}

function createOverlay(host, title, body, actions) {
  const overlay = document.createElement("div");
  overlay.className = "absolute inset-0 z-20 flex items-center justify-center bg-black/35 px-4 backdrop-blur-[2px]";
  const panel = document.createElement("div");
  panel.className = "w-full max-w-md rounded-2xl border border-white/70 bg-white/95 p-6 text-center shadow-xl";
  panel.innerHTML = `<h2 class="text-2xl font-black text-on-surface"></h2><p class="mt-3 text-sm leading-6 text-on-surface-variant"></p><div class="mt-6 flex flex-wrap justify-center gap-3"></div>`;
  panel.querySelector("h2").textContent = title;
  panel.querySelector("p").textContent = body;
  const actionHost = panel.querySelector("div");
  actions.forEach((action, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = index === 0
      ? "inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-bold text-on-primary"
      : "inline-flex h-11 items-center rounded-full bg-surface-container px-6 text-sm font-bold text-on-surface";
    button.textContent = action.label;
    button.addEventListener("click", action.onClick);
    actionHost.appendChild(button);
  });
  overlay.appendChild(panel);
  host.appendChild(overlay);
  return overlay;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

export async function mountTengeCatch(host, options = {}) {
  const language = options.language || "ru";
  const marketTexture = await loadImage(new URL("./assets/market-floor.webp", import.meta.url).href);
  const itemAssets = {};
  await Promise.all(
    [...NOTES, ...DECOYS, ...BONUSES].map(async (item) => {
      if (!itemAssets[item.asset]) {
        itemAssets[item.asset] = await loadImage(new URL(`./assets/items/${item.asset}.png`, import.meta.url).href);
      }
    }),
  );
  host.innerHTML = `
    <div class="relative w-full h-full overflow-hidden sm:rounded-2xl sm:border sm:border-white/70 bg-[#b98f58] sm:shadow-lg select-none" style="touch-action:none;overscroll-behavior:contain">
      <canvas class="block w-full h-full bg-[#c69b62] sm:max-h-[620px]" data-canvas></canvas>
      <div class="pointer-events-none absolute left-2 right-2 top-2 z-20 flex items-center justify-between gap-2 text-xs font-black text-white drop-shadow-sm sm:left-3 sm:right-3 sm:top-3 sm:text-sm" style="position:absolute;left:8px;right:8px;top:8px;z-index:20;display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <div class="rounded-full bg-black/35 px-3 py-1.5 sm:px-4 sm:py-2" style="background:rgba(0,0,0,0.45);color:#fff;padding:6px 12px;border-radius:9999px;min-width:60px;text-align:center;" data-score>Тенге: 0</div>
        <div class="rounded-full bg-black/35 px-3 py-1.5 sm:px-4 sm:py-2" style="background:rgba(0,0,0,0.45);color:#fff;padding:6px 12px;border-radius:9999px;min-width:60px;text-align:center;" data-time>Время: 60 с</div>
        <div class="rounded-full bg-black/35 px-3 py-1.5 sm:px-4 sm:py-2" style="background:rgba(0,0,0,0.45);color:#fff;padding:6px 12px;border-radius:9999px;min-width:30px;text-align:center;" data-effect> </div>
      </div>
    </div>
  `;

  const frame = host.firstElementChild;
  const canvas = host.querySelector("[data-canvas]");
  const ctx = canvas.getContext("2d");
  const scoreEl = host.querySelector("[data-score]");
  const timeEl = host.querySelector("[data-time]");
  const effectEl = host.querySelector("[data-effect]");

  let width = 960;
  let height = 540;
  let dpr = 1;
  let rafId = 0;
  let lastTime = 0;
  let running = false;
  let overlay = null;
  let completed = false;
  const state = {
    elapsed: 0,
    score: 0,
    spawnTimer: 0,
    bonusTimer: 8,
    doubleUntil: 0,
    slowUntil: 0,
    basketX: 0.5,
    targetX: 0.5,
    shake: 0,
    items: [],
  };

  function removeOverlay() {
    overlay?.remove();
    overlay = null;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(320, Math.floor(rect.width));
    height = Math.max(220, Math.floor(rect.height));
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Reserved area for the HUD (score / time / effect chips). Items render
  // below this so they never visually clash with the UI.
  function hudHeight() {
    return width < 600 ? 56 : 70;
  }

  // Scale all sprites down on small canvases so the playfield isn't trivial.
  function spriteScale() {
    if (width < 480) return 0.55;
    if (width < 720) return 0.7;
    return 1;
  }

  function updateHud() {
    scoreEl.textContent = t(language, "score", { n: state.score });
    timeEl.textContent = t(language, "time", { n: Math.max(0, Math.ceil(GAME_SECONDS - state.elapsed)) });
    const effects = [];
    if (state.doubleUntil > state.elapsed) effects.push(t(language, "bonus"));
    if (state.slowUntil > state.elapsed) effects.push(t(language, "slow"));
    effectEl.textContent = effects.join(" · ") || " ";
  }

  function spawn(forceBonus = false) {
    const pool = forceBonus ? BONUSES : (Math.random() < 0.74 ? NOTES : DECOYS);
    const proto = pool[Math.floor(Math.random() * pool.length)];
    const scale = spriteScale();
    const drawWidth = proto.width * scale;
    const drawHeight = proto.height * scale;
    state.items.push({
      ...proto,
      x: drawWidth / 2 + 6 + Math.random() * (width - drawWidth - 12),
      y: hudHeight() - drawHeight,
      wobble: Math.random() * Math.PI * 2,
      speed: FALL_SPEED,
      drawWidth,
      drawHeight,
    });
  }

  function drawBackground() {
    const scale = Math.max(width / marketTexture.naturalWidth, height / marketTexture.naturalHeight);
    const drawWidth = marketTexture.naturalWidth * scale;
    const drawHeight = marketTexture.naturalHeight * scale;
    ctx.drawImage(marketTexture, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
    ctx.fillStyle = "rgba(84, 49, 24, 0.2)";
    ctx.fillRect(0, 0, width, height);
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#a86c42");
    gradient.addColorStop(0.55, "rgba(215, 167, 98, 0.28)");
    gradient.addColorStop(1, "#7a5738");
    ctx.fillStyle = gradient;
    ctx.globalAlpha = 0.24;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    for (let i = 0; i < 12; i += 1) {
      const x = (i * 131) % width;
      const y = 75 + ((i * 71) % Math.max(1, height - 150));
      ctx.fillRect(x, y, 78, 4);
      ctx.fillRect(x + 6, y + 12, 52, 3);
    }
    ctx.fillStyle = "rgba(44,31,20,0.25)";
    ctx.fillRect(0, height - 78, width, 78);
  }

  function drawTargetProgress() {
    const barWidth = Math.min(420, width * 0.58);
    const x = (width - barWidth) / 2;
    const y = 58;
    const progress = clamp(0, state.score / TARGET_SCORE, 1);
    ctx.fillStyle = "rgba(28, 20, 12, 0.3)";
    ctx.fillRect(x, y, barWidth, 9);
    ctx.fillStyle = progress >= 1 ? "#36b56a" : "#f0c65b";
    ctx.fillRect(x, y, barWidth * progress, 9);
    ctx.strokeStyle = "rgba(255, 247, 214, 0.72)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, barWidth, 9);
    ctx.fillStyle = "rgba(255, 247, 214, 0.88)";
    ctx.font = "800 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${Math.min(TARGET_SCORE, state.score)}/${TARGET_SCORE}`, width / 2, y + 24);
    ctx.textAlign = "left";
  }

  function drawNote(item) {
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(Math.sin(item.wobble + state.elapsed * 2.8) * 0.045);
    const image = itemAssets[item.asset];
    const w = item.drawWidth;
    const h = item.drawHeight;
    if (image) {
      ctx.drawImage(image, -w / 2, -h / 2, w, h);
    }
    ctx.restore();
  }

  function drawBasket() {
    const scale = spriteScale();
    const x = state.basketX * width + Math.sin(state.shake * 32) * 8;
    const y = height - 36 - 16 * scale;
    ctx.fillStyle = "rgba(30,20,12,0.25)";
    ctx.beginPath();
    ctx.ellipse(x, y + 22 * scale, 66 * scale, 12 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8d5a30";
    ctx.strokeStyle = "#2a1b10";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x - 74 * scale, y - 18 * scale);
    ctx.lineTo(x + 74 * scale, y - 18 * scale);
    ctx.lineTo(x + 52 * scale, y + 28 * scale);
    ctx.lineTo(x - 52 * scale, y + 28 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,220,140,0.55)";
    ctx.lineWidth = 3;
    for (let i = -50; i <= 50; i += 20) {
      ctx.beginPath();
      ctx.moveTo(x + i * scale, y - 15 * scale);
      ctx.lineTo(x + i * 0.68 * scale, y + 24 * scale);
      ctx.stroke();
    }
  }

  function draw() {
    drawBackground();
    drawTargetProgress();
    // Clip every falling item to render only below the HUD strip so they
    // never visually overlap with the score / time / effect chips.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, hudHeight(), width, height - hudHeight());
    ctx.clip();
    state.items.forEach(drawNote);
    ctx.restore();
    drawBasket();
  }

  async function finish(victory) {
    if (!running) return;
    running = false;
    cancelAnimationFrame(rafId);
    let unlockFailed = false;
    if (victory && !completed) {
      completed = true;
      try {
        await options.onWin?.({ score: state.score, elapsedSeconds: Math.round(state.elapsed) });
      } catch (error) {
        console.error(error);
        unlockFailed = true;
      }
    }
    overlay = createOverlay(
      frame,
      victory && !unlockFailed ? t(language, "victory") : t(language, "fail"),
      victory ? (unlockFailed ? t(language, "unlockError") : t(language, "fact")) : t(language, "ready"),
      victory && !unlockFailed
        ? [
            { label: t(language, "replay"), onClick: reset },
            { label: t(language, "next"), onClick: () => options.goToNextPeriod?.() ?? (window.location.href = "../map_hub/code.html") },
          ]
        : [{ label: t(language, "restart"), onClick: reset }],
    );
  }

  function update(dt) {
    state.elapsed += dt;
    state.spawnTimer -= dt;
    state.bonusTimer -= dt;
    state.basketX += (state.targetX - state.basketX) * Math.min(1, dt * 10);
    state.shake = Math.max(0, state.shake - dt);
    if (state.spawnTimer <= 0) {
      spawn(false);
      state.spawnTimer = SPAWN_INTERVAL;
    }
    if (state.bonusTimer <= 0) {
      spawn(true);
      state.bonusTimer = 14;
    }
    state.items.forEach((item) => {
      item.y += item.speed * dt;
      item.wobble += dt;
    });
    const basketCenterX = state.basketX * width;
    const basketScale = spriteScale();
    const basketHalfWidth = 74 * basketScale;
    const basketLeft = basketCenterX - basketHalfWidth;
    const basketRight = basketCenterX + basketHalfWidth;
    const basketTop = height - 36 - 16 * basketScale - 18 * basketScale;
    const basketBottom = height - 36 - 16 * basketScale + 28 * basketScale;
    state.items = state.items.filter((item) => {
      const halfW = item.drawWidth / 2;
      const halfH = item.drawHeight / 2;
      const caught =
        item.x + halfW >= basketLeft &&
        item.x - halfW <= basketRight &&
        item.y + halfH >= basketTop &&
        item.y - halfH <= basketBottom;
      if (!caught) return item.y < height + 80;
      if (item.type === "double") {
        state.doubleUntil = state.elapsed + 5;
      } else {
        const multiplier = state.doubleUntil > state.elapsed && item.value > 0 ? 2 : 1;
        state.score = Math.max(0, state.score + item.value * multiplier);
        if (item.value < 0) state.shake = 0.35;
      }
      return false;
    });
    if (state.elapsed >= GAME_SECONDS) finish(state.score >= TARGET_SCORE);
  }

  function loop(time) {
    if (!running) return;
    const dt = Math.min(0.033, (time - lastTime) / 1000 || 0);
    lastTime = time;
    update(dt);
    draw();
    updateHud();
    rafId = requestAnimationFrame(loop);
  }

  function reset() {
    removeOverlay();
    resize();
    Object.assign(state, {
      elapsed: 0,
      score: 0,
      spawnTimer: 0.2,
      bonusTimer: 8,
      doubleUntil: 0,
      slowUntil: 0,
      basketX: 0.5,
      targetX: 0.5,
      shake: 0,
      items: [],
    });
    completed = false;
    running = true;
    lastTime = performance.now();
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  function setTargetFromClientX(clientX) {
    const rect = canvas.getBoundingClientRect();
    state.targetX = clamp(0.08, (clientX - rect.left) / Math.max(1, rect.width), 0.92);
  }

  canvas.addEventListener("pointerdown", (event) => {
    canvas.setPointerCapture?.(event.pointerId);
    setTargetFromClientX(event.clientX);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (event.buttons || event.pointerType === "touch") setTargetFromClientX(event.clientX);
  });
  window.addEventListener("keydown", (event) => {
    if (event.code === "ArrowLeft") state.targetX = clamp(0.08, state.targetX - 0.08, 0.92);
    if (event.code === "ArrowRight") state.targetX = clamp(0.08, state.targetX + 0.08, 0.92);
  });
  window.addEventListener("resize", () => {
    resize();
    draw();
  });

  resize();
  updateHud();
  draw();
  overlay = createOverlay(frame, t(language, "title"), t(language, "ready"), [
    { label: t(language, "start"), onClick: reset },
    { label: t(language, "exit"), onClick: () => (window.location.href = "../map_hub/code.html") },
  ]);
}
