import {
  getLocalizedCityName,
  PERIOD_CAPITAL_MARKERS,
  PERIOD_MAP_ASSETS,
  PERIOD_SVG_CITY_ALIASES,
} from "./city-visuals.js";

const CITY_GROUP_SELECTOR = "#cities > g";
const INTERACTIVE_CITY_SELECTOR = "#cities > g.map-city[data-city]";
const SVG_CACHE = new Map();
const PAN_ZOOM_STATE = new WeakMap();
const MAX_ZOOM = 5;
const DRAG_THRESHOLD_PX = 10;
const SUPPRESS_CLICK_MS = 140;
const TAP_SELECTION_SUPPRESS_MS = 260;
const SVG_FETCH_TIMEOUT_MS = 15000;
const COMPACT_MAP_QUERY = "(max-width: 1023px), (pointer: coarse)";

function normalizeSvgMarkup(markup) {
  return String(markup)
    .replace(/^\s*<\?xml[^>]*>\s*/i, "")
    .replace(/viewbox=/i, "viewBox=");
}

function normalizeLabel(text) {
  return String(text || "")
    .replace(/[★☆✦⭐]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е");
}

function collectLabelKeys(text) {
  const normalized = normalizeLabel(text);
  if (!normalized) {
    return [];
  }

  const keys = new Set([normalized]);
  const beforePipe = normalizeLabel(normalized.split("|")[0]);
  if (beforePipe) {
    keys.add(beforePipe);
  }

  const withoutParentheses = normalizeLabel(beforePipe.replace(/\s*\([^)]*\)\s*/g, " "));
  if (withoutParentheses) {
    keys.add(withoutParentheses);
  }

  return [...keys];
}

