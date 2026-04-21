import { api } from "./api.js";
import { mountLanguageMenu } from "./language.js";
import {
  getCityImage,
  getCityVisual,
  getMarkerIcon,
  getPeriodBadgeText,
} from "./city-visuals.js";
import {
  clearPeriodSvgMap,
  getInteractiveSvgCities,
  hasPeriodSvgMap,
  mountPeriodSvgMap,
  updatePeriodSvgMapState,
} from "./period-svg-map.js";
import {
  clearActiveFactSession,
  clearActiveQuizState,
  getActiveFactSession,
  getLastCity,
  getOrCreatePlayerId,
  reconcileStoredAuthUser,
  setActiveFactSession,
  setLastCity,
  setLastPeriodCode,
  setPendingQuizContext,
} from "./storage.js";
import {
  createElementFromHtml,
  escapeHtml,
  formatPercent,
  getErrorMessage,
  setHtml,
  setText,
  setVisible,
} from "./helpers.js";

const state = {
  playerId: null,
  bootstrap: null,
  selectedPeriodCode: null,
  selectedCity: null,
  mapStateCache: {},
  cityContentCache: {},
  factSession: null,
  factResult: null,
};

const elements = {};

function queryRequired(selector) {
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }

  return element;
}

function getCurrentPeriod() {
  return (
    state.bootstrap?.periods?.find((period) => period.code === state.selectedPeriodCode) ||
    null
  );
}

function getCurrentMapState() {
  return state.selectedPeriodCode ? state.mapStateCache[state.selectedPeriodCode] || null : null;
}

function getCurrentCityState() {
  const mapState = getCurrentMapState();
  if (!mapState || !state.selectedCity) {
    return null;
  }

  return mapState.cities.find((city) => city.city === state.selectedCity) || null;
}

function getVisibleSvgCitySet() {
  return new Set(getInteractiveSvgCities(elements.mapBackdrop));
}

function getCityContent(city) {
  if (!city || !state.selectedPeriodCode) {
    return null;
  }

  return state.cityContentCache[`${state.selectedPeriodCode}::${city}`] || null;
}

function getFactSessionForCurrentPeriod() {
  if (!state.factSession || state.factSession.period_code !== state.selectedPeriodCode) {
    return null;
  }

  return state.factSession;
}

function renderBootstrapSummary() {
  const summary = state.bootstrap?.player_summary;
  const mapSummary = getCurrentMapState()?.summary;
  const currentPeriod = getCurrentPeriod();
  const passedTests =
    mapSummary?.cities_passed ??
    currentPeriod?.passed_cities ??
    summary?.total_passed_tests ??
    0;
  const totalTests =
    mapSummary?.total_cities ??
    currentPeriod?.total_cities ??
    state.bootstrap?.available_cities_for_default_period?.length ??
    0;

  setText(
    elements.playerSummaryTests,
    `${passedTests} / ${totalTests}`
  );
  setText(
    elements.playerSummaryAchievements,
    String(summary?.total_achievements_unlocked ?? 0)
  );

  const preview = state.bootstrap?.achievements_preview ?? [];
  if (preview.length === 0) {
    setHtml(
      elements.achievementPreview,
      '<p class="text-xs text-on-surface-variant">Достижения появятся после первых успешных действий на карте.</p>'
    );
    return;
  }

  setHtml(
    elements.achievementPreview,
    preview
      .slice(0, 2)
      .map(
        (achievement) =>
          `<span class="bg-surface-container text-on-surface-variant px-2.5 py-1 rounded-full text-[10px] font-semibold">${escapeHtml(
            achievement.name
          )}</span>`
      )
      .join("")
  );
}

