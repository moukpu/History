const I18N = {
  ru: {
    title: "Хронология современного Казахстана",
    ready: "Расставь 7 событий по порядку: сверху — самое раннее, снизу — самое позднее. Даты скрыты. У тебя 3 попытки.",
    start: "Начать",
    exit: "Выйти",
    check: "Проверить",
    attempts: "Попытки: {n}/3",
    victory: "Верно! Период разблокирован",
    failTitle: "Попытки закончились",
    failBody: "Период не пройден. Сыграй снова, чтобы разблокировать его.",
    failHint: "Есть ошибки. Правильные карточки стали зелёными — переставь остальные.",
    lockedHint: "Зафиксировано: {n}. Поправь остальные.",
    tryAgain: "Пока неверно. Попробуй ещё.",
    fact: "За 27 лет Астана выросла из областного центра в одну из самых молодых столиц мира: Байтерек, Пирамида, ЭКСПО, Қаңтар и референдум об АЭС — ключевые вехи этого пути.",
    replay: "Играть снова",
    next: "К следующему периоду",
    backToMap: "Вернуться на карту",
    dragHint: "Потяни карточку или кликни две по очереди, чтобы поменять их.",
    hidden: "Дата скрыта",
  },
  en: {
    title: "Modern Kazakhstan Timeline",
    ready: "Arrange 7 events in order: earliest at the top, latest at the bottom. Dates are hidden. You have 3 attempts.",
    start: "Start",
    exit: "Exit",
    check: "Check",
    attempts: "Attempts: {n}/3",
    victory: "Correct! Period unlocked",
    failTitle: "Out of attempts",
    failBody: "You did not pass this period. Play again to unlock it.",
    failHint: "Some cards are wrong. Correct ones are green — reorder the rest.",
    lockedHint: "Locked: {n}. Reorder the others.",
    tryAgain: "Not yet. Try again.",
    fact: "In 27 years Astana grew from a regional city into one of the world's youngest capitals — Bayterek, the Pyramid, EXPO, Qantar and the nuclear-plant referendum are the key milestones.",
    replay: "Play again",
    next: "Next period",
    backToMap: "Back to map",
    dragHint: "Drag a card or tap two to swap them.",
    hidden: "Date hidden",
  },
  kk: {
    title: "Қазіргі Қазақстан хронологиясы",
    ready: "7 оқиғаны ретімен қой: үстінде — ең ерте, астында — ең кейінгі. Күндер жасырылған. 3 әрекет бар.",
    start: "Бастау",
    exit: "Шығу",
    check: "Тексеру",
    attempts: "Әрекет: {n}/3",
    victory: "Дұрыс! Кезең ашылды",
    failTitle: "Әрекет бітті",
    failBody: "Кезең өтілмеді. Ашу үшін қайта ойна.",
    failHint: "Қате бар. Дұрыстары жасыл болды — қалғанын ауыстыр.",
    lockedHint: "Бекітілді: {n}. Қалғандарын ауыстыр.",
    tryAgain: "Әлі қате. Қайталап көр.",
    fact: "27 жыл ішінде Астана облыс орталығынан әлемдегі ең жас астаналардың біріне айналды: Бәйтерек, Пирамида, ЭКСПО, Қаңтар, АЭС референдумы — осы жолдың басты белестері.",
    replay: "Қайта ойнау",
    next: "Келесі кезеңге",
    backToMap: "Картаға қайту",
    dragHint: "Орын ауыстыру үшін карточканы сүйре немесе екеуін басып шық.",
    hidden: "Күні жасырын",
  },
};