async function getPeriodSvgMarkup(periodCode) {
  const assetPath = PERIOD_MAP_ASSETS[periodCode];
  if (!assetPath) {
    throw new Error(`Для периода ${periodCode} не найден SVG-файл карты.`);
  }

  if (SVG_CACHE.has(periodCode)) {
    return SVG_CACHE.get(periodCode);
  }

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(
    () => controller.abort(),
    SVG_FETCH_TIMEOUT_MS
  );
  let response;

  try {
    response = await fetch(assetPath, {
      cache: "force-cache",
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Карта периода загружалась слишком долго.");
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
  if (!response.ok) {
    throw new Error(`Не удалось загрузить SVG-карту для периода ${periodCode}.`);
  }

  const markup = normalizeSvgMarkup(await response.text());
  SVG_CACHE.set(periodCode, markup);
  return markup;
}

function resolveBackendCity(periodCode, cityGroup) {
  const explicitCity = cityGroup.getAttribute("data-city");
  if (explicitCity) {
    return explicitCity.trim() || null;
  }

  const aliases = PERIOD_SVG_CITY_ALIASES[periodCode] || {};
  const texts = [...cityGroup.querySelectorAll("text")]
    .map((node) => node.textContent || "")
    .flatMap(collectLabelKeys);

  for (const key of texts) {
    if (aliases[key]) {
      return aliases[key];
    }
  }

  return null;
}

function prepareVisualCityGroup(cityGroup) {
  const circles = [...cityGroup.querySelectorAll("circle")];
  const labels = [...cityGroup.querySelectorAll("text")];

  cityGroup.classList.add("map-city");

  circles.forEach((circle, index) => {
    const isCore = circles.length === 1 || index === circles.length - 1;
    circle.classList.add(isCore ? "map-city-core" : "map-city-ring");
  });

  labels.forEach((label) => {
    label.classList.add("map-city-label");
    if (!label.dataset.originalText) {
      label.dataset.originalText = label.textContent || "";
    }
    if (!label.dataset.originalFontSize) {
      label.dataset.originalFontSize = label.getAttribute("font-size") || "";
    }
  });
}

function isCompactMapViewport() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(COMPACT_MAP_QUERY).matches
  );
}

function resetCompactActiveCityStyles(cityGroup) {
  cityGroup.querySelectorAll(".map-city-core, .map-city-ring, .map-city-label").forEach((shape) => {
    shape.style.removeProperty("display");
    shape.style.removeProperty("opacity");
    shape.style.removeProperty("stroke-width");
    shape.style.removeProperty("vector-effect");
  });
}

function applyCompactActiveCityStyles(cityGroup, isActive, isCompact) {
  resetCompactActiveCityStyles(cityGroup);

  if (!isCompact) {
    return;
  }

  cityGroup.querySelectorAll(".map-city-core, .map-city-ring").forEach((shape) => {
    shape.style.setProperty("vector-effect", "non-scaling-stroke");
  });

  cityGroup.querySelectorAll(".map-city-label").forEach((label) => {
    label.style.setProperty("vector-effect", "non-scaling-stroke");
    if (isActive) {
      label.style.setProperty("stroke-width", "0.45px");
    }
  });

  const core = cityGroup.querySelector(".map-city-core");
  if (core && isActive) {
    core.style.setProperty("stroke-width", "0.65px");
  }

  if (!isActive) {
    return;
  }

  cityGroup.querySelectorAll(".map-city-ring").forEach((ring) => {
    ring.style.setProperty("display", "none");
    ring.style.setProperty("opacity", "0");
    ring.style.setProperty("stroke-width", "0px");
  });
}

function updateCityGroupLabel(cityGroup, language = "ru") {
  const city = cityGroup.dataset.city;
  if (!city) {
    return;
  }

  const labelText = getLocalizedCityName(city, language);
  cityGroup.setAttribute("aria-label", labelText);

  cityGroup.querySelectorAll("text.map-city-label").forEach((label) => {
    const originalText = label.dataset.originalText || label.textContent || "";
    const originalFontSize = label.dataset.originalFontSize;

    if (language === "en") {
      label.textContent = labelText;
      const baseSize = Number.parseFloat(originalFontSize || label.getAttribute("font-size") || "10");
      const scale = labelText.length > 14 ? 0.78 : labelText.length > 10 ? 0.88 : 1;
      label.setAttribute("font-size", String(Math.max(7, Math.round(baseSize * scale * 10) / 10)));
      return;
    }

    label.textContent = originalText;
    if (originalFontSize) {
      label.setAttribute("font-size", originalFontSize);
    }
  });
}

function matchesCapitalMarker(periodCode, cityGroup, city) {
  const capitalMarker = PERIOD_CAPITAL_MARKERS[periodCode];
  if (!capitalMarker) {
    return false;
  }

  if (capitalMarker.backendCity && capitalMarker.backendCity === city) {
    return true;
  }

  if (!capitalMarker.labelKeys?.length) {
    return false;
  }

  const groupKeys = [...cityGroup.querySelectorAll("text")]
    .map((node) => node.textContent || "")
    .flatMap(collectLabelKeys);

  return capitalMarker.labelKeys.some((key) => groupKeys.includes(key));
}

function prepareInteractiveCityGroup(cityGroup, city, periodCode) {
  prepareVisualCityGroup(cityGroup);

  cityGroup.dataset.city = city;
  cityGroup.setAttribute("tabindex", cityGroup.getAttribute("tabindex") || "0");
  cityGroup.setAttribute("role", cityGroup.getAttribute("role") || "button");
  cityGroup.setAttribute("aria-pressed", "false");
  cityGroup.setAttribute("focusable", "true");
  cityGroup.classList.toggle("is-capital", matchesCapitalMarker(periodCode, cityGroup, city));
  updateCityGroupLabel(cityGroup, "ru");
}

function prepareCapitalOnlyGroup(cityGroup) {
  prepareVisualCityGroup(cityGroup);
  cityGroup.classList.add("is-capital", "is-static");
}

function prepareSvg(svgElement, periodCode) {
  const currentViewBox =
    svgElement.getAttribute("viewBox") || svgElement.getAttribute("viewbox");

  if (currentViewBox) {
    svgElement.setAttribute("viewBox", currentViewBox);
    svgElement.removeAttribute("viewbox");
  }

  svgElement.setAttribute("width", "100%");
  svgElement.setAttribute("height", "100%");
  svgElement.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svgElement.dataset.periodCode = periodCode;
  svgElement.style.touchAction = "none";
  svgElement.style.cursor = "grab";

  svgElement.querySelectorAll(CITY_GROUP_SELECTOR).forEach((cityGroup) => {
    const city = resolveBackendCity(periodCode, cityGroup);
    const isCapital = matchesCapitalMarker(periodCode, cityGroup, city);

    if (!city && isCapital) {
      prepareCapitalOnlyGroup(cityGroup);
      return;
    }

    if (!city) {
      return;
    }

    prepareInteractiveCityGroup(cityGroup, city, periodCode);
  });
}

function parseViewBox(svgElement) {
  const rawViewBox = svgElement.getAttribute("viewBox");
  if (rawViewBox) {
    const [x, y, width, height] = rawViewBox
      .split(/\s+/)
      .map((value) => Number.parseFloat(value));
    if ([x, y, width, height].every(Number.isFinite)) {
      return { x, y, width, height };
    }
  }

  const width = svgElement.viewBox?.baseVal?.width || svgElement.clientWidth || 100;
  const height = svgElement.viewBox?.baseVal?.height || svgElement.clientHeight || 100;
  return { x: 0, y: 0, width, height };
}

function cloneViewBox(viewBox) {
  return {
    x: viewBox.x,
    y: viewBox.y,
    width: viewBox.width,
    height: viewBox.height,
  };
}

function applyViewBox(svgElement, viewBox) {
  svgElement.setAttribute(
    "viewBox",
    `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`
  );
}

function getPointerStats(pointerMap) {
  const pointers = [...pointerMap.values()];
  if (pointers.length < 2) {
    return null;
  }

  const [first, second] = pointers;
  const midpoint = {
    x: (first.clientX + second.clientX) / 2,
    y: (first.clientY + second.clientY) / 2,
  };
  const distance = Math.hypot(
    second.clientX - first.clientX,
    second.clientY - first.clientY
  );
  return { midpoint, distance };
}

function clampViewBox(state, proposed) {
  const minWidth = state.initialViewBox.width / MAX_ZOOM;
  const minHeight = state.initialViewBox.height / MAX_ZOOM;
  const width = Math.min(
    state.initialViewBox.width,
    Math.max(minWidth, proposed.width)
  );
  const height = Math.min(
    state.initialViewBox.height,
    Math.max(minHeight, proposed.height)
  );

  const maxX = state.initialViewBox.x + state.initialViewBox.width - width;
  const maxY = state.initialViewBox.y + state.initialViewBox.height - height;

  return {
    x: Math.min(maxX, Math.max(state.initialViewBox.x, proposed.x)),
    y: Math.min(maxY, Math.max(state.initialViewBox.y, proposed.y)),
    width,
    height,
  };
}

function zoomAroundClientPoint(state, clientX, clientY, scaleFactor) {
  const rect = state.svgElement.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return;
  }

  const nextWidth = state.viewBox.width * scaleFactor;
  const nextHeight = state.viewBox.height * scaleFactor;
  const offsetX = (clientX - rect.left) / rect.width;
  const offsetY = (clientY - rect.top) / rect.height;
  const anchorX = state.viewBox.x + offsetX * state.viewBox.width;
  const anchorY = state.viewBox.y + offsetY * state.viewBox.height;

  const proposed = {
    width: nextWidth,
    height: nextHeight,
    x: anchorX - offsetX * nextWidth,
    y: anchorY - offsetY * nextHeight,
  };
  state.viewBox = clampViewBox(state, proposed);
  applyViewBox(state.svgElement, state.viewBox);
}

