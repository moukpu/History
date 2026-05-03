const I18N = {
  ru: {
    minigames: {
      caravan: {
        distance: "Дистанция: {n} м",
        totalDistance: "Дистанция: {n} м",
        goods: "Товары: {n}",
        goodsBonusLine: "Товары: {n} (+{bonus} м)",
        pause: "Пауза",
        continue: "Продолжить",
        victoryTitle: "Победа! Период разблокирован",
        failTitle: "Не дошёл до цели",
        failHint: "Нужно пройти ≥ 300 м",
        replay: "Играть снова",
        continueToNext: "Перейти к следующему периоду",
        restart: "Заново",
        totalScore: "Итого: {n} м",
        readyTitle: "Проведи караван",
        readyBody: "Стрелки вверх/вниз или свайп меняют дорожку. Нужно пройти не меньше 300 м.",
        start: "В путь",
        exit: "Выйти",
      },
    },
  },
  en: {
    minigames: {
      caravan: {
        distance: "Distance: {n} m",
        totalDistance: "Distance: {n} m",
        goods: "Goods: {n}",
        goodsBonusLine: "Goods: {n} (+{bonus} m)",
        pause: "Pause",
        continue: "Continue",
        victoryTitle: "Victory! Period unlocked",
        failTitle: "Didn't reach the goal",
        failHint: "Need to travel ≥ 300 m",
        replay: "Play again",
        continueToNext: "Continue to next period",
        restart: "Restart",
        totalScore: "Total: {n} m",
        readyTitle: "Guide the caravan",
        readyBody: "Use up/down arrows or swipe to change lanes. You need at least 300 m.",
        start: "Start",
        exit: "Exit",
      },
    },
  },
  kk: {
    minigames: {
      caravan: {
        distance: "Қашықтық: {n} м",
        totalDistance: "Қашықтық: {n} м",
        goods: "Тауарлар: {n}",
        goodsBonusLine: "Тауарлар: {n} (+{bonus} м)",
        pause: "Кідіріс",
        continue: "Жалғастыру",
        victoryTitle: "Жеңіс! Кезең ашылды",
        failTitle: "Мақсатқа жетпедің",
        failHint: "Кемінде 300 м қажет",
        replay: "Қайта ойнау",
        continueToNext: "Келесі кезеңге өту",
        restart: "Қайта бастау",
        totalScore: "Барлығы: {n} м",
        readyTitle: "Керуенді өткіз",
        readyBody: "Жолақты ауыстыру үшін жоғары/төмен пернелерін немесе свайпты қолдан. Кемінде 300 м жүру керек.",
        start: "Бастау",
        exit: "Шығу",
      },
    },
  },
};

const WIN_DISTANCE = 300;
const BASE_SCROLL_SPEED = 170;

function clamp(min, value, max) {
  return Math.min(max, Math.max(min, value));
}

