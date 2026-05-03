const I18N = {
  ru: {
    title: "Мемори: исторические личности",
    ready: "Найди 8 пар за 60 секунд. После пары откроется короткая справка.",
    start: "Начать",
    exit: "Выйти",
    time: "Время: {n} с",
    moves: "Ходы: {n}",
    pairs: "Пары: {n}/8",
    victory: "Победа! Период разблокирован",
    fail: "Время вышло",
    hint: "Собирай одинаковые портреты исторических личностей. Открой все 8 пар, чтобы разблокировать следующий период.",
    unlockError: "Пары собраны, но сервер не записал разблокировку. Проверь backend и попробуй ещё раз.",
    fact: "За советский период выросло поколение учёных, писателей, военных и артистов, ставших символами культурной преемственности независимого Казахстана.",
    replay: "Играть снова",
    next: "Перейти к следующему периоду",
    restart: "Заново",
  },
  en: {
    title: "Memory: Historical Figures",
    ready: "Find all 8 pairs in 60 seconds. Each match opens a short note.",
    start: "Start",
    exit: "Exit",
    time: "Time: {n} s",
    moves: "Moves: {n}",
    pairs: "Pairs: {n}/8",
    victory: "Victory! Period unlocked",
    fail: "Time is up",
    hint: "Match identical portraits of historical figures. Open all 8 pairs to unlock the next period.",
    unlockError: "The pairs are complete, but the server did not save the unlock. Check the backend and try again.",
    fact: "The Soviet period produced scientists, writers, soldiers, and artists who became symbols of cultural continuity in independent Kazakhstan.",
    replay: "Play again",
    next: "Continue to next period",
    restart: "Restart",
  },
  kk: {
    title: "Мемори: тарихи тұлғалар",
    ready: "60 секунд ішінде 8 жұпты тап. Әр жұптан кейін қысқа мәлімет ашылады.",
    start: "Бастау",
    exit: "Шығу",
    time: "Уақыт: {n} с",
    moves: "Жүріс: {n}",
    pairs: "Жұп: {n}/8",
    victory: "Жеңіс! Кезең ашылды",
    fail: "Уақыт аяқталды",
    hint: "Тарихи тұлғалардың бірдей портреттерін тап. Келесі кезеңді ашу үшін 8 жұптың бәрін жина.",
    unlockError: "Жұптар жиналды, бірақ сервер ашуды сақтамады. Backend жұмысын тексеріп, қайта көр.",
    fact: "Кеңестік кезеңде тәуелсіз Қазақстан мәдениетінің сабақтастығын танытқан ғалымдар, жазушылар, әскерилер мен өнер қайраткерлері қалыптасты.",
    replay: "Қайта ойнау",
    next: "Келесі кезеңге өту",
    restart: "Қайта бастау",
  },
};

const FIGURES = [
  ["auezov", "Мухтар Ауэзов", "Писатель, автор эпопеи о Абае.", "#28566f"],
  ["satpayev", "Каныш Сатпаев", "Геолог, основатель казахстанской науки о недрах.", "#596b2f"],
  ["ryskulov", "Турар Рыскулов", "Государственный деятель раннего советского периода.", "#824c2f"],
  ["momyshuly", "Бауыржан Момышулы", "Военный герой и писатель.", "#6d3e56"],
  ["kunayev", "Динмухамед Кунаев", "Политический руководитель Казахской ССР.", "#2f6b64"],
  ["suleimenov", "Олжас Сулейменов", "Поэт и общественный деятель.", "#755530"],
  ["musabayev", "Талгат Мусабаев", "Космонавт независимого Казахстана.", "#315b82"],
  ["baglanova", "Роза Багланова", "Певица, народная артистка.", "#7a3750"],
];

function t(language, key, params = {}) {
  const value = I18N[language]?.[key] ?? I18N.ru[key] ?? key;
  return Object.entries(params).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), value);
}

function shuffle(items) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function portraitSvg(name, color) {
  const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2);
  return `
    <svg viewBox="0 0 240 240" aria-hidden="true">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${color}"/><stop offset="1" stop-color="#e5c07b"/></linearGradient>
        <pattern id="p" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M4 13q9-14 18 0q-9 14-18 0Z" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2"/></pattern>
      </defs>
      <rect width="240" height="240" rx="24" fill="url(#g)"/>
      <rect width="240" height="240" rx="24" fill="url(#p)" opacity=".45"/>
      <circle cx="120" cy="88" r="42" fill="#e8b878" stroke="#23170f" stroke-width="6"/>
      <path d="M74 196q13-58 46-58t46 58Z" fill="#2f261e" stroke="#23170f" stroke-width="6"/>
      <path d="M82 82q38-54 78 2q-44-15-78-2Z" fill="#20150f"/>
      <text x="120" y="218" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="900" fill="#fff7d6" stroke="#20150f" stroke-width="3">${initials}</text>
    </svg>`;
}

function portraitUrl(id) {
  return new URL(`./assets/portraits/${id}.webp`, import.meta.url).href;
}