function renderTimeline() {
  const periods = (state.bootstrap?.periods || []).slice().sort((a, b) => a.sort_order - b.sort_order);
  const activeIndex = periods.findIndex((period) => period.code === state.selectedPeriodCode);

  if (periods.length === 0) {
    setHtml(elements.timelinePoints, "");
    return;
  }

  const fillPercent =
    periods.length === 1 ? 100 : Math.max(0, (activeIndex / (periods.length - 1)) * 100);
  elements.timelineFill.style.width = `${fillPercent}%`;
  setText(
    elements.activeEraLabel,
    `Активный период: ${getCurrentPeriod()?.title ?? "Не выбран"}`
  );

  const fragment = document.createDocumentFragment();

  periods.forEach((period, index) => {
    const active = period.code === state.selectedPeriodCode;
    const locked = !period.is_unlocked;
    const tooltipPositionClass =
      index === 0
        ? "left-0"
        : index === 1
          ? "left-1/2 -translate-x-[18%]"
          : index === periods.length - 1
            ? "right-0"
            : index === periods.length - 2
              ? "left-1/2 -translate-x-[82%]"
              : "left-1/2 -translate-x-1/2";
    const button = createElementFromHtml(`
      <button type="button" class="relative group ${
        locked ? "cursor-not-allowed" : "cursor-pointer"
      } z-10 flex flex-col items-center bg-transparent" aria-disabled="${locked ? "true" : "false"}">
        <div class="${
          active
            ? "w-7 h-7 bg-secondary-container rounded-full ring-[3px] ring-white shadow-md scale-110 z-10 flex items-center justify-center"
            : locked
              ? "w-[18px] h-[18px] bg-outline/80 rounded-full ring-[3px] ring-white shadow-md flex items-center justify-center"
              : "w-[18px] h-[18px] bg-primary rounded-full ring-[3px] ring-white shadow-md hover:scale-110 transition-transform"
        }">
          ${
            active
              ? '<span class="material-symbols-outlined text-secondary text-xs fill-icon">stars</span>'
              : locked
                ? '<span class="material-symbols-outlined text-white text-[11px] fill-icon">lock</span>'
              : ""
          }
        </div>
        ${
          active
            ? ""
            : `<div class="pointer-events-none absolute bottom-full mb-3 ${tooltipPositionClass} z-30 w-[12rem] opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 bg-white text-on-surface text-[11px] px-3.5 py-3 rounded-xl whitespace-normal text-center shadow-[0_18px_40px_rgba(46,47,45,0.18)] border border-outline-variant/20">
                <div class="font-bold leading-tight text-[11px]">${escapeHtml(period.title)}</div>
                ${
                  locked
                    ? '<div class="mt-2 text-[10px] leading-relaxed text-on-surface-variant font-medium">Недоступно до прохождения предыдущего периода</div>'
                    : ""
                }
              </div>`
        }
        <div class="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[9px] font-bold ${
          active ? "text-secondary" : locked ? "text-outline/80" : "text-outline"
        } uppercase tracking-wider">${escapeHtml(period.year_label)}</div>
      </button>
    `);

    button.addEventListener("click", () => {
      if (period.code === state.selectedPeriodCode) {
        return;
      }
      if (locked) {
        setStatusMessage(
          "Этот период откроется после прохождения всех городских тестов предыдущего периода.",
          "warning"
        );
        return;
      }

      state.selectedPeriodCode = period.code;
      setLastPeriodCode(period.code);

      const restoredFactSession = getActiveFactSession();
      if (restoredFactSession?.period_code !== period.code) {
        clearActiveFactSession();
        state.factSession = null;
        state.factResult = null;
      }

      loadMapState(period.code).catch(showGlobalError);
    });

    fragment.appendChild(button);
  });

  elements.timelinePoints.replaceChildren(fragment);
}

function renderMapBackground() {
  elements.mapBackdrop.style.backgroundImage = "none";
  elements.mapBackdrop.style.opacity = "1";
}

async function syncMapSurface(periodCode) {
  if (hasPeriodSvgMap(periodCode)) {
    await mountPeriodSvgMap(elements.mapBackdrop, periodCode, (city) => {
      handleCityInteraction(city).catch(showGlobalError);
    });
    setVisible(elements.markerLayer, false);
    return;
  }

  clearPeriodSvgMap(elements.mapBackdrop);
  setVisible(elements.markerLayer, true);
}

async function handleCityInteraction(city) {
  const factSession = getFactSessionForCurrentPeriod();

  if (factSession) {
    if (!factSession.candidate_cities.includes(city)) {
      setStatusMessage(
        "Для факт-вызова выберите один из подсвеченных городов.",
        "warning"
      );
      return;
    }

    await submitFactChallenge(city);
    return;
  }

  await selectCity(city);
}