const EVENT_POOL = [
  { id: "capital-designation", order: 19980610, date: "10.06.1998", category: "capital", title: { ru: "Акмола официально провозглашена столицей", en: "Akmola officially proclaimed capital", kk: "Ақмола ресми түрде астана жарияланды" } },
  { id: "rename-astana", order: 19980506, date: "06.05.1998", category: "capital", title: { ru: "Акмола переименована в Астану", en: "Akmola renamed Astana", kk: "Ақмола Астана деп аталды" } },
  { id: "first-census", order: 19990225, date: "25.02.1999", category: "reform", title: { ru: "Первая национальная перепись населения", en: "First national population census", kk: "Алғашқы ұлттық халық санағы" } },
  { id: "sco-founded", order: 20010615, date: "15.06.2001", category: "diplomacy", title: { ru: "Казахстан — соучредитель ШОС", en: "Kazakhstan co-founds the SCO", kk: "Қазақстан ШЫҰ құрылтайшыларының бірі" } },
  { id: "bayterek-opened", order: 20020906, date: "09.2002", category: "monument", title: { ru: "Открытие монумента «Байтерек»", en: "Bayterek monument opened", kk: "«Бәйтерек» монументі ашылды" } },
  { id: "pyramid-opened", order: 20061001, date: "10.2006", category: "monument", title: { ru: "Открыт Дворец мира и согласия (Пирамида)", en: "Palace of Peace and Reconciliation (Pyramid)", kk: "Бейбітшілік пен келісім сарайы (Пирамида) ашылды" } },
  { id: "osce-chair", order: 20100101, date: "01.01.2010", category: "diplomacy", title: { ru: "Казахстан — председатель ОБСЕ", en: "Kazakhstan chairs the OSCE", kk: "Қазақстан ЕҚЫҰ төрағасы" } },
  { id: "osce-summit", order: 20101201, date: "12.2010", category: "diplomacy", title: { ru: "Саммит ОБСЕ в Астане", en: "OSCE summit in Astana", kk: "Астанадағы ЕҚЫҰ саммиті" } },
  { id: "asian-games", order: 20110130, date: "01-02.2011", category: "sport", title: { ru: "7-е Зимние Азиатские игры", en: "7th Winter Asian Games", kk: "7-ші Қысқы Азия ойындары" } },
  { id: "expo-2017", order: 20170610, date: "06.2017", category: "monument", title: { ru: "ЭКСПО-2017 «Энергия будущего»", en: "EXPO-2017 Future Energy", kk: "ЭКСПО-2017 «Болашақ энергиясы»" } },
  { id: "tokayev-president", order: 20190320, date: "20.03.2019", category: "president", title: { ru: "Токаев стал президентом", en: "Tokayev becomes president", kk: "Тоқаев президент болды" } },
  { id: "rename-nursultan", order: 20190323, date: "23.03.2019", category: "capital", title: { ru: "Астана переименована в Нур-Султан", en: "Astana renamed Nur-Sultan", kk: "Астана Нұр-Сұлтан деп аталды" } },
  { id: "qantar", order: 20220105, date: "01.2022", category: "crisis", title: { ru: "Қаңтар — январские события", en: "Qantar — January events", kk: "Қаңтар оқиғалары" } },
  { id: "referendum-2022", order: 20220605, date: "05.06.2022", category: "referendum", title: { ru: "Референдум о поправках в Конституцию", en: "Referendum on constitutional amendments", kk: "Конституцияға өзгеріс референдумы" } },
  { id: "rename-back", order: 20220917, date: "17.09.2022", category: "capital", title: { ru: "Нур-Султан переименован обратно в Астану", en: "Nur-Sultan renamed back to Astana", kk: "Нұр-Сұлтан қайтадан Астана атанды" } },
  { id: "referendum-npp", order: 20241006, date: "06.10.2024", category: "referendum", title: { ru: "Референдум о строительстве АЭС", en: "Nuclear power plant referendum", kk: "АЭС құрылысы жөніндегі референдум" } },
];

const PICK_COUNT = 7;
const MAX_ATTEMPTS = 3;