function t(language, key, params = {}) {
  const normalizedKey = key.startsWith("caravan.") ? key.slice("caravan.".length) : key;
  const dictionary =
    I18N[language]?.minigames?.caravan ?? I18N.ru.minigames.caravan;
  const fallback = I18N.ru.minigames.caravan;
  const value = dictionary[normalizedKey] ?? fallback[normalizedKey] ?? key;
  return Object.entries(params).reduce(
    (text, [name, replacement]) => text.replaceAll(`{${name}}`, String(replacement)),
    value,
  );
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

// Processes a loaded image into a "sprite" with: cleaned alpha (removes
// chroma-key residue and tiny disconnected blobs like stray pixels left over
// from background removal), a tight non-transparent bounding box (in 0..1
// normalized coords), and a coarse alpha mask grid used for pixel-accurate
// collision detection. This lets us collide on the actual sprite shape
// instead of a circle/AABB around the whole asset.
function processSprite(image) {
  const w = image.naturalWidth || image.width || 1;
  const h = image.naturalHeight || image.height || 1;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const c2d = canvas.getContext("2d", { willReadFrequently: true });
  c2d.drawImage(image, 0, 0);

  const imgData = c2d.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Pass 1: strip pure chroma-key green residue that some assets leave behind.
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (data[i + 3] === 0) continue;
    if (g > 180 && r < 80 && b < 80) {
      data[i + 3] = 0;
    }
  }

  // Pass 2: connected-component analysis (8-connectivity). Keep only
  // components whose size is at least a small fraction of the largest one.
  // This wipes out tiny stray blobs left behind by imperfect background
  // removal (e.g. the dark dot on the spice jar) without harming legitimate
  // multi-part sprites.
  const ALPHA_THRESHOLD = 24;
  const visited = new Uint8Array(w * h);
  const components = [];
  const queue = [];
  const NX = [-1, 1, 0, 0, -1, -1, 1, 1];
  const NY = [0, 0, -1, 1, -1, 1, -1, 1];
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const idx = y * w + x;
      if (visited[idx]) continue;
      visited[idx] = 1;
      if (data[idx * 4 + 3] < ALPHA_THRESHOLD) continue;
      const comp = [idx];
      queue.length = 0;
      queue.push(idx);
      while (queue.length) {
        const cur = queue.pop();
        const cx = cur % w;
        const cy = (cur / w) | 0;
        for (let n = 0; n < 8; n += 1) {
          const nx = cx + NX[n];
          const ny = cy + NY[n];
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const nIdx = ny * w + nx;
          if (visited[nIdx]) continue;
          visited[nIdx] = 1;
          if (data[nIdx * 4 + 3] >= ALPHA_THRESHOLD) {
            comp.push(nIdx);
            queue.push(nIdx);
          }
        }
      }
      components.push(comp);
    }
  }
  if (components.length > 1) {
    let maxSize = 0;
    for (const comp of components) {
      if (comp.length > maxSize) maxSize = comp.length;
    }
    const minKeep = Math.max(8, Math.floor(maxSize * 0.05));
    for (const comp of components) {
      if (comp.length >= minKeep) continue;
      for (const idx of comp) {
        data[idx * 4 + 3] = 0;
      }
    }
  }

  c2d.putImageData(imgData, 0, 0);

  // Tight bounding box of remaining non-transparent pixels.
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (data[(y * w + x) * 4 + 3] >= ALPHA_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) {
    minX = 0;
    minY = 0;
    maxX = w - 1;
    maxY = h - 1;
  }

  // Coarse alpha mask used for pixel-accurate collision sampling.
  const cols = 28;
  const rows = 28;
  const mask = new Uint8Array(cols * rows);
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x0 = Math.floor((col / cols) * w);
      const x1 = Math.max(x0 + 1, Math.floor(((col + 1) / cols) * w));
      const y0 = Math.floor((row / rows) * h);
      const y1 = Math.max(y0 + 1, Math.floor(((row + 1) / rows) * h));
      let solid = 0;
      outer: for (let yy = y0; yy < y1; yy += 1) {
        for (let xx = x0; xx < x1; xx += 1) {
          if (data[(yy * w + xx) * 4 + 3] > 64) {
            solid = 1;
            break outer;
          }
        }
      }
      mask[row * cols + col] = solid;
    }
  }

  return {
    canvas,
    naturalWidth: w,
    naturalHeight: h,
    tightRect: {
      left: minX / w,
      top: minY / h,
      right: (maxX + 1) / w,
      bottom: (maxY + 1) / h,
    },
    alphaMask: { cols, rows, data: mask },
  };
}

async function loadProcessedSprite(src) {
  const image = await loadImage(src);
  return processSprite(image);
}

function loadVideoSprite(src) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.className = "sprite";
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.crossOrigin = "anonymous";
    video.style.position = "absolute";
    video.style.width = "1px";
    video.style.height = "1px";
    video.style.opacity = "0";
    video.style.pointerEvents = "none";
    video.style.background = "transparent";

    const source = document.createElement("source");
    source.src = src;
    source.type = "video/webm";
    video.appendChild(source);

    const finish = () => {
      video.removeEventListener("loadeddata", finish);
      video.removeEventListener("error", fail);
      video.play().catch(() => {});
      resolve({
        video,
        aspect: (video.videoWidth || 16) / (video.videoHeight || 9),
        drawFrame(ctx, x, y, drawHeight) {
          const drawWidth = drawHeight * this.aspect;
          ctx.drawImage(video, x, y, drawWidth, drawHeight);
          return { width: drawWidth, height: drawHeight };
        },
      });
    };
    const fail = () => reject(new Error(`Failed to load video sprite: ${src}`));

    video.addEventListener("loadeddata", finish, { once: true });
    video.addEventListener("error", fail, { once: true });
    document.body.appendChild(video);
    video.load();
  });
}

async function loadFrameSprite(frameSrcs) {
  const images = await Promise.all(frameSrcs.map((src) => loadImage(src)));
  const keyedFrames = [];
  const union = {
    left: Number.POSITIVE_INFINITY,
    top: Number.POSITIVE_INFINITY,
    right: 0,
    bottom: 0,
  };

  images.forEach((image) => {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const frameCtx = canvas.getContext("2d", { willReadFrequently: true });
    frameCtx.drawImage(image, 0, 0);

    const pixels = frameCtx.getImageData(0, 0, canvas.width, canvas.height);
    const data = pixels.data;
    for (let index = 0; index < data.length; index += 4) {
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      const isKeyGreen = red < 40 && green > 210 && blue < 40;
      if (isKeyGreen) {
        data[index + 3] = 0;
        continue;
      }

      const pixelIndex = index / 4;
      const x = pixelIndex % canvas.width;
      const y = Math.floor(pixelIndex / canvas.width);
      union.left = Math.min(union.left, x);
      union.top = Math.min(union.top, y);
      union.right = Math.max(union.right, x);
      union.bottom = Math.max(union.bottom, y);
    }
    frameCtx.putImageData(pixels, 0, 0);
    keyedFrames.push(canvas);
  });

  const pad = 24;
  const source = {
    x: Math.max(0, union.left - pad),
    y: Math.max(0, union.top - pad),
    width: Math.min(1024, union.right + pad) - Math.max(0, union.left - pad),
    height: Math.min(1024, union.bottom + pad) - Math.max(0, union.top - pad),
  };

  return {
    frames: keyedFrames,
    aspect: source.width / source.height,
    drawFrame(ctx, x, y, drawHeight, time, fps = 14) {
      const frameIndex =
        Math.floor((time / 1000) * fps) % keyedFrames.length;
      const drawWidth = drawHeight * this.aspect;
      ctx.drawImage(
        keyedFrames[frameIndex],
        source.x,
        source.y,
        source.width,
        source.height,
        x,
        y,
        drawWidth,
        drawHeight,
      );
      return { width: drawWidth, height: drawHeight };
    },
  };
}