function renderMarkers() {
  const mapState = getCurrentMapState();
  if (!mapState) {
    setHtml(elements.markerLayer, "");
    return;
  }

  const factSession = getFactSessionForCurrentPeriod();

  if (hasPeriodSvgMap(state.selectedPeriodCode)) {
    setHtml(elements.markerLayer, "");
    setVisible(elements.markerLayer, false);
    updatePeriodSvgMapState(elements.mapBackdrop, {
      activeCity: state.selectedCity,
      factSession,
      mapState,
    });
    return;
  }

  setVisible(elements.markerLayer, true);
  const activeCity = state.selectedCity;
  const fragment = document.createDocumentFragment();

  mapState.cities.forEach((cityState) => {
    const visual = getCityVisual(cityState.city);
    if (!visual) {
      return;
    }

    const isActive = activeCity === cityState.city;
    const isFactCandidate = Boolean(
      factSession?.candidate_cities?.includes(cityState.city)
    );
    const isDimmed = Boolean(
      factSession && factSession.candidate_cities && !isFactCandidate
    );
    const passed =
      cityState.passed_quiz_in_this_period ||
      cityState.has_fact_success_in_this_period ||
      cityState.unlocked_city_achievement;

    const marker = createElementFromHtml(`
      <div class="absolute z-10 ${isDimmed ? "opacity-35" : ""}" style="top:${visual.top}%; left:${visual.left}%;">
        <div class="relative">
          ${
            isActive || isFactCandidate
              ? '<div class="absolute -inset-2 bg-primary/20 rounded-full animate-ping"></div>'
              : ""
          }
          <button type="button" class="${
            isActive
              ? "bg-secondary-container text-on-secondary-container p-3 rounded-full shadow-lg border-[3px] border-white hover:scale-105 transition-transform"
              : passed
                ? "bg-tertiary-container text-on-tertiary-container p-2 rounded-full shadow-lg hover:scale-105 transition-transform"
                : "bg-primary text-on-primary p-2 rounded-full shadow-lg hover:scale-105 transition-transform active:scale-90"
          }">
            <span class="material-symbols-outlined text-[18px] ${
              isActive || passed || isFactCandidate ? "fill-icon" : ""
            }">${getMarkerIcon(cityState, factSession)}</span>
          </button>
          <div class="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 bg-surface-container-lowest px-2.5 py-1 rounded-full shadow-sm ${
            isActive ? "ring-2 ring-secondary" : ""
          }">
            <span class="text-[10px] font-bold ${
              isActive
                ? "text-secondary"
                : passed
                  ? "text-tertiary"
                  : "text-primary"
            }">${escapeHtml(cityState.display_name)}</span>
          </div>
        </div>
      </div>
    `);

    marker.querySelector("button").addEventListener("click", () => {
      handleCityInteraction(cityState.city).catch(showGlobalError);
      return;

      if (factSession) {
        if (!factSession.candidate_cities.includes(cityState.city)) {
          setStatusMessage(
            "Для факт-вызова выберите один из подсвеченных городов.",
            "warning"
          );
          return;
        }

        submitFactChallenge(cityState.city).catch(showGlobalError);
        return;
      }

      selectCity(cityState.city).catch(showGlobalError);
    });

    fragment.appendChild(marker);
  });

  elements.markerLayer.replaceChildren(fragment);
}