const CATEGORIES = {
  capital: { icon: `<path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4M12 7v4M10 9h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` },
  monument: { icon: `<path d="M12 2v20M8 22h8M10 2h4M9 6h6M8 10h8M10 14h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` },
  diplomacy: { icon: `<path d="M12 22A10 10 0 1 0 12 2a10 10 0 0 0 0 20zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" fill="none" stroke="currentColor" stroke-width="2"/>` },
  sport: { icon: `<path d="M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM8.2 15l-3.3 6 4-2 3.1 3 3.1-3 4 2-3.3-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` },
  president: { icon: `<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` },
  crisis: { icon: `<path d="M10.3 2.2a2 2 0 0 1 3.4 0l8.6 15A2 2 0 0 1 20.6 20H3.4a2 2 0 0 1-1.7-2.8l8.6-15zM12 9v4M12 17h.01" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` },
  referendum: { icon: `<path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` },
  reform: { icon: `<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` },
};

function t(language, key, params = {}) {
  const value = I18N[language]?.[key] ?? I18N.ru[key] ?? key;
  return Object.entries(params).reduce((text, [name, val]) => text.replaceAll(`{${name}}`, String(val)), value);
}

function shuffle(items) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickEvents(count) {
  return shuffle(EVENT_POOL).slice(0, count);
}

function eventTitle(event, language) {
  return event.title[language] || event.title.ru;
}

