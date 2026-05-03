const I18N = {
  ru: {
    title: "Пазл мавзолея",
    ready: "Перетащи все 9 частей на правильные места. Правильно поставленная часть закрепится.",
    start: "Начать",
    exit: "Выйти",
    moves: "Ходы: {n}",
    victory: "Победа! Период разблокирован",
    unlockError: "Пазл собран, но сервер не записал разблокировку. Обнови карту или проверь, что предыдущий период завершён.",
    factTitle: "Мавзолей Ходжи Ахмета Ясауи",
    fact:
      "Мавзолей в Туркестане построен в конце XIV века по приказу Амира Тимура. Это один из главных памятников средневековой архитектуры Казахстана и объект Всемирного наследия ЮНЕСКО.",
    replay: "Играть снова",
    next: "Перейти к следующему периоду",
  },
  en: {
    title: "Monument Puzzle",
    ready: "Drag all 9 pieces into their correct places. A correct piece locks into the board.",
    start: "Start",
    exit: "Exit",
    moves: "Moves: {n}",
    victory: "Victory! Period unlocked",
    unlockError: "The puzzle is complete, but the server did not save the unlock. Refresh the map or check that the previous period is complete.",
    factTitle: "Mausoleum of Khoja Ahmed Yasawi",
    fact:
      "The mausoleum in Turkestan was built in the late 14th century by order of Amir Timur. It is one of Kazakhstan's major medieval architectural monuments and a UNESCO World Heritage Site.",
    replay: "Play again",
    next: "Continue to next period",
  },
  kk: {
    title: "Кесене пазлы",
    ready: "9 бөлікті өз орнына сүйреп апар. Дұрыс қойылған бөлік тақтаға бекітіледі.",
    start: "Бастау",
    exit: "Шығу",
    moves: "Жүріс: {n}",
    victory: "Жеңіс! Кезең ашылды",
    unlockError: "Пазл жиналды, бірақ сервер ашуды сақтамады. Картаны жаңарт немесе алдыңғы кезең аяқталғанын тексер.",
    factTitle: "Қожа Ахмет Ясауи кесенесі",
    fact:
      "Түркістандағы кесене XIV ғасырдың соңында Әмір Темірдің бұйрығымен салынған. Бұл Қазақстандағы ортағасырлық сәулеттің маңызды ескерткіштерінің бірі және ЮНЕСКО дүниежүзілік мұрасы.",
    replay: "Қайта ойнау",
    next: "Келесі кезеңге өту",
  },
};

const SIZE = 3;
const TILE_COUNT = SIZE * SIZE;
const FACT_SUMMARY = {
  ru: "Мавзолей в Туркестане построен в конце XIV века по приказу Амира Тимура. Памятник входит в наследие ЮНЕСКО.",
  en: "The Turkestan mausoleum was built in the late 14th century by Amir Timur and is a UNESCO World Heritage Site.",
  kk: "Түркістандағы кесене XIV ғасырдың соңында Әмір Темірдің бұйрығымен салынған. ЮНЕСКО мұрасына кіреді.",
};
const VERTICAL_CONNECTORS = [
  [1, -1],
  [-1, 1],
  [1, -1],
];
const HORIZONTAL_CONNECTORS = [
  [-1, 1, -1],
  [1, -1, 1],
];

function t(language, key, params = {}) {
  const value = I18N[language]?.[key] ?? I18N.ru[key] ?? key;
  return Object.entries(params).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), value);
}

function createOverlay(host, title, body, actions) {
  const overlay = document.createElement("div");
  overlay.className = "absolute inset-0 z-30 flex items-center justify-center bg-black/20 px-4 backdrop-blur-[1px]";
  overlay.innerHTML = `
    <div class="w-full max-w-md rounded-2xl border border-white/70 bg-white/95 p-6 text-center shadow-xl">
      <h2 class="text-2xl font-black text-on-surface"></h2>
      <p class="mt-3 whitespace-pre-line text-sm leading-6 text-on-surface-variant"></p>
      <div class="mt-6 flex flex-wrap justify-center gap-3" data-actions></div>
    </div>`;
  overlay.querySelector("h2").textContent = title;
  overlay.querySelector("p").textContent = body;
  const actionHost = overlay.querySelector("[data-actions]");
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
  host.appendChild(overlay);
  return overlay;
}

function shuffledPieces() {
  const pieces = Array.from({ length: TILE_COUNT }, (_, index) => index);
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const shuffled = [...pieces].sort(() => Math.random() - 0.5);
    if (shuffled.every((piece, slot) => piece !== slot)) return shuffled;
  }
  return [1, 2, 0, 4, 5, 3, 7, 8, 6];
}