function renderPanel() {
  const cityState = getCurrentCityState();
  const period = getCurrentPeriod();
  const content = getCityContent(state.selectedCity);

  if (!cityState) {
    setText(elements.cityName, "Выберите город");
    setText(elements.citySubtitle, "На карте появятся доступные города выбранного периода.");
    setText(elements.cityDescription, "Исторический контент загрузится после выбора города.");
    return;
  }

  const visual = getCityVisual(cityState.city);
  const displayName = content?.display_name || cityState.display_name;
  const subtitle =
    content?.subtitle ||
    cityState.subtitle ||
    "Исторический город выбранного периода.";
  const shortDescription =
    content?.short_description ||
    subtitle ||
    "Краткое описание пока недоступно.";
  const historySummary =
    content?.history_summary || "Историческая справка будет доступна после загрузки.";
  const interestingFact =
    content?.interesting_fact || "Интересный факт появится после загрузки контента.";
  const chips = [
    content?.old_name ? `Ранее: ${content.old_name}` : null,
    cityState.quiz_available ? "Тест доступен" : "Тест пока недоступен",
    cityState.fact_challenge_available ? "Факт-вызов доступен" : "Факт-вызов пока недоступен",
    cityState.unlocked_city_achievement ? "Достижение города открыто" : null,
  ].filter(Boolean);

  elements.cityImage.src = getCityImage(cityState.city, state.selectedPeriodCode);
  elements.cityImage.alt = displayName;
  setText(elements.cityEraBadge, getPeriodBadgeText(period));
  setText(elements.cityRole, visual?.role || "Город периода");
  setText(elements.cityName, displayName);
  setText(elements.citySubtitle, subtitle);
  setText(elements.cityDescription, shortDescription);

  setHtml(
    elements.cityChipRow,
    chips
      .map(
        (chip) =>
          `<span class="bg-surface-container text-on-surface-variant px-3 py-1.5 rounded-full text-xs font-semibold">${escapeHtml(
            chip
          )}</span>`
      )
      .join("")
  );

  setText(elements.cityMetricPrimary, `${cityState.best_score_in_this_period}%`);
  setText(elements.cityMetricPrimaryLabel, "Лучший результат");
  setText(elements.cityMetricSecondary, String(cityState.total_attempts_in_this_period));
  setText(elements.cityMetricSecondaryLabel, "Попыток в периоде");
  setText(elements.cityHistoryTitle, "Краткая история");
  setText(elements.cityHistoryText, historySummary);
  setText(elements.cityDidYouKnowTitle, "Интересный факт");
  setText(elements.cityDidYouKnowText, interestingFact);
  setText(
    elements.cityProgressLabel,
    cityState.passed_quiz_in_this_period ? "Тест по городу уже пройден" : "Тест по городу ещё не пройден"
  );
  setText(
    elements.cityProgressValue,
    formatPercent(cityState.passed_quiz_in_this_period ? 100 : cityState.best_score_in_this_period)
  );
  elements.cityProgressBar.style.width = `${Math.max(
    4,
    cityState.passed_quiz_in_this_period ? 100 : cityState.best_score_in_this_period
  )}%`;

  elements.startQuizButton.disabled = !cityState.quiz_available;
  elements.startQuizButton.classList.toggle("opacity-50", !cityState.quiz_available);
  elements.startFactButton.disabled = !cityState.fact_challenge_available;
  elements.startFactButton.classList.toggle(
    "opacity-50",
    !cityState.fact_challenge_available
  );
}

function renderFactState() {
  const factSession = getFactSessionForCurrentPeriod();
  const cityState = getCurrentCityState();

  if (factSession) {
    setVisible(elements.factCancelButton, true);
    setText(elements.factTitle, "Факт-вызов периода");
    setText(elements.factText, factSession.fact_text);
    setText(
      elements.factHelper,
      "Нажмите на один из подсвеченных городов на карте, чтобы отправить ответ."
    );
    elements.startFactButton.textContent = "Факт-вызов активен";
    elements.startFactButton.disabled = true;
    return;
  }

  setVisible(elements.factCancelButton, false);
  elements.startFactButton.disabled = !cityState?.fact_challenge_available;

  if (state.factResult) {
    setText(
      elements.factTitle,
      state.factResult.is_correct ? "Ответ принят" : "Ответ проверен"
    );
    setText(
      elements.factText,
      state.factResult.is_correct
        ? `Верно! Правильный город: ${state.factResult.correct_city}.`
        : `Пока нет. Правильный город: ${state.factResult.correct_city}.`
    );
    setText(elements.factHelper, state.factResult.fact_text);
    elements.startFactButton.textContent = "Начать новый факт-вызов";
    return;
  }

  setText(elements.factTitle, "Факт-вызов");
  setText(
    elements.factText,
    "Получите короткий исторический факт и угадайте нужный город прямо на карте."
  );
  setText(
    elements.factHelper,
    cityState?.fact_challenge_available
      ? "Факт-вызов использует выбранный период и сохраняет результат в backend."
      : "Для этого города в выбранном периоде факт-вызов пока недоступен."
  );
  elements.startFactButton.textContent = "Начать факт-вызов";
}

function setStatusMessage(message, kind = "info") {
  setVisible(elements.statusMessage, true);
  setText(elements.statusMessage, message);
  elements.statusMessage.className =
    "mt-4 rounded-xl px-4 py-3 text-sm " +
    (kind === "warning"
      ? "bg-secondary-container/25 text-on-secondary-container border border-secondary/15"
      : "bg-primary-container/20 text-on-primary-container border border-primary/10");
}

function clearStatusMessage() {
  setVisible(elements.statusMessage, false);
  setText(elements.statusMessage, "");
}

function render() {
  renderBootstrapSummary();
  renderTimeline();
  renderMapBackground();
  renderMarkers();
  renderPanel();
}