function createOverlay(host, title, body, actions) {
  const overlay = document.createElement("div");
  overlay.className = "absolute inset-0 z-20 flex items-center justify-center bg-black/35 px-4 backdrop-blur-[2px]";
  const panel = document.createElement("div");
  panel.className = "w-full max-w-md border border-white/70 bg-white/95 p-6 text-center shadow-xl";
  panel.style.borderRadius = "18px";
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

export async function mountFiguresMemory(host, options = {}) {
  const language = options.language || "ru";
  const cardBackUrl = new URL("./assets/card-back.webp", import.meta.url).href;
  let deck = [];
  let open = [];
  let matched = new Set();
  let locked = false;
  let moves = 0;
  let left = 60;
  let timerId = 0;
  let overlay = null;
  let completed = false;
  let finishing = false;

  host.innerHTML = `
    <div class="relative mx-auto overflow-hidden flex flex-col border border-white/70 bg-[#b99662] p-2 shadow-lg select-none sm:p-3" style="touch-action:manipulation;overscroll-behavior:contain;border-radius:18px;width:min(96vw,640px);max-height:100%;">
      <div class="shrink-0 mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-black text-white sm:text-xs">
        <div class="rounded-full bg-black/35 px-3 py-1.5" data-time></div>
        <div class="rounded-full bg-black/35 px-3 py-1.5" data-pairs></div>
        <div class="rounded-full bg-black/35 px-3 py-1.5" data-moves></div>
      </div>
      <div class="flex-1 min-h-0 flex items-center justify-center">
        <div class="grid grid-cols-4 gap-1.5 sm:gap-2" style="aspect-ratio:1;width:min(88vw,68dvh,520px);max-width:100%;max-height:100%;" data-board></div>
      </div>
      <div class="shrink-0 mx-auto mt-2 min-h-10 w-full max-w-[min(88vw,520px)] bg-white/65 p-2 text-[11px] font-semibold leading-snug text-on-surface-variant sm:text-sm sm:leading-5" style="border-radius:18px;" data-bio></div>
    </div>
  `;

  const frame = host.firstElementChild;
  const boardEl = host.querySelector("[data-board]");
  const timeEl = host.querySelector("[data-time]");
  const pairsEl = host.querySelector("[data-pairs]");
  const movesEl = host.querySelector("[data-moves]");
  const bioEl = host.querySelector("[data-bio]");

  function removeOverlay() {
    overlay?.remove();
    overlay = null;
  }

  function updateHud() {
    timeEl.textContent = t(language, "time", { n: left });
    pairsEl.textContent = t(language, "pairs", { n: matched.size });
    movesEl.textContent = t(language, "moves", { n: moves });
  }

  function render() {
    boardEl.innerHTML = "";
    deck.forEach((card, index) => {
      const visible = open.includes(index) || matched.has(card.id);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `aspect-square overflow-hidden border shadow-sm transition-transform active:scale-[0.98] ${
        visible ? "border-white bg-white" : "border-[#5b351f] bg-[#24605f]"
      }`;
      button.style.borderRadius = "18px";
      if (visible) {
        button.innerHTML = `<img src="${portraitUrl(card.id)}" alt="" class="h-full w-full object-cover" draggable="false">`;
      } else {
        button.innerHTML = `<div class="h-full bg-cover bg-center" style="background-image:url('${cardBackUrl}')"></div>`;
      }
      button.addEventListener("click", () => flip(index));
      boardEl.appendChild(button);
    });
  }

  async function finish(victory) {
    if (finishing) return;
    finishing = true;
    clearInterval(timerId);
    let unlockFailed = false;
    if (victory && !completed) {
      completed = true;
      try {
        await options.onWin?.({ score: Math.max(100, left * 10 + (80 - moves) * 5), elapsedSeconds: 60 - left });
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

  function flip(index) {
    if (locked || open.includes(index) || matched.has(deck[index].id)) return;
    open.push(index);
    render();
    if (open.length < 2) return;
    moves += 1;
    updateHud();
    const [a, b] = open;
    if (deck[a].id === deck[b].id) {
      matched.add(deck[a].id);
      open = [];
      render();
      if (matched.size >= FIGURES.length) void finish(true);
      return;
    }
    locked = true;
    setTimeout(() => {
      open = [];
      locked = false;
      render();
    }, 700);
  }

  function reset() {
    removeOverlay();
    deck = shuffle(FIGURES.flatMap(([id, name, bio, color]) => [
      { id, name, bio, color },
      { id, name, bio, color },
    ]));
    open = [];
    matched = new Set();
    locked = false;
    moves = 0;
    left = 60;
    completed = false;
    finishing = false;
    bioEl.textContent = t(language, "hint");
    clearInterval(timerId);
    timerId = setInterval(() => {
      left -= 1;
      updateHud();
      if (left <= 0) finish(false);
    }, 1000);
    updateHud();
    render();
  }

  reset();
  clearInterval(timerId);
  overlay = createOverlay(frame, t(language, "title"), t(language, "ready"), [
    { label: t(language, "start"), onClick: reset },
    { label: t(language, "exit"), onClick: () => (window.location.href = "../map_hub/code.html") },
  ]);
}