function isSolved(positions) {
  return positions.every((piece, slot) => piece === slot);
}

function pieceEdges(piece) {
  const row = Math.floor(piece / SIZE);
  const col = piece % SIZE;
  return {
    top: row === 0 ? 0 : -HORIZONTAL_CONNECTORS[row - 1][col],
    right: col === SIZE - 1 ? 0 : VERTICAL_CONNECTORS[row][col],
    bottom: row === SIZE - 1 ? 0 : HORIZONTAL_CONNECTORS[row][col],
    left: col === 0 ? 0 : -VERTICAL_CONNECTORS[row][col - 1],
  };
}

function jigsawPath(tile, tab, edges) {
  const x0 = tab;
  const y0 = tab;
  const x1 = tab + tile;
  const y1 = tab + tile;
  const amp = tab * 0.78;
  const a = tile * 0.32;
  const b = tile * 0.39;
  const c = tile * 0.5;
  const d = tile * 0.61;
  const e = tile * 0.68;
  const commands = [`M ${x0} ${y0}`];

  if (edges.top === 0) {
    commands.push(`L ${x1} ${y0}`);
  } else {
    const dir = edges.top > 0 ? -amp : amp;
    commands.push(
      `L ${x0 + a} ${y0}`,
      `C ${x0 + b} ${y0} ${x0 + b} ${y0 + dir} ${x0 + c} ${y0 + dir}`,
      `C ${x0 + d} ${y0 + dir} ${x0 + d} ${y0} ${x0 + e} ${y0}`,
      `L ${x1} ${y0}`,
    );
  }

  if (edges.right === 0) {
    commands.push(`L ${x1} ${y1}`);
  } else {
    const dir = edges.right > 0 ? amp : -amp;
    commands.push(
      `L ${x1} ${y0 + a}`,
      `C ${x1} ${y0 + b} ${x1 + dir} ${y0 + b} ${x1 + dir} ${y0 + c}`,
      `C ${x1 + dir} ${y0 + d} ${x1} ${y0 + d} ${x1} ${y0 + e}`,
      `L ${x1} ${y1}`,
    );
  }

  if (edges.bottom === 0) {
    commands.push(`L ${x0} ${y1}`);
  } else {
    const dir = edges.bottom > 0 ? amp : -amp;
    commands.push(
      `L ${x1 - a} ${y1}`,
      `C ${x1 - b} ${y1} ${x1 - b} ${y1 + dir} ${x1 - c} ${y1 + dir}`,
      `C ${x1 - d} ${y1 + dir} ${x1 - d} ${y1} ${x1 - e} ${y1}`,
      `L ${x0} ${y1}`,
    );
  }

  if (edges.left === 0) {
    commands.push(`L ${x0} ${y0}`);
  } else {
    const dir = edges.left > 0 ? -amp : amp;
    commands.push(
      `L ${x0} ${y1 - a}`,
      `C ${x0} ${y1 - b} ${x0 + dir} ${y1 - b} ${x0 + dir} ${y1 - c}`,
      `C ${x0 + dir} ${y1 - d} ${x0} ${y1 - d} ${x0} ${y1 - e}`,
      `L ${x0} ${y0}`,
    );
  }

  commands.push("Z");
  return commands.join(" ");
}