function createOverlay(host, title, bodyLines, actions) {
  const overlay = document.createElement("div");
  overlay.className =
    "absolute inset-0 z-20 flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm";

  const panel = document.createElement("div");
  panel.className =
    "w-full max-w-md rounded-3xl border border-white/70 bg-white/95 p-6 text-center shadow-2xl";

  const heading = document.createElement("h2");
  heading.className = "text-2xl font-black text-on-surface";
  heading.textContent = title;
  panel.appendChild(heading);

  const lines = Array.isArray(bodyLines) ? bodyLines : [bodyLines];
  lines.filter(Boolean).forEach((line) => {
    const paragraph = document.createElement("p");
    paragraph.className = "mt-3 text-sm leading-6 text-on-surface-variant";
    paragraph.textContent = line;
    panel.appendChild(paragraph);
  });

  const actionHost = document.createElement("div");
  actionHost.className = "mt-6 flex flex-wrap justify-center gap-3";
  actionHost.dataset.actions = "";
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

export async function mountCaravanRunner(host, options = {}) {
  let language = options.language || "ru";
  host.innerHTML = `
    <div class="relative w-full h-full overflow-hidden sm:rounded-3xl bg-[#d9b46f] select-none" style="touch-action:none;overscroll-behavior:contain">
      <canvas class="block w-full h-full bg-[#efcf91]" data-game-canvas></canvas>
      
      <!-- Top HUD row (distance | pause | goods) -->
      <div class="pointer-events-none absolute left-0 right-0 top-0 z-10 flex items-center justify-between gap-2 p-2 sm:p-4 text-[10px] sm:text-sm font-black text-white drop-shadow">
        <div class="rounded-full bg-black/35 px-3 py-1.5 sm:px-4 sm:py-2 backdrop-blur-sm" data-distance></div>
        <button class="pointer-events-auto rounded-full bg-black/35 px-3 py-1.5 sm:px-4 sm:py-2 backdrop-blur-sm" type="button" data-pause></button>
        <div class="rounded-full bg-black/35 px-3 py-1.5 sm:px-4 sm:py-2 backdrop-blur-sm" data-goods></div>
      </div>

      <!-- Progress bar — moved lower and wider -->
      <div class="pointer-events-none absolute left-1/2 top-14 sm:top-20 z-10 w-[55%] max-w-[400px] -translate-x-[45%]" data-progress-container style="display:none;">
        <div class="h-2 sm:h-2.5 w-full overflow-hidden rounded-full bg-black/35 backdrop-blur-sm shadow-inner ring-1 ring-white/20">
          <div class="h-full w-0 bg-gradient-to-r from-[#ffd709] to-[#ffb800] transition-all duration-300" data-progress-bar></div>
        </div>
        <div class="mt-1 sm:mt-1.5 text-center text-[10px] sm:text-xs font-black text-white drop-shadow" data-progress-text></div>
      </div>

      <!-- Lane controls: arrows positioned ON the actual canvas lanes (top + bottom).
           Track occupies y=43%..98% of canvas, split into 3 lanes.
           UP button sits on top lane center (~52%), DOWN button on bottom lane center (~89%).
           Hidden on fine-pointer devices (desktop/mouse) — keyboard arrows/WASD are used instead. -->
      <button type="button" class="pointer-events-auto absolute left-3 sm:left-5 z-10 flex h-12 w-12 sm:h-14 sm:w-14 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-black/45 text-white shadow-xl backdrop-blur-md transition active:scale-90 active:bg-black/70 caravan-lane-ctrl" style="top:52%;" data-lane-up aria-label="Lane up">
        <svg viewBox="0 0 24 24" class="h-7 w-7 sm:h-8 sm:w-8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
      </button>
      <button type="button" class="pointer-events-auto absolute left-3 sm:left-5 z-10 flex h-12 w-12 sm:h-14 sm:w-14 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-black/45 text-white shadow-xl backdrop-blur-md transition active:scale-90 active:bg-black/70 caravan-lane-ctrl" style="top:89%;" data-lane-down aria-label="Lane down">
        <svg viewBox="0 0 24 24" class="h-7 w-7 sm:h-8 sm:w-8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      <style>
        /* Hide on devices with a fine pointer (desktop with mouse). Keyboard
           arrows/WASD still work. Mobile + hybrid coarse-pointer devices
           continue to show the on-screen arrows. */
        @media (hover: hover) and (pointer: fine) {
          .caravan-lane-ctrl { display: none !important; }
        }
      </style>

      <!-- Orientation lock overlay (z-50) -->
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
  const ctx = canvas.getContext("2d", { alpha: false });
  const distanceEl = host.querySelector("[data-distance]");
  const goodsEl = host.querySelector("[data-goods]");
  const pauseBtn = host.querySelector("[data-pause]");
  const orientationOverlay = host.querySelector("[data-orientation-lock]");
  const laneUpBtn = host.querySelector("[data-lane-up]");
  const laneDownBtn = host.querySelector("[data-lane-down]");
  
  const progContainer = host.querySelector("[data-progress-container]");
  const progBar = host.querySelector("[data-progress-bar]");
  const progText = host.querySelector("[data-progress-text]");

  const baseUrl = new URL(".", import.meta.url);
  // Background is huge and never participates in collision -> keep as a raw
  // <img>. Everything that can collide with the camel (camel itself, raider,
  // obstacles, collectibles) is processed so we get cleaned alpha + a tight
  // bbox + an alpha mask for pixel-accurate hit detection.
  const PROCESSED_KEYS = new Set([
    "camel",
    "raider",
    "tree",
    "rock",
    "cloth",
    "spice",
    "scroll",
    "coin",
  ]);
  const assetFiles = [
    ["background", "steppe-background.webp"],
    ["camel", "camel_with_rider_static.png"],
    ["raider", "raider_on_horse_static_left.png"],
    ["tree", "fallen-tree.webp"],
    ["rock", "rock.webp"],
    ["cloth", "cloth.webp"],
    ["spice", "spice-jar.webp"],
    ["scroll", "scroll.webp"],
    ["coin", "coin-pouch.webp"],
  ];
  const assetEntries = await Promise.all(
    assetFiles.map(async ([key, file]) => {
      const url = new URL(`./assets/${file}`, baseUrl).href;
      if (PROCESSED_KEYS.has(key)) {
        return [key, await loadProcessedSprite(url)];
      }
      return [key, await loadImage(url)];
    }),
  );
  const assets = Object.fromEntries(assetEntries);

  let width = 960;
  let height = 540;
  let rafId = 0;
  let lastTime = 0;
  let overlay = null;
  let overlayMode = null;
  let running = false;
  let paused = false;
  let completed = false;
  let startedAt = 0;
  let touchStartY = 0;
  const state = {
    lane: 1,
    targetLane: 1,
    y: 0,
    distance: 0,
    goods: 0,
    speed: BASE_SCROLL_SPEED,
    speedMultiplier: 1,
    spawnTimer: 0,
    collectTimer: 1.2,
    obstacles: [],
    collectibles: [],
  };

  function getTrack() {
    const top = height * 0.43;
    const bottom = height * 0.98;
    const laneHeight = (bottom - top) / 3;
    return { top, bottom, laneHeight };
  }

  function getLaneY(lane) {
    const track = getTrack();
    return track.top + track.laneHeight * (lane + 0.5);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(360, Math.round(rect.width));
    height = Math.max(200, Math.round(rect.height));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    state.y = getLaneY(state.targetLane);
  }

  function removeOverlay() {
    if (overlay) overlay.remove();
    overlay = null;
    overlayMode = null;
  }

  function updateHud() {
    distanceEl.textContent = t(language, "caravan.distance", {
      n: Math.floor(state.distance),
    });
    goodsEl.textContent = t(language, "caravan.goods", { n: state.goods });
    pauseBtn.textContent = paused
      ? t(language, "caravan.continue")
      : t(language, "caravan.pause");

    // Update progress bar
    if (running || completed) {
      progContainer.style.display = "block";
      const progress = clamp(0, state.distance / WIN_DISTANCE, 1);
      progBar.style.width = `${progress * 100}%`;
      progText.textContent = `${Math.min(WIN_DISTANCE, Math.floor(state.distance))}/${WIN_DISTANCE}`;
    } else {
      progContainer.style.display = "none";
    }
  }

  function resetGame() {
    state.lane = 1;
    state.targetLane = 1;
    state.y = getLaneY(1);
    state.distance = 0;
    state.goods = 0;
    state.speed = BASE_SCROLL_SPEED;
    state.speedMultiplier = 1;
    state.spawnTimer = 0.6;
    state.collectTimer = 1.0;
    state.obstacles = [];
    state.collectibles = [];
    completed = false;
    paused = false;
    running = true;
    startedAt = performance.now();
    lastTime = startedAt;
    removeOverlay();
    updateHud();
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  function moveLane(delta) {
    if (!running || paused) return;
    state.targetLane = Math.max(0, Math.min(2, state.targetLane + delta));
  }

  // Returns a free spawn x-coordinate near `baseX` for the given lane, or
  // null if no nearby slot is free. We require a generous gap in the same
  // lane (so players can react) and a smaller gap across lanes (so items
  // don't visually stack on top of each other while still feeling busy).
  function findFreeSpawnX(baseX, lane) {
    const SAME_LANE_GAP = 170;
    const CROSS_LANE_GAP = 90;
    let x = baseX;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      let conflict = false;
      for (const item of state.obstacles) {
        const gap = item.lane === lane ? SAME_LANE_GAP : CROSS_LANE_GAP;
        if (Math.abs(item.x - x) < gap) {
          conflict = true;
          break;
        }
      }
      if (!conflict) {
        for (const item of state.collectibles) {
          const gap = item.lane === lane ? SAME_LANE_GAP : CROSS_LANE_GAP;
          if (Math.abs(item.x - x) < gap) {
            conflict = true;
            break;
          }
        }
      }
      if (!conflict) return x;
      x += 55;
    }
    return null;
  }

  function spawnObstacle() {
    const lane = Math.floor(Math.random() * 3);
    const kind = Math.random() > 0.78 ? "raider" : Math.random() > 0.5 ? "rock" : "tree";
    const x = findFreeSpawnX(width + 70, lane);
    if (x === null) return false;
    state.obstacles.push({
      x,
      lane,
      size: kind === "raider" ? 68 : 58,
      kind,
    });
    return true;
  }

  function spawnCollectible() {
    const lane = Math.floor(Math.random() * 3);
    const kinds = ["cloth", "spice", "scroll", "coin"];
    // Scale collectible size with the canvas width so goods read clearly on
    // desktop (wide canvas) while staying reasonable on mobile. On a 480px
    // mobile canvas ≈ 60px; on a 1200px desktop canvas ≈ 108px.
    const size = Math.round(Math.min(130, Math.max(58, width * 0.09)));
    const x = findFreeSpawnX(width + 60, lane);
    if (x === null) return false;
    state.collectibles.push({
      x,
      lane,
      size,
      kind: kinds[Math.floor(Math.random() * kinds.length)],
    });
    return true;
  }

  function drawCoverImage(image, parallaxX = 0) {
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    const maxShift = Math.max(0, drawWidth - width);
    const x = -((parallaxX % Math.max(drawWidth, 1)) / Math.max(drawWidth, 1)) * maxShift;
    ctx.drawImage(image, x, (height - drawHeight) / 2, drawWidth, drawHeight);
  }

  function drawBackground() {
    const track = getTrack();
    // Static background on both desktop and mobile (per user request).
    // Previously scrolled with `state.distance * 18` parallax.
    drawCoverImage(assets.background, 0);
    const warmOverlay = ctx.createLinearGradient(0, 0, width, height);
    warmOverlay.addColorStop(0, "rgba(244, 178, 89, 0.18)");
    warmOverlay.addColorStop(0.7, "rgba(178, 117, 52, 0.16)");
    warmOverlay.addColorStop(1, "rgba(30, 28, 24, 0.16)");
    ctx.fillStyle = warmOverlay;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "rgba(196, 135, 57, 0.45)";
    ctx.fillRect(0, track.top, width, track.bottom - track.top);

    for (let lane = 0; lane < 3; lane += 1) {
      const y = track.top + track.laneHeight * lane;
      ctx.fillStyle =
        lane === state.targetLane
          ? "rgba(244,236,216,0.16)"
          : "rgba(255,255,255,0.05)";
      ctx.fillRect(0, y, width, track.laneHeight);
    }

    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 1;
    for (let divider = 1; divider < 3; divider += 1) {
      const y = Math.round(track.top + track.laneHeight * divider) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  function drawSprite(asset, x, y, maxWidth, maxHeight) {
    // Accepts either a raw <img> (background) or a processed sprite (object
    // with `canvas`, `naturalWidth`, `naturalHeight`).
    const drawable = asset.canvas || asset;
    const naturalWidth = asset.naturalWidth || asset.width || 1;
    const naturalHeight = asset.naturalHeight || asset.height || 1;
    const scale = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight);
    const drawWidth = naturalWidth * scale;
    const drawHeight = naturalHeight * scale;
    ctx.drawImage(drawable, x - drawWidth / 2, y - drawHeight / 2, drawWidth, drawHeight);
  }

  // ---- Geometry + pixel-accurate collision helpers ----
  // For any sprite drawn centered at (cx, cy) with `drawSprite`, returns the
  // axis-aligned screen rectangle of the *full* drawn area.
  function spriteDrawRect(sprite, cx, cy, maxWidth, maxHeight) {
    const w = sprite.naturalWidth || 1;
    const h = sprite.naturalHeight || 1;
    const scale = Math.min(maxWidth / w, maxHeight / h);
    const dw = w * scale;
    const dh = h * scale;
    return {
      left: cx - dw / 2,
      top: cy - dh / 2,
      right: cx + dw / 2,
      bottom: cy + dh / 2,
    };
  }

  // Maps a sprite's normalized tight bbox into screen space.
  function spriteTightRect(sprite, drawRect) {
    const dw = drawRect.right - drawRect.left;
    const dh = drawRect.bottom - drawRect.top;
    const t = sprite.tightRect || { left: 0, top: 0, right: 1, bottom: 1 };
    return {
      left: drawRect.left + t.left * dw,
      top: drawRect.top + t.top * dh,
      right: drawRect.left + t.right * dw,
      bottom: drawRect.top + t.bottom * dh,
    };
  }

  function sampleSpriteMask(sprite, drawRect, sx, sy) {
    const mask = sprite.alphaMask;
    if (!mask) return true;
    const dw = drawRect.right - drawRect.left;
    const dh = drawRect.bottom - drawRect.top;
    if (dw <= 0 || dh <= 0) return false;
    const u = (sx - drawRect.left) / dw;
    const v = (sy - drawRect.top) / dh;
    if (u < 0 || u > 1 || v < 0 || v > 1) return false;
    const col = Math.min(mask.cols - 1, Math.floor(u * mask.cols));
    const row = Math.min(mask.rows - 1, Math.floor(v * mask.rows));
    return mask.data[row * mask.cols + col] === 1;
  }

  // Returns true when the *opaque* portions of two sprites overlap in screen
  // space. Cheap AABB short-circuit first, then a small grid of sample points
  // tested against both alpha masks.
  function spritesOverlap(spriteA, drawA, spriteB, drawB) {
    const tightA = spriteTightRect(spriteA, drawA);
    const tightB = spriteTightRect(spriteB, drawB);
    if (tightA.right <= tightB.left || tightA.left >= tightB.right) return false;
    if (tightA.bottom <= tightB.top || tightA.top >= tightB.bottom) return false;
    const overlapL = Math.max(tightA.left, tightB.left);
    const overlapT = Math.max(tightA.top, tightB.top);
    const overlapR = Math.min(tightA.right, tightB.right);
    const overlapB = Math.min(tightA.bottom, tightB.bottom);
    const samples = 7;
    for (let sy = 0; sy < samples; sy += 1) {
      for (let sx = 0; sx < samples; sx += 1) {
        const px = overlapL + ((sx + 0.5) / samples) * (overlapR - overlapL);
        const py = overlapT + ((sy + 0.5) / samples) * (overlapB - overlapT);
        if (
          sampleSpriteMask(spriteA, drawA, px, py) &&
          sampleSpriteMask(spriteB, drawB, px, py)
        ) {
          return true;
        }
      }
    }
    return false;
  }

  // Geometry helpers mirror the values used inside the matching draw* fns.
  function camelGeometry() {
    const track = getTrack();
    return {
      cx: width * 0.22,
      cy: state.y,
      maxWidth: Math.min(245, width * 0.4),
      maxHeight: track.laneHeight * 1.28,
    };
  }

  function obstacleGeometry(item) {
    const track = getTrack();
    const cy = getLaneY(item.lane);
    if (item.kind === "raider") {
      return {
        cx: item.x,
        cy,
        maxWidth: Math.min(220, width * 0.34),
        maxHeight: track.laneHeight * 1.16,
      };
    }
    const maxWidth =
      item.kind === "tree" ? Math.min(150, width * 0.34) : Math.min(105, width * 0.24);
    return { cx: item.x, cy, maxWidth, maxHeight: track.laneHeight * 0.9 };
  }

  function collectibleGeometry(item) {
    return {
      cx: item.x,
      cy: getLaneY(item.lane),
      maxWidth: item.size,
      maxHeight: item.size,
    };
  }

  function getCamelDrawRect() {
    const g = camelGeometry();
    return spriteDrawRect(assets.camel, g.cx, g.cy, g.maxWidth, g.maxHeight);
  }

  function drawShadow(x, y, widthValue, heightValue, opacity = 0.24) {
    ctx.fillStyle = `rgba(38, 28, 18, ${opacity})`;
    ctx.beginPath();
    ctx.ellipse(x, y + heightValue * 0.34, widthValue * 0.28, heightValue * 0.055, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCamel() {
    const track = getTrack();
    const targetY = getLaneY(state.targetLane);
    state.y += (targetY - state.y) * 0.24;

    const cx = width * 0.22;
    const cy = state.y;
    const maxWidth = Math.min(245, width * 0.4);
    const maxHeight = track.laneHeight * 1.28;

    drawShadow(cx, cy, maxWidth, maxHeight, 0.12);
    drawSprite(assets.camel, cx, cy, maxWidth, maxHeight);
  }

  function drawRaider(item) {
    const track = getTrack();
    const y = getLaneY(item.lane);
    const maxWidth = Math.min(220, width * 0.34);
    const maxHeight = track.laneHeight * 1.16;

    drawShadow(item.x, y, maxWidth, maxHeight, 0.1);
    drawSprite(assets.raider, item.x, y, maxWidth, maxHeight);
  }

  function drawObstacle(item, time) {
    if (item.kind === "raider") {
      drawRaider(item);
      return;
    }
    const track = getTrack();
    const y = getLaneY(item.lane);
    const image = item.kind === "tree" ? assets.tree : assets.rock;
    const maxWidth = item.kind === "tree" ? Math.min(150, width * 0.34) : Math.min(105, width * 0.24);
    const maxHeight = track.laneHeight * 0.9;
    drawShadow(item.x, y, maxWidth, maxHeight, 0.1);
    drawSprite(image, item.x, y, maxWidth, maxHeight);
  }

  function drawCollectible(item) {
    const image = assets[item.kind];
    if (!image) return;
    const y = getLaneY(item.lane);
    drawSprite(image, item.x, y, item.size, item.size);
  }

  function obstacleHitsCamel(item) {
    const obstacleSprite = item.kind === "raider"
      ? assets.raider
      : item.kind === "tree"
        ? assets.tree
        : assets.rock;
    const og = obstacleGeometry(item);
    const obstacleRect = spriteDrawRect(
      obstacleSprite,
      og.cx,
      og.cy,
      og.maxWidth,
      og.maxHeight,
    );
    return spritesOverlap(
      assets.camel,
      getCamelDrawRect(),
      obstacleSprite,
      obstacleRect,
    );
  }

  function collectibleTouchesCamel(item) {
    const sprite = assets[item.kind];
    if (!sprite) return false;
    const cg = collectibleGeometry(item);
    const itemRect = spriteDrawRect(sprite, cg.cx, cg.cy, cg.maxWidth, cg.maxHeight);
    // Pickup is slightly more forgiving than obstacle damage – we expand the
    // camel's draw rect by a small margin so brushing past a coin still picks
    // it up even if the visible silhouettes don't quite touch.
    const camelRect = getCamelDrawRect();
    const PICKUP_MARGIN = 10;
    const expanded = {
      left: camelRect.left - PICKUP_MARGIN,
      top: camelRect.top - PICKUP_MARGIN,
      right: camelRect.right + PICKUP_MARGIN,
      bottom: camelRect.bottom + PICKUP_MARGIN,
    };
    return spritesOverlap(assets.camel, expanded, sprite, itemRect);
  }

  function calculateScore(distance = state.distance) {
    return Math.floor(distance) + state.goods * 5;
  }

  function finalStatsLines() {
    const distance = Math.floor(state.distance);
    const bonus = state.goods * 5;
    const score = distance + bonus;
    return [
      t(language, "caravan.distance", { n: distance }),
      t(language, "caravan.goodsBonusLine", { n: state.goods, bonus }),
      "─────────────",
      t(language, "caravan.totalScore", { n: score }),
    ];
  }

  function showReadyOverlay() {
    removeOverlay();
    overlayMode = "ready";
    overlay = createOverlay(
      frame,
      t(language, "caravan.readyTitle"),
      t(language, "caravan.readyBody"),
      [
        { label: t(language, "caravan.start"), onClick: resetGame },
        { label: t(language, "caravan.exit"), onClick: () => (window.location.href = "../map_hub/code.html") },
      ],
    );
    overlayMode = "ready";
  }

  function showEndOverlay(reachedGoal) {
    removeOverlay();
    overlayMode = reachedGoal ? "victory" : "fail";
    overlay = createOverlay(
      frame,
      reachedGoal
        ? t(language, "caravan.victoryTitle")
        : t(language, "caravan.failTitle"),
      reachedGoal
        ? finalStatsLines()
        : [t(language, "caravan.failHint"), ...finalStatsLines()],
      reachedGoal
        ? [
            { label: t(language, "caravan.replay"), onClick: resetGame },
            {
              label: t(language, "caravan.continueToNext"),
              onClick: () => options.goToNextPeriod?.() ?? (window.location.href = "../map_hub/code.html"),
            },
          ]
        : [{ label: t(language, "caravan.restart"), onClick: resetGame }],
    );
    overlayMode = reachedGoal ? "victory" : "fail";
  }

  async function endLose() {
    running = false;
    cancelAnimationFrame(rafId);
    const reachedGoal = state.distance >= WIN_DISTANCE;
    if (reachedGoal && !completed) {
      completed = true;
      const elapsedSeconds = Math.round((performance.now() - startedAt) / 1000);
      await options.onWin?.({
        score: calculateScore(),
        elapsedSeconds,
        distance: Math.floor(state.distance),
        goods: state.goods,
      });
    }
    showEndOverlay(reachedGoal);
  }

  function update(dt) {
    state.speedMultiplier = Math.min(2, 1 + Math.floor(state.distance / 50) * 0.05);
    state.speed = BASE_SCROLL_SPEED * state.speedMultiplier;
    state.distance += (state.speed * dt) / 22;
    state.spawnTimer -= dt;
    state.collectTimer -= dt;

    if (state.spawnTimer <= 0) {
      const ok = spawnObstacle();
      // If we couldn't spawn (no free slot), retry shortly so the rhythm of
      // the game doesn't stall.
      state.spawnTimer = ok
        ? clamp(0.55, 1.05 + Math.random() * 0.75 - state.speedMultiplier * 0.18, 1.45)
        : 0.18;
    }
    if (state.collectTimer <= 0) {
      const ok = spawnCollectible();
      state.collectTimer = ok ? 0.95 + Math.random() * 0.95 : 0.18;
    }

    state.obstacles.forEach((item) => {
      item.x -= state.speed * dt;
    });
    state.collectibles.forEach((item) => {
      item.x -= state.speed * dt;
    });
    state.obstacles = state.obstacles.filter((item) => item.x > -130);
    state.collectibles = state.collectibles.filter((item) => item.x > -90);

    for (const obstacle of state.obstacles) {
      // Only the lane the camel is currently in can hit it. Pixel-accurate
      // collision uses the sprite's actual silhouette, not a circle, so the
      // green/transparent margins around an asset no longer count as a hit.
      if (obstacle.lane !== state.targetLane) continue;
      if (obstacleHitsCamel(obstacle)) {
        endLose().catch((error) => {
          console.error(error);
          showEndOverlay(false);
        });
        return;
      }
    }

    state.collectibles = state.collectibles.filter((item) => {
      if (item.lane !== state.targetLane) return true;
      if (collectibleTouchesCamel(item)) {
        state.goods += 1;
        return false;
      }
      return true;
    });
  }

  function render(time) {
    drawBackground();
    state.collectibles.forEach(drawCollectible);
    state.obstacles.forEach((item) => drawObstacle(item, time));
    drawCamel(time);
    updateHud();
  }

  function loop(time) {
    if (!running || paused) return;
    const dt = Math.min(0.033, (time - lastTime) / 1000 || 0);
    lastTime = time;
    update(dt);
    render(time);
    if (running && !paused) rafId = requestAnimationFrame(loop);
  }

  function refreshOverlayLanguage() {
    if (overlayMode === "ready") {
      showReadyOverlay();
    } else if (overlayMode === "victory") {
      showEndOverlay(true);
    } else if (overlayMode === "fail") {
      showEndOverlay(false);
    }
  }

  pauseBtn.addEventListener("click", () => {
    if (!running) return;
    paused = !paused;
    updateHud();
    if (!paused) {
      lastTime = performance.now();
      rafId = requestAnimationFrame(loop);
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowUp") moveLane(-1);
    if (event.key === "ArrowDown") moveLane(1);
    if (event.code === "Space") pauseBtn.click();
  });
  canvas.addEventListener(
    "touchstart",
    (event) => {
      touchStartY = event.touches[0]?.clientY || 0;
    },
    { passive: true },
  );
  canvas.addEventListener(
    "touchend",
    (event) => {
      const endY = event.changedTouches[0]?.clientY || touchStartY;
      const delta = endY - touchStartY;
      if (Math.abs(delta) > 28) moveLane(delta > 0 ? 1 : -1);
    },
    { passive: true },
  );

  // --- On-screen mobile controls (lane up/down buttons) ---
  const laneUpButton = host.querySelector("[data-lane-up]");
  const laneDownButton = host.querySelector("[data-lane-down]");
  const bindLaneControl = (button, direction) => {
    if (!button) return;
    const trigger = (event) => {
      event.preventDefault();
      moveLane(direction);
    };
    button.addEventListener("pointerdown", trigger);
    button.addEventListener("contextmenu", (e) => e.preventDefault());
  };
  bindLaneControl(laneUpButton, -1);
  bindLaneControl(laneDownButton, 1);

  // --- Orientation prompt for narrow portrait screens ---
  const orientationLock = host.querySelector("[data-orientation-lock]");
  const portraitMedia = window.matchMedia(
    "(orientation: portrait) and (max-width: 820px)",
  );
  // HUD + control elements that must hide while the orientation lock is on.
  const hudElements = [
    host.querySelector("[data-distance]"),
    host.querySelector("[data-goods]"),
    host.querySelector("[data-pause]"),
    host.querySelector("[data-progress-container]"),
    host.querySelector("[data-lane-up]"),
    host.querySelector("[data-lane-down]"),
  ].filter(Boolean);
  const updateOrientationLock = () => {
    if (!orientationLock) return;
    if (portraitMedia.matches) {
      orientationLock.classList.remove("hidden");
      orientationLock.classList.add("flex");
      hudElements.forEach((el) => el.classList.add("hidden"));
      if (running && !paused) {
        paused = true;
        updateHud();
      }
    } else {
      orientationLock.classList.add("hidden");
      orientationLock.classList.remove("flex");
      hudElements.forEach((el) => el.classList.remove("hidden"));
    }
  };
  portraitMedia.addEventListener("change", updateOrientationLock);
  window.addEventListener("orientationchange", updateOrientationLock);
  updateOrientationLock();

  window.addEventListener("sapar-language-change", (event) => {
    language = event.detail?.language || language;
    updateHud();
    refreshOverlayLanguage();
  });

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();
  updateHud();
  render(0);

  // If already in landscape (or desktop), show ready overlay immediately.
  // If in portrait, wait until rotated to landscape before showing ready overlay.
  if (portraitMedia.matches) {
    const onFirstRotate = () => {
      if (!portraitMedia.matches) {
        showReadyOverlay();
        portraitMedia.removeEventListener("change", onFirstRotate);
        window.removeEventListener("orientationchange", onFirstRotate);
      }
    };
    portraitMedia.addEventListener("change", onFirstRotate);
    window.addEventListener("orientationchange", onFirstRotate);
  } else {
    showReadyOverlay();
  }
}