async function loadCityContent(city) {
  const cacheKey = `${state.selectedPeriodCode}::${city}`;
  if (cacheKey in state.cityContentCache) {
    return state.cityContentCache[cacheKey];
  }

  try {
    const response = await api.getCityContent(state.selectedPeriodCode, city);
    state.cityContentCache[cacheKey] = response.content;
    return response.content;
  } catch (error) {
    if (error?.status === 404) {
      state.cityContentCache[cacheKey] = null;
      return null;
    }

    throw error;
  }
}

async function selectCity(city) {
  state.selectedCity = city;
  setLastCity(city);
  clearStatusMessage();
  await loadCityContent(city);
  render();
}

async function loadMapState(periodCode) {
  clearStatusMessage();
  setVisible(elements.loadingState, true);
  setVisible(elements.errorState, false);

  try {
    const mapState = await api.getMapState(state.playerId, periodCode);
    state.mapStateCache[periodCode] = mapState;
    await syncMapSurface(periodCode);

    const lastCity = getLastCity();
    const visibleSvgCities = getVisibleSvgCitySet();
    const prefersVisibleSvg = visibleSvgCities.size > 0;
    const matchesVisibleSvg = (city) =>
      !prefersVisibleSvg || visibleSvgCities.has(city.city);
    const isActionable = (city) =>
      city.has_content || city.quiz_available || city.fact_challenge_available;
    const availableCity =
      mapState.cities.find(
        (city) => city.city === state.selectedCity && matchesVisibleSvg(city)
      ) ||
      mapState.cities.find(
        (city) => city.city === lastCity && matchesVisibleSvg(city)
      ) ||
      mapState.cities.find(
        (city) => matchesVisibleSvg(city) && isActionable(city)
      ) ||
      mapState.cities.find((city) => isActionable(city)) ||
      mapState.cities.find((city) => matchesVisibleSvg(city)) ||
      mapState.cities[0] ||
      null;

    state.selectedCity = availableCity ? availableCity.city : null;

    state.factSession = null;
    state.factResult = null;
    clearActiveFactSession();

    if (state.selectedCity) {
      await loadCityContent(state.selectedCity);
      setLastCity(state.selectedCity);
    }

    render();
  } finally {
    setVisible(elements.loadingState, false);
  }
}

async function loadBootstrap() {
  state.bootstrap = await api.getBootstrap(state.playerId);

  const periods = state.bootstrap.periods || [];
  const unlockedPeriods = periods
    .filter((period) => period.is_unlocked)
    .sort((a, b) => a.sort_order - b.sort_order);
  const defaultPeriodCode =
    periods.find(
      (period) =>
        period.code === state.bootstrap.default_period_code && period.is_unlocked
    )?.code ||
    unlockedPeriods.at(-1)?.code ||
    periods[0]?.code;
  state.selectedPeriodCode = defaultPeriodCode;
  setLastPeriodCode(state.selectedPeriodCode);

  renderBootstrapSummary();
  await loadMapState(state.selectedPeriodCode);
}

async function startFactChallenge() {
  if (!localStorage.getItem("sapar-user")) {
    window.location.href = "../registration/code.html";
    return;
  }

  const cityState = getCurrentCityState();
  if (!cityState?.fact_challenge_available) {
    setStatusMessage(
      "Для этого города в выбранном периоде факт-вызов пока недоступен.",
      "warning"
    );
    return;
  }

  clearStatusMessage();
  state.factResult = null;
  setText(elements.startFactButton, "Загрузка...");
  elements.startFactButton.disabled = true;

  try {
    const response = await api.startFactChallenge({
      player_id: state.playerId,
      period_code: state.selectedPeriodCode,
      candidate_count: 4,
    });

    state.factSession = response;
    setActiveFactSession(response);
    render();
  } catch (error) {
    setStatusMessage(getErrorMessage(error), "warning");
  }
}

async function submitFactChallenge(selectedCity) {
  const factSession = getFactSessionForCurrentPeriod();
  if (!factSession) {
    return;
  }

  clearStatusMessage();

  try {
    const response = await api.submitFactChallenge({
      player_id: state.playerId,
      session_id: factSession.session_id,
      selected_city: selectedCity,
    });

    state.factSession = null;
    clearActiveFactSession();
    state.factResult = response;
    await loadBootstrap();
    state.selectedCity = response.correct_city;
    setLastCity(response.correct_city);
    await loadCityContent(response.correct_city);
    render();
  } catch (error) {
    setStatusMessage(getErrorMessage(error), "warning");
  }
}