export async function mountMonumentPuzzle(host, options = {}) {
  const language = options.language || "ru";
  const imageUrl = new URL("./assets/yasawi-square.webp", import.meta.url).href;
  const image = `url("${imageUrl}")`;

  let positions = shuffledPieces();
  let locked = new Set();
  let moves = 0;
  let overlay = null;
  let completed = false;
  let drag = null;

  host.innerHTML = `
    <div class="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-white/80 bg-[#f0d7a3] p-2 shadow-lg select-none sm:p-3" style="touch-action:none;overscroll-behavior:contain">
      <div class="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs font-black text-[#462813] sm:text-sm">
        <div class="rounded-full bg-white/75 px-4 py-2 shadow-sm" data-moves></div>
      </div>
      <div class="grid gap-3 lg:grid-cols-[minmax(300px,520px)_minmax(200px,260px)] lg:items-start">
        <div class="relative mx-auto aspect-square w-full max-w-[min(62vh,520px,88vw)] overflow-hidden border-[7px] border-[#8a5529] bg-[#fff2cd] shadow-inner" data-board></div>
        <aside class="rounded-lg border border-white/80 bg-white/80 p-3 text-xs leading-4 text-[#3f2815] shadow-sm sm:text-sm sm:leading-5" data-info>
          <h3 class="text-sm font-black leading-5 text-[#2f1c0d]"></h3>
          <p class="mt-1 font-semibold"></p>
        </aside>
      </div>
    </div>
  `;

  const frame = host.firstElementChild;
  const boardEl = host.querySelector("[data-board]");
  const movesEl = host.querySelector("[data-moves]");
  const info = host.querySelector("[data-info]");
  info.querySelector("h3").textContent = t(language, "factTitle");
  info.querySelector("p").textContent = FACT_SUMMARY[language] || FACT_SUMMARY.ru;

  function removeOverlay() {
    overlay?.remove();
    overlay = null;
  }

  function updateHud() {
    movesEl.textContent = t(language, "moves", { n: moves });
  }

  function slotOfPiece(piece) {
    return positions.indexOf(piece);
  }

  function boardMetrics() {
    const boardSize = boardEl.getBoundingClientRect().width || 480;
    const tile = boardSize / SIZE;
    const tab = Math.max(14, Math.min(22, tile * 0.12));
    return { boardSize, tile, tab };
  }

  function slotTransform(slot, metrics = boardMetrics()) {
    const row = Math.floor(slot / SIZE);
    const col = slot % SIZE;
    return `translate(${col * metrics.tile - metrics.tab}px, ${row * metrics.tile - metrics.tab}px)`;
  }

  function slotFromClientPoint(x, y) {
    const rect = boardEl.getBoundingClientRect();
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return -1;
    const col = Math.min(SIZE - 1, Math.max(0, Math.floor(((x - rect.left) / rect.width) * SIZE)));
    const row = Math.min(SIZE - 1, Math.max(0, Math.floor(((y - rect.top) / rect.height) * SIZE)));
    return row * SIZE + col;
  }

  function lockCorrectPieces(...pieces) {
    pieces.forEach((piece) => {
      if (slotOfPiece(piece) === piece) locked.add(piece);
    });
  }

  function lockAllCorrectPieces() {
    positions.forEach((piece, slot) => {
      if (piece === slot) locked.add(piece);
    });
  }

  function render() {
    boardEl.innerHTML = "";
    const metrics = boardMetrics();

    for (let slot = 0; slot < TILE_COUNT; slot += 1) {
      const marker = document.createElement("div");
      marker.className = "pointer-events-none absolute border border-[#8a5529]/20 bg-white/10";
      marker.style.left = `${(slot % SIZE) * (100 / SIZE)}%`;
      marker.style.top = `${Math.floor(slot / SIZE) * (100 / SIZE)}%`;
      marker.style.width = `${100 / SIZE}%`;
      marker.style.height = `${100 / SIZE}%`;
      boardEl.appendChild(marker);
    }

    positions.forEach((piece, slot) => {
      const item = document.createElement("button");
      const row = Math.floor(piece / SIZE);
      const col = piece % SIZE;
      const path = jigsawPath(metrics.tile, metrics.tab, pieceEdges(piece));
      const isLocked = locked.has(piece);
      item.type = "button";
      item.dataset.piece = String(piece);
      item.className =
        "absolute z-10 border-0 bg-no-repeat p-0 transition-[transform,box-shadow,filter] duration-300 ease-out will-change-transform " +
        (isLocked
          ? "cursor-default brightness-105 drop-shadow-[0_0_10px_rgba(34,197,94,0.45)]"
          : "cursor-grab drop-shadow-[0_7px_8px_rgba(55,32,15,0.34)] hover:z-20 hover:brightness-110 active:cursor-grabbing");
      item.style.left = "0";
      item.style.top = "0";
      item.style.width = `${metrics.tile + metrics.tab * 2}px`;
      item.style.height = `${metrics.tile + metrics.tab * 2}px`;
      item.style.transform = slotTransform(slot, metrics);
      item.style.backgroundImage = image;
      item.style.backgroundSize = `${metrics.boardSize}px ${metrics.boardSize}px`;
      item.style.backgroundPosition = `${metrics.tab - col * metrics.tile}px ${metrics.tab - row * metrics.tile}px`;
      item.style.clipPath = `path("${path}")`;
      item.style.webkitClipPath = `path("${path}")`;
      const outline = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      outline.setAttribute("viewBox", `0 0 ${metrics.tile + metrics.tab * 2} ${metrics.tile + metrics.tab * 2}`);
      outline.setAttribute("class", "pointer-events-none absolute inset-0 h-full w-full");
      const outlinePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      outlinePath.setAttribute("d", path);
      outlinePath.setAttribute("fill", "none");
      outlinePath.setAttribute("stroke", isLocked ? "#21b35f" : "#5b3418");
      outlinePath.setAttribute("stroke-width", "3");
      outlinePath.setAttribute("stroke-linejoin", "round");
      outline.appendChild(outlinePath);
      item.appendChild(outline);
      item.addEventListener("pointerdown", startDrag);
      boardEl.appendChild(item);
    });
  }

  function updatePieceTransform(piece, transform, options = {}) {
    const item = boardEl.querySelector(`[data-piece="${piece}"]`);
    if (!item) return;
    item.style.transitionDuration = options.instant ? "0ms" : "300ms";
    item.style.zIndex = options.dragging ? "30" : locked.has(piece) ? "12" : "10";
    item.style.transform = transform;
    item.style.boxShadow = options.dragging ? "0 18px 34px rgba(35, 20, 9, 0.35)" : "";
  }

  function syncPieces() {
    const metrics = boardMetrics();
    positions.forEach((piece, slot) => {
      updatePieceTransform(piece, slotTransform(slot, metrics));
    });
  }

  function startDrag(event) {
    const piece = Number(event.currentTarget.dataset.piece);
    if (locked.has(piece) || overlay) return;
    const slot = slotOfPiece(piece);
    const rect = boardEl.getBoundingClientRect();
    const metrics = boardMetrics();
    const row = Math.floor(slot / SIZE);
    const col = slot % SIZE;
    drag = {
      piece,
      originSlot: slot,
      startX: event.clientX,
      startY: event.clientY,
      baseX: col * metrics.tile - metrics.tab,
      baseY: row * metrics.tile - metrics.tab,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.style.transitionDuration = "0ms";
    updatePieceTransform(piece, `translate(${drag.baseX}px, ${drag.baseY}px)`, { instant: true, dragging: true });
  }

  function moveDrag(event) {
    if (!drag) return;
    const x = drag.baseX + event.clientX - drag.startX;
    const y = drag.baseY + event.clientY - drag.startY;
    updatePieceTransform(drag.piece, `translate(${x}px, ${y}px)`, { instant: true, dragging: true });
  }

  async function finish() {
    if (completed) return;
    completed = true;
    locked = new Set(Array.from({ length: TILE_COUNT }, (_, index) => index));
    syncPieces();
    let unlockError = false;
    try {
      await options.onWin?.({ score: Math.max(100, 1000 - moves * 20), elapsedSeconds: moves });
    } catch (error) {
      unlockError = true;
      console.error(error);
    }
    overlay = createOverlay(
      frame,
      t(language, "victory"),
      unlockError ? `${t(language, "fact")}\n\n${t(language, "unlockError")}` : t(language, "fact"),
      [
        { label: t(language, "next"), onClick: () => options.goToNextPeriod?.() ?? (window.location.href = "../map_hub/code.html") },
        { label: t(language, "replay"), onClick: reset },
      ],
    );
  }

  function endDrag(event) {
    if (!drag) return;
    const { piece, originSlot } = drag;
    const targetSlot = slotFromClientPoint(event.clientX, event.clientY);
    drag = null;

    if (targetSlot === originSlot) {
      syncPieces();
      return;
    }

    if (targetSlot < 0 || (positions[targetSlot] !== piece && locked.has(positions[targetSlot]))) {
      syncPieces();
      return;
    }

    const displacedPiece = positions[targetSlot];
    positions[originSlot] = displacedPiece;
    positions[targetSlot] = piece;
    moves += 1;
    lockCorrectPieces(piece, displacedPiece);
    lockAllCorrectPieces();
    updateHud();
    syncPieces();

    const lockedNow = locked.has(piece);
    if (lockedNow) {
      const item = boardEl.querySelector(`[data-piece="${piece}"]`);
      item?.classList.add("animate-[pulse_420ms_ease-out_1]");
    }

    if (isSolved(positions) && !completed) {
      setTimeout(() => finish(), 360);
    }
  }

  function reset() {
    removeOverlay();
    positions = shuffledPieces();
    locked = new Set();
    moves = 0;
    completed = false;
    render();
    updateHud();
  }

  boardEl.addEventListener("pointermove", moveDrag);
  boardEl.addEventListener("pointerup", endDrag);
  boardEl.addEventListener("pointercancel", endDrag);

  const resizeObserver = new ResizeObserver(() => {
    render();
    syncPieces();
  });
  resizeObserver.observe(boardEl);

  render();
  updateHud();
  overlay = createOverlay(frame, t(language, "title"), t(language, "ready"), [
    { label: t(language, "start"), onClick: reset },
    { label: t(language, "exit"), onClick: () => (window.location.href = "../map_hub/code.html") },
  ]);
}