export async function mountTimelineSort(host, options = {}) {
  const language = options.language || "ru";

  let solution = [];
  let order = [];
  let attempts = 0;
  let completed = false;
  let overlay = null;
  let status = "";
  let statusKind = ""; // "" | "wrong" | "right"
  let revealDates = false;
  let startedAt = 0;
  const lockedIds = new Set();

  host.innerHTML = `
    <div class="relative w-full max-w-2xl mx-auto rounded-3xl sm:border sm:border-outline-variant/30 bg-surface/50 sm:shadow-lg p-3 sm:p-6 select-none flex flex-col" style="touch-action:manipulation;overscroll-behavior:contain">
      <header class="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div class="text-sm font-black text-primary tracking-widest uppercase mb-1" data-attempts></div>
          <div class="text-xs font-semibold text-on-surface-variant max-w-xs leading-relaxed" data-hint></div>
        </div>
      </header>

      <div class="relative flex-1 min-h-0 overflow-y-auto pr-1">
        <!-- Vertical timeline track line -->
        <div class="absolute left-[39px] sm:left-[55px] top-2 bottom-2 w-0.5 bg-outline-variant/40 -z-10 rounded-full"></div>
        <ul class="flex flex-col gap-3" data-list></ul>
      </div>

      <div class="mt-4 hidden" data-status-wrap>
        <div class="text-center text-xs sm:text-sm font-semibold leading-snug px-4 py-3" style="border-radius:18px;" data-status-box></div>
      </div>

      <footer class="mt-4 shrink-0 flex justify-center">
        <button class="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-sm font-black text-on-primary shadow transition hover:brightness-110 active:scale-[0.98]" type="button" data-check></button>
      </footer>
    </div>
  `;

  const frame = host.firstElementChild;
  const listEl = host.querySelector("[data-list]");
  const attemptsEl = host.querySelector("[data-attempts]");
  const hintEl = host.querySelector("[data-hint]");
  const checkButton = host.querySelector("[data-check]");
  const statusWrap = host.querySelector("[data-status-wrap]");
  const statusBox = host.querySelector("[data-status-box]");

  function removeOverlay() {
    overlay?.remove();
    overlay = null;
  }

  function createOverlay(title, body, actions) {
    removeOverlay();
    const ov = document.createElement("div");
    ov.className = "absolute inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm transition-opacity";
    const panel = document.createElement("div");
    panel.className = "w-full max-w-md rounded-3xl border border-white/20 bg-surface p-6 text-center shadow-2xl";
    panel.innerHTML = `
      <h2 class="text-2xl font-black text-on-surface"></h2>
      <p class="mt-4 text-sm leading-relaxed text-on-surface-variant"></p>
      <div class="mt-8 flex flex-col sm:flex-row justify-center gap-3" data-actions></div>`;
    panel.querySelector("h2").textContent = title;
    panel.querySelector("p").textContent = body;
    const actionHost = panel.querySelector("[data-actions]");
    actions.forEach((action, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = index === 0
        ? "inline-flex h-12 w-full items-center justify-center rounded-full bg-primary px-6 text-sm font-black text-on-primary shadow"
        : "inline-flex h-12 w-full items-center justify-center rounded-full border-2 border-outline-variant bg-transparent px-6 text-sm font-black text-on-surface";
      button.textContent = action.label;
      button.addEventListener("click", action.onClick);
      actionHost.appendChild(button);
    });
    ov.appendChild(panel);
    frame.appendChild(ov);
    overlay = ov;
    return ov;
  }

  function correctIndex(id) {
    return solution.findIndex((event) => event.id === id);
  }

  function isSolved() {
    return order.every((event, index) => correctIndex(event.id) === index);
  }

  function updateHud() {
    attemptsEl.textContent = t(language, "attempts", { n: attempts });
    checkButton.textContent = t(language, "check");
    hintEl.textContent = t(language, "dragHint");
    if (status) {
      statusWrap.classList.remove("hidden");
      statusBox.textContent = status;
      statusBox.style.background =
        statusKind === "right"
          ? "rgba(16, 185, 129, 0.12)"
          : "rgba(239, 68, 68, 0.10)";
      statusBox.style.color =
        statusKind === "right" ? "#065f46" : "#9b1c1c";
      statusBox.style.border =
        statusKind === "right"
          ? "1px solid rgba(16, 185, 129, 0.35)"
          : "1px solid rgba(239, 68, 68, 0.30)";
    } else {
      statusWrap.classList.add("hidden");
    }
  }

  let dragState = null;

  function startDrag(card, eventId, event) {
    if (lockedIds.has(eventId)) return;
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    try {
      card.setPointerCapture(event.pointerId);
    } catch {}

    const lis = [...listEl.querySelectorAll("li")];
    const items = lis
      .map((li) => {
        const article = li.querySelector("article[data-id]");
        if (!article) return null;
        return {
          li,
          article,
          id: article.dataset.id,
          rect: li.getBoundingClientRect(),
          isLocked: lockedIds.has(article.dataset.id),
        };
      })
      .filter(Boolean);

    const freeItems = items.filter((it) => !it.isLocked);
    const freeIndex = freeItems.findIndex((it) => it.id === eventId);
    if (freeIndex < 0) return;

    const draggedItem = freeItems[freeIndex];
    const cardHeight = draggedItem.rect.height;
    let gap = 12;
    if (items.length > 1) {
      const a = items[0];
      const b = items[1];
      gap = Math.max(4, b.rect.top - (a.rect.top + a.rect.height));
    }

    dragState = {
      pointerId: event.pointerId,
      startY: event.clientY,
      draggedLi: draggedItem.li,
      draggedArticle: draggedItem.article,
      cardHeight,
      gap,
      freeItems,
      freeIndex,
      lastTargetFreeIndex: freeIndex,
    };

    draggedItem.li.style.zIndex = "50";
    draggedItem.li.style.position = "relative";
    draggedItem.article.style.transition = "box-shadow 180ms, transform 120ms";
    draggedItem.article.style.boxShadow = "0 14px 30px rgba(0,0,0,0.25)";
    draggedItem.article.style.transform = "scale(1.02)";
  }

  function moveDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    event.preventDefault();
    const dy = event.clientY - dragState.startY;
    dragState.draggedLi.style.transform = `translateY(${dy}px)`;

    const draggedRect = dragState.freeItems[dragState.freeIndex].rect;
    const draggedCenter = draggedRect.top + draggedRect.height / 2 + dy;

    let newIndex = 0;
    dragState.freeItems.forEach((item, i) => {
      if (i === dragState.freeIndex) return;
      const center = item.rect.top + item.rect.height / 2;
      if (center < draggedCenter) newIndex += 1;
    });

    if (newIndex === dragState.lastTargetFreeIndex) return;
    dragState.lastTargetFreeIndex = newIndex;
    const shift = dragState.cardHeight + dragState.gap;
    dragState.freeItems.forEach((item, i) => {
      if (i === dragState.freeIndex) return;
      item.li.style.transition = "transform 220ms cubic-bezier(0.2, 0.7, 0.2, 1)";
      if (i < dragState.freeIndex && i >= newIndex) {
        item.li.style.transform = `translateY(${shift}px)`;
      } else if (i > dragState.freeIndex && i <= newIndex) {
        item.li.style.transform = `translateY(${-shift}px)`;
      } else {
        item.li.style.transform = "";
      }
    });
  }

  function endDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const startedFreeIndex = dragState.freeIndex;
    const finalFreeIndex = dragState.lastTargetFreeIndex;

    dragState.freeItems.forEach((item) => {
      item.li.style.transition = "";
      item.li.style.transform = "";
      item.li.style.zIndex = "";
      item.li.style.position = "";
      item.article.style.boxShadow = "";
      item.article.style.transform = "";
      item.article.style.transition = "";
    });
    try {
      dragState.draggedArticle.releasePointerCapture(event.pointerId);
    } catch {}

    if (finalFreeIndex !== startedFreeIndex) {
      const unlocked = order.filter((e) => !lockedIds.has(e.id));
      const [item] = unlocked.splice(startedFreeIndex, 1);
      unlocked.splice(finalFreeIndex, 0, item);
      let cursor = 0;
      order = order.map((e) => (lockedIds.has(e.id) ? e : unlocked[cursor++]));
      // Clear any stale "locked: N" / "wrong" status — we only show
      // colours after the user explicitly presses "Проверить".
      status = "";
      statusKind = "";
      updateHud();
      render();
    }

    dragState = null;
  }

  function render() {
    listEl.innerHTML = "";
    order.forEach((event, index) => {
      const isLocked = lockedIds.has(event.id);
      // Only locked cards get green colouring. Unlocked cards stay neutral
      // until the user explicitly presses "Проверить" again — preventing
      // the bug where dragging caused live "auto-green" feedback.
      const correct = isLocked;
      const style = CATEGORIES[event.category] || CATEGORIES.reform;

      let iconClass = "bg-surface text-on-surface-variant border-outline-variant shadow-sm";
      if (correct) iconClass = "bg-emerald-500 text-white border-emerald-500 shadow-md";

      let cardClass = "border-outline-variant bg-surface";
      if (correct) cardClass = "border-emerald-500 bg-emerald-50/40";

      const isRevealed = revealDates || correct;
      const cursorClass = isLocked ? "cursor-default opacity-95" : "cursor-grab active:cursor-grabbing";
      const touchAction = isLocked ? "auto" : "none";

      const li = document.createElement("li");
      li.className = "relative flex items-stretch gap-3 sm:gap-4 group";

      li.innerHTML = `
        <div class="relative flex items-center justify-center shrink-0 w-[80px] sm:w-[112px]">
          <div class="z-10 flex h-[36px] w-[36px] sm:h-[44px] sm:w-[44px] items-center justify-center rounded-full border-2 transition-all duration-300 ${iconClass}">
            <svg class="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24">${style.icon}</svg>
          </div>
        </div>

        <article class="flex-1 flex overflow-hidden rounded-2xl border-2 ${cardClass} ${cursorClass}" style="touch-action:${touchAction};" data-id="${event.id}">
          <div class="flex flex-1 flex-col justify-center p-3 sm:p-4">
            ${isRevealed ? `<div class="mb-1 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] text-primary">${event.date}</div>` : ""}
            <div class="text-sm sm:text-base font-bold text-on-surface leading-snug">
              ${eventTitle(event, language)}
            </div>
          </div>
          <div class="flex w-10 sm:w-12 shrink-0 items-center justify-center border-l border-outline-variant/30 ${isLocked ? "bg-emerald-500/10 text-emerald-600" : "bg-on-surface/5 text-on-surface-variant/40"}">
            ${
              isLocked
                ? `<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`
                : `<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="15" x2="16" y2="15"/></svg>`
            }
          </div>
        </article>
      `;

      const card = li.querySelector("article");

      if (!isLocked) {
        card.addEventListener("pointerdown", (e) => startDrag(card, event.id, e));
        card.addEventListener("pointermove", moveDrag);
        card.addEventListener("pointerup", endDrag);
        card.addEventListener("pointercancel", endDrag);
      }

      listEl.appendChild(li);
    });
  }

  async function finishWin() {
    if (!completed) {
      completed = true;
      const elapsedSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      const score = Math.max(200, 1000 - attempts * 200);
      try {
        await options.onWin?.({ score, elapsedSeconds });
      } catch (error) {
        console.error("timeline-sort onWin failed", error);
      }
    }
    createOverlay(
      t(language, "victory"),
      t(language, "fact"),
      [
        { label: t(language, "replay"), onClick: reset },
        { label: t(language, "next"), onClick: () => options.goToNextPeriod?.() ?? (window.location.href = "../map_hub/code.html") },
      ],
    );
  }

  function finishFail() {
    // Player ran out of attempts. Show the correct order for educational
    // purposes but DO NOT call onWin — the period must not unlock and no
    // score is awarded. Player has to replay to unlock.
    if (completed) return;
    completed = true;
    createOverlay(
      t(language, "failTitle"),
      t(language, "failBody"),
      [
        { label: t(language, "replay"), onClick: reset },
        { label: t(language, "backToMap"), onClick: () => (window.location.href = "../map_hub/code.html") },
      ],
    );
  }

  function check() {
    if (completed) return;
    attempts += 1;
    // Lock-in any cards that are now in their correct slot.
    order.forEach((event, index) => {
      if (correctIndex(event.id) === index) {
        lockedIds.add(event.id);
      }
    });
    if (isSolved()) {
      revealDates = true;
      status = "";
      statusKind = "";
      updateHud();
      render();
      finishWin();
      return;
    }
    if (attempts >= MAX_ATTEMPTS) {
      // FAIL — no onWin, no unlock, no score.
      // Do NOT replace the player's order with the solution and do NOT
      // paint every card green: that behaviour made it impossible to see
      // anything behind the overlay blur (user feedback). We just keep the
      // board as the player left it and show a compact fail overlay.
      status = "";
      statusKind = "";
      updateHud();
      render();
      finishFail();
      return;
    }
    // Compact, no extra explanation.
    const correctCount = lockedIds.size;
    status =
      correctCount > 0
        ? t(language, "lockedHint", { n: correctCount })
        : t(language, "tryAgain");
    statusKind = "wrong";
    updateHud();
    render();
  }

  function reset() {
    removeOverlay();
    const picked = pickEvents(Math.min(PICK_COUNT, EVENT_POOL.length));
    solution = picked.slice().sort((a, b) => a.order - b.order);
    do {
      order = shuffle(picked);
    } while (order.length > 1 && order.every((event, index) => correctIndex(event.id) === index));
    attempts = 0;
    completed = false;
    revealDates = false;
    status = "";
    statusKind = "";
    lockedIds.clear();
    startedAt = Date.now();
    updateHud();
    render();
  }

  checkButton.addEventListener("click", check);
  const picked = pickEvents(Math.min(PICK_COUNT, EVENT_POOL.length));
  solution = picked.slice().sort((a, b) => a.order - b.order);
  order = shuffle(picked);
  updateHud();
  render();

  createOverlay(t(language, "title"), t(language, "ready"), [
    { label: t(language, "start"), onClick: reset },
  ]);
}