function openQuizChallenge() {
  if (!localStorage.getItem("sapar-user")) {
    window.location.href = "../registration/code.html";
    return;
  }

  const cityState = getCurrentCityState();
  if (!cityState?.quiz_available) {
    setStatusMessage(
      "Для этого города в выбранном периоде тест пока недоступен.",
      "warning"
    );
    return;
  }

  clearActiveQuizState();
  setPendingQuizContext({
    city: state.selectedCity,
    periodCode: state.selectedPeriodCode,
  });
  window.location.href = "../quiz_challenge/code.html";
}

function showGlobalError(error) {
  setVisible(elements.loadingState, false);
  setVisible(elements.errorState, true);
  setText(elements.errorMessage, getErrorMessage(error));
}

function bindEvents() {
  elements.startQuizButton.addEventListener("click", openQuizChallenge);
  elements.startFactButton.addEventListener("click", startFactChallenge);
  elements.factCancelButton.addEventListener("click", () => {
    state.factSession = null;
    state.factResult = null;
    clearActiveFactSession();
    clearStatusMessage();
    render();
  });
  elements.retryButton.addEventListener("click", () => {
    loadBootstrap().catch(showGlobalError);
  });
}

function cacheElements() {
  elements.mapBackdrop = queryRequired("[data-map-backdrop]");
  elements.markerLayer = queryRequired("[data-map-markers]");
  elements.timelinePoints = queryRequired("[data-timeline-points]");
  elements.timelineFill = queryRequired("[data-timeline-fill]");
  elements.activeEraLabel = queryRequired("[data-active-era-label]");
  elements.playerSummaryTests = queryRequired("[data-player-tests]");
  elements.playerSummaryAchievements = queryRequired("[data-player-achievements]");
  elements.achievementPreview = queryRequired("[data-achievement-preview]");
  elements.loadingState = queryRequired("[data-loading-state]");
  elements.errorState = queryRequired("[data-error-state]");
  elements.errorMessage = queryRequired("[data-error-message]");
  elements.retryButton = queryRequired("[data-retry-button]");
  elements.cityImage = queryRequired("[data-city-image]");
  elements.cityEraBadge = queryRequired("[data-city-era-badge]");
  elements.cityRole = queryRequired("[data-city-role]");
  elements.cityName = queryRequired("[data-city-name]");
  elements.citySubtitle = queryRequired("[data-city-subtitle]");
  elements.cityDescription = queryRequired("[data-city-description]");
  elements.cityChipRow = queryRequired("[data-city-chips]");
  elements.cityMetricPrimary = queryRequired("[data-city-metric-primary]");
  elements.cityMetricPrimaryLabel = queryRequired("[data-city-metric-primary-label]");
  elements.cityMetricSecondary = queryRequired("[data-city-metric-secondary]");
  elements.cityMetricSecondaryLabel = queryRequired("[data-city-metric-secondary-label]");
  elements.cityHistoryTitle = queryRequired("[data-city-history-title]");
  elements.cityHistoryText = queryRequired("[data-city-history-text]");
  elements.cityDidYouKnowTitle = queryRequired("[data-city-fact-title]");
  elements.cityDidYouKnowText = queryRequired("[data-city-fact-text]");
  elements.cityProgressLabel = queryRequired("[data-city-progress-label]");
  elements.cityProgressValue = queryRequired("[data-city-progress-value]");
  elements.cityProgressBar = queryRequired("[data-city-progress-bar]");
  elements.startQuizButton = queryRequired("[data-start-quiz-button]");
  elements.startFactButton = queryRequired("[data-start-fact-button]");
  elements.factTitle = queryRequired("[data-fact-title]");
  elements.factText = queryRequired("[data-fact-text]");
  elements.factHelper = queryRequired("[data-fact-helper]");
  elements.factCancelButton = queryRequired("[data-fact-cancel-button]");
  elements.statusMessage = queryRequired("[data-status-message]");
}

async function init() {
  mountLanguageMenu();
  cacheElements();
  bindEvents();
  clearActiveFactSession();
  state.factSession = null;
  state.factResult = null;
  await reconcileStoredAuthUser();
  state.playerId = getOrCreatePlayerId();
  await loadBootstrap();
}

init().catch(showGlobalError);