function resetPinch(state) {
  state.pinch = null;
}

function attachPanZoom(container, svgElement) {
  const initialViewBox = parseViewBox(svgElement);
  const state = {
    svgElement,
    initialViewBox,
    viewBox: cloneViewBox(initialViewBox),
    pointers: new Map(),
    dragOrigin: null,
    pinch: null,
    moved: false,
    suppressClickUntil: 0,
  };

  const startPointer = (event) => {
    state.pointers.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
    });

    if (state.pointers.size === 1) {
      state.dragOrigin = {
        clientX: event.clientX,
        clientY: event.clientY,
        viewBox: cloneViewBox(state.viewBox),
      };
      state.moved = false;
      svgElement.style.cursor = "grabbing";
    } else if (state.pointers.size === 2) {
      const pointerStats = getPointerStats(state.pointers);
      if (pointerStats) {
        state.pinch = {
          distance: pointerStats.distance,
          midpoint: pointerStats.midpoint,
          viewBox: cloneViewBox(state.viewBox),
        };
      }
    }

    svgElement.setPointerCapture?.(event.pointerId);
  };

  const movePointer = (event) => {
    if (!state.pointers.has(event.pointerId)) {
      return;
    }

    state.pointers.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
    });

    if (state.pointers.size >= 2) {
      const pointerStats = getPointerStats(state.pointers);
      if (!pointerStats) {
        return;
      }
      if (!state.pinch) {
        state.pinch = {
          distance: pointerStats.distance,
          midpoint: pointerStats.midpoint,
          viewBox: cloneViewBox(state.viewBox),
        };
      }
      if (!state.pinch.distance) {
        return;
      }

      const rect = svgElement.getBoundingClientRect();
      const baseViewBox = state.pinch.viewBox;
      const scaleFactor = state.pinch.distance / pointerStats.distance;
      const nextWidth = baseViewBox.width * scaleFactor;
      const nextHeight = baseViewBox.height * scaleFactor;
      const baseOffsetX = (state.pinch.midpoint.x - rect.left) / rect.width;
      const baseOffsetY = (state.pinch.midpoint.y - rect.top) / rect.height;
      const currentOffsetX = (pointerStats.midpoint.x - rect.left) / rect.width;
      const currentOffsetY = (pointerStats.midpoint.y - rect.top) / rect.height;
      const anchorX = baseViewBox.x + baseOffsetX * baseViewBox.width;
      const anchorY = baseViewBox.y + baseOffsetY * baseViewBox.height;

      state.viewBox = clampViewBox(state, {
        width: nextWidth,
        height: nextHeight,
        x: anchorX - currentOffsetX * nextWidth,
        y: anchorY - currentOffsetY * nextHeight,
      });
      applyViewBox(svgElement, state.viewBox);
      state.moved = true;
      return;
    }

    if (!state.dragOrigin) {
      return;
    }
    if (Math.abs(state.viewBox.width - state.initialViewBox.width) < 0.001) {
      return;
    }

    const rect = svgElement.getBoundingClientRect();
    const scaleX = state.dragOrigin.viewBox.width / rect.width;
    const scaleY = state.dragOrigin.viewBox.height / rect.height;
    const deltaX = event.clientX - state.dragOrigin.clientX;
    const deltaY = event.clientY - state.dragOrigin.clientY;

    if (Math.hypot(deltaX, deltaY) >= DRAG_THRESHOLD_PX) {
      state.moved = true;
    }

    state.viewBox = clampViewBox(state, {
      x: state.dragOrigin.viewBox.x - deltaX * scaleX,
      y: state.dragOrigin.viewBox.y - deltaY * scaleY,
      width: state.dragOrigin.viewBox.width,
      height: state.dragOrigin.viewBox.height,
    });
    applyViewBox(svgElement, state.viewBox);
  };

  const endPointer = (event) => {
    state.pointers.delete(event.pointerId);
    if (svgElement.hasPointerCapture?.(event.pointerId)) {
      svgElement.releasePointerCapture(event.pointerId);
    }

    if (state.moved) {
      state.suppressClickUntil = Date.now() + SUPPRESS_CLICK_MS;
    }

    if (state.pointers.size < 2) {
      resetPinch(state);
    }
    if (state.pointers.size === 1) {
      const [remaining] = state.pointers.values();
      state.dragOrigin = remaining
        ? {
            clientX: remaining.clientX,
            clientY: remaining.clientY,
            viewBox: cloneViewBox(state.viewBox),
          }
        : null;
    } else if (state.pointers.size === 0) {
      state.dragOrigin = null;
      state.moved = false;
      svgElement.style.cursor =
        Math.abs(state.viewBox.width - state.initialViewBox.width) < 0.001
          ? "grab"
          : "grab";
    }
  };

  svgElement.addEventListener("wheel", (event) => {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 0.9 : 1.1;
    zoomAroundClientPoint(state, event.clientX, event.clientY, factor);
  }, { passive: false });

  svgElement.addEventListener("pointerdown", startPointer);
  svgElement.addEventListener("pointermove", movePointer);
  svgElement.addEventListener("pointerup", endPointer);
  svgElement.addEventListener("pointercancel", endPointer);
  svgElement.addEventListener("pointerleave", (event) => {
    if (state.pointers.has(event.pointerId) && state.pointers.size <= 1) {
      endPointer(event);
    }
  });

  PAN_ZOOM_STATE.set(container, state);
}

function shouldSuppressCitySelect(container) {
  const state = PAN_ZOOM_STATE.get(container);
  if (!state) {
    return false;
  }
  return Date.now() < state.suppressClickUntil;
}

function wasPointerGestureMoved(container) {
  return Boolean(PAN_ZOOM_STATE.get(container)?.moved);
}

function suppressCitySelect(container, duration = SUPPRESS_CLICK_MS) {
  const state = PAN_ZOOM_STATE.get(container);
  if (!state) {
    return;
  }

  state.suppressClickUntil = Date.now() + duration;
}

function bindCityEvents(container, onCitySelect) {
  container.querySelectorAll(INTERACTIVE_CITY_SELECTOR).forEach((cityGroup) => {
    const city = cityGroup.dataset.city;
    let pointerTapState = null;

    cityGroup.addEventListener("pointerdown", (event) => {
      if (!city || cityGroup.classList.contains("is-disabled")) {
        pointerTapState = null;
        return;
      }

      event.stopPropagation();

      pointerTapState = {
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        clientX: event.clientX,
        clientY: event.clientY,
      };
    });

    cityGroup.addEventListener("pointerup", (event) => {
      if (
        !city ||
        cityGroup.classList.contains("is-disabled") ||
        !pointerTapState ||
        pointerTapState.pointerId !== event.pointerId
      ) {
        return;
      }

      const delta = Math.hypot(
        event.clientX - pointerTapState.clientX,
        event.clientY - pointerTapState.clientY
      );
      const isTapLike = delta < DRAG_THRESHOLD_PX;
      const isTouchLike =
        pointerTapState.pointerType === "touch" || pointerTapState.pointerType === "pen";
      pointerTapState = null;

      if (!isTouchLike || !isTapLike || wasPointerGestureMoved(container)) {
        return;
      }
      if (shouldSuppressCitySelect(container)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      suppressCitySelect(container, TAP_SELECTION_SUPPRESS_MS);
      event.preventDefault();
      event.stopPropagation();
      onCitySelect(city);
    });

    cityGroup.addEventListener("pointercancel", (event) => {
      event.stopPropagation();
      pointerTapState = null;
    });

    cityGroup.addEventListener("click", (event) => {
      if (!city || cityGroup.classList.contains("is-disabled")) {
        return;
      }
      if (shouldSuppressCitySelect(container)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      onCitySelect(city);
    });

    cityGroup.addEventListener("keydown", (event) => {
      if (!city || cityGroup.classList.contains("is-disabled")) {
        return;
      }

      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      onCitySelect(city);
    });
  });
}

export function hasPeriodSvgMap(periodCode) {
  return Boolean(PERIOD_MAP_ASSETS[periodCode]);
}

export async function mountPeriodSvgMap(container, periodCode, onCitySelect) {
  const markup = await getPeriodSvgMarkup(periodCode);

  container.innerHTML = markup;
  container.classList.add("is-svg-mode");
  container.dataset.mapPeriodCode = periodCode;

  const svgElement = container.querySelector("svg");
  if (!svgElement) {
    throw new Error(`SVG-карта периода ${periodCode} не встроилась в страницу.`);
  }

  prepareSvg(svgElement, periodCode);
  attachPanZoom(container, svgElement);
  bindCityEvents(container, onCitySelect);

  return svgElement;
}

export function clearPeriodSvgMap(container) {
  container.innerHTML = "";
  container.classList.remove("is-svg-mode");
  delete container.dataset.mapPeriodCode;
  PAN_ZOOM_STATE.delete(container);
}

export function getInteractiveSvgCities(container) {
  return [...container.querySelectorAll(INTERACTIVE_CITY_SELECTOR)].map(
    (cityGroup) => cityGroup.dataset.city
  );
}

export function updatePeriodSvgMapLabels(container, language = "ru") {
  container.querySelectorAll(INTERACTIVE_CITY_SELECTOR).forEach((cityGroup) => {
    updateCityGroupLabel(cityGroup, language);
  });
}

export function updatePeriodSvgMapState(
  container,
  { activeCity = null, factSession = null, mapState = null } = {}
) {
  const cityStates = new Map((mapState?.cities || []).map((item) => [item.city, item]));
  const isCompact = isCompactMapViewport();

  container.querySelectorAll(INTERACTIVE_CITY_SELECTOR).forEach((cityGroup) => {
    const city = cityGroup.dataset.city;
    const cityState = cityStates.get(city);
    const isActive = city === activeCity;
    const isDisabled =
      !cityState ||
      (!cityState.has_content &&
        !cityState.quiz_available &&
        !cityState.fact_challenge_available);

    cityGroup.classList.toggle("is-active", isActive);
    cityGroup.classList.toggle("is-disabled", isDisabled);
    cityGroup.setAttribute("aria-pressed", isActive ? "true" : "false");
    applyCompactActiveCityStyles(cityGroup, isActive, isCompact);
  });
}
