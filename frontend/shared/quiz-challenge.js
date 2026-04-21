import { api } from "./api.js";
import { translateAchievement } from "./achievements-i18n.js";
import { getCityImage, getPeriodBadgeText } from "./city-visuals.js";
import { getCurrentLanguage, mountLanguageMenu } from "./language.js";
import {
  clearActiveQuizState,
  clearPendingQuizContext,
  getActiveQuizState,
  getOrCreatePlayerId,
  getPendingQuizContext,
  hasStoredAuthUser,
  reconcileStoredAuthUser,
  setActiveQuizState,
} from "./storage.js";
import {
  createElementFromHtml,
  escapeHtml,
  getErrorMessage,
  setHtml,
  setText,
  setVisible,
} from "./helpers.js";

const state = {
  playerId: null,
  bootstrap: null,
  period: null,
  cityContent: null,
  quiz: null,
  result: null,
  hintMessage: "",
};

const elements = {};

function queryRequired(selector) {
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }

  return element;
}

function getCurrentQuestion() {
  if (!state.quiz) {
    return null;
  }

  return state.quiz.questions[state.quiz.currentIndex] || null;
}

function getVisibleQuestion(question) {
  const language = getCurrentLanguage();
  const localized = question?.translations?.[language] || question?.translations?.ru;
  return {
    question: localized?.question || question?.question || "",
    options: localized?.options || question?.options || [],
  };
}

function getSelectedAnswerIndex() {
  setVisible(elements.submitButton, true);

  const question = getCurrentQuestion();
  if (!question || !state.quiz) {
    return null;
  }

  return state.quiz.answers[question.id] ?? null;
}

function showError(message) {
  setVisible(elements.errorState, true);
  setText(elements.errorMessage, message);
}

function hideError() {
  setVisible(elements.errorState, false);
  setText(elements.errorMessage, "");
}

function saveQuizState() {
  if (state.quiz) {
    setActiveQuizState(state.quiz);
  }
}

function renderHeader() {
  if (!state.quiz) {
    return;
  }

  const progressValue = state.result
    ? state.quiz.questions.length
    : state.quiz.currentIndex + 1;
  const progressPercent = Math.max(
    8,
    Math.round((progressValue / state.quiz.questions.length) * 100)
  );

  elements.progressBar.style.width = `${progressPercent}%`;
  setText(
    elements.progressCounter,
    `${progressValue} / ${state.quiz.questions.length}`
  );
  const achCount = state.bootstrap?.player_summary?.total_achievements_unlocked ?? 0;
  const achUnit = window.saparI18n?.t("label_achievements_short") || "достиж.";
  setText(elements.xpCounter, `${achCount} ${achUnit}`);
}

function renderSidebar() {
  const displayName = state.cityContent?.display_name || state.quiz?.city || "Город";
  const periodBadge = state.period ? getPeriodBadgeText(state.period) : "Период";
  const historySummary =
    state.cityContent?.history_summary ||
    "Историческая справка появится после загрузки контента.";
  const interestingFact =
    state.cityContent?.interesting_fact ||
    "Интересный факт появится после загрузки контента.";

  elements.sidebarImage.src = getCityImage(state.quiz?.city, state.quiz?.periodCode);
  elements.sidebarImage.alt = displayName;
  setText(elements.sidebarTag, periodBadge);
  setText(elements.sidebarTitle, displayName);
  setText(elements.sidebarBody, interestingFact);
  setText(elements.hintPrimaryLabel, window.saparI18n?.t("label_hist_hint") || "Историческая подсказка");
  setText(elements.hintSecondaryLabel, window.saparI18n?.t("label_city_importance") || "Почему город важен");
  setText(elements.hintMessage, state.hintMessage || historySummary);
}

function renderQuestion() {
  if (!state.quiz) {
    return;
  }

  if (state.result) {
    renderResult();
    return;
  }

  const question = getCurrentQuestion();
  if (!question) {
    return;
  }
  const visibleQuestion = getVisibleQuestion(question);

  setVisible(elements.questionSection, true);
  setVisible(elements.resultSection, false);
  setVisible(elements.prevButton, state.quiz.currentIndex > 0);
  setText(
    elements.questionTag,
    `${state.quiz.city} • ${state.period?.year_label || state.quiz.periodCode}`
  );
  setText(elements.questionTitle, visibleQuestion.question);
  const qHint = (window.saparI18n?.t("question_hint") || "Вопрос {current} из {total}. Выберите один ответ.")
    .replace("{current}", state.quiz.currentIndex + 1)
    .replace("{total}", state.quiz.questions.length);
  setText(elements.questionBody, qHint);

  const selectedIndex = getSelectedAnswerIndex();
  const letters = ["A", "B", "C", "D"];
  const fragment = document.createDocumentFragment();

  visibleQuestion.options.forEach((option, optionIndex) => {
    const selected = selectedIndex === optionIndex;
    const optionButton = createElementFromHtml(`
      <button type="button" class="group flex items-center gap-5 p-6 rounded-full bg-surface-container-lowest border-2 ${
        selected
          ? "border-primary-container pill-active-glow"
          : "border-transparent hover:border-primary-container"
      } transition-all text-left discovery-glow active:scale-95 duration-200">
        <div class="w-14 h-14 rounded-full ${
          selected
            ? "bg-primary-container text-on-primary-container"
            : "bg-surface-container-low text-primary group-hover:bg-primary-container"
        } flex items-center justify-center font-headline font-black text-xl transition-colors">
          ${letters[optionIndex]}
        </div>
        <div class="flex-1">
          <span class="block font-normal text-[15px] md:text-base leading-relaxed text-on-surface">${escapeHtml(
            option
          )}</span>
        </div>
        <span class="material-symbols-outlined ${
          selected ? "text-primary" : "text-outline-variant group-hover:text-primary"
        } transition-colors" style="font-variation-settings: 'FILL' ${
          selected ? 1 : 0
        };">${selected ? "check_circle" : "radio_button_unchecked"}</span>
      </button>
    `);

    optionButton.addEventListener("click", () => {
      state.quiz.answers[question.id] = optionIndex;
      saveQuizState();
      renderQuestion();
    });

    fragment.appendChild(optionButton);
  });

  elements.optionsGrid.replaceChildren(fragment);
  setText(
    elements.submitButton,
    state.quiz.currentIndex === state.quiz.questions.length - 1
      ? (window.saparI18n?.t("btn_finish") || "Завершить тест")
      : (window.saparI18n?.t("btn_next") || "Следующий вопрос")
  );
}

function renderResult() {
  if (!state.result) {
    return;
  }

  setVisible(elements.questionSection, false);
  setVisible(elements.resultSection, true);
  setVisible(elements.submitButton, false);
  setVisible(elements.prevButton, false);

  const statusKey = state.result.passed ? "label_test_passed_check" : "label_test_failed";
  setText(elements.resultBadge, window.saparI18n?.t(statusKey) || (state.result.passed ? "Тест пройден" : "Тест не пройден"));

  const titleKey = state.result.passed ? "result_success_title" : "result_fail_title";
  setText(elements.resultTitle, window.saparI18n?.t(titleKey) || (state.result.passed ? "Отлично, вы завершили исторический тест." : "Попробуйте ещё раз, чтобы улучшить результат."));

  const bodyText = (window.saparI18n?.t("result_body_text") || "Результат: {correct} из {total} ({percent}%).")
    .replace("{correct}", state.result.correct_answers)
    .replace("{total}", state.result.total_questions)
    .replace("{percent}", state.result.score_percent);
  setText(elements.resultBody, bodyText);

  const secondaryKey = state.result.passed ? "result_success_secondary_quiz" : "result_fail_secondary_quiz";
  setText(elements.resultSecondary, window.saparI18n?.t(secondaryKey) || (state.result.passed ? "Новые достижения уже сохранены." : "Прогресс попытки сохранён. Можно вернуться на карту и пройти тест заново."));

  if (state.result.unlocked_achievements.length === 0) {
    setHtml(
      elements.resultAchievements,
      `<p class="text-sm text-on-surface-variant">${window.saparI18n?.t("no_new_achievements") || "Новых достижений в этой попытке нет."}</p>`
    );
  } else {
    setHtml(
      elements.resultAchievements,
      state.result.unlocked_achievements
        .map(
          (achievement) => {
            const translatedAchievement = translateAchievement(achievement, getCurrentLanguage());
            const achievementName = translatedAchievement.name || achievement.name || achievement.code;
            return (
            `<span class="inline-flex bg-surface-container px-4 py-2 rounded-full text-sm font-semibold text-on-surface">${escapeHtml(
              achievementName
            )}</span>`
            );
          }
        )
        .join("")
    );
  }
}

function render() {
  renderHeader();
  renderSidebar();
  renderQuestion();
}

async function submitQuiz() {
  const payload = {
    player_id: state.playerId,
    test_session_id: state.quiz.testSessionId,
    answers: state.quiz.questions.map((question) => ({
      question_id: question.id,
      selected_index: state.quiz.answers[question.id],
    })),
  };

  const response = await api.submitTest(payload);
  state.result = response;
  clearActiveQuizState();
  clearPendingQuizContext();
  render();
}

async function handleContinue() {
  hideError();

  if (state.result) {
    window.location.href = "../map_hub/code.html";
    return;
  }

  const question = getCurrentQuestion();
  if (!question) {
    return;
  }

  if (state.quiz.answers[question.id] === undefined) {
    showError(window.saparI18n?.t("error_select_answer") || "Выберите вариант ответа перед продолжением.");
    return;
  }

  if (state.quiz.currentIndex === state.quiz.questions.length - 1) {
    elements.submitButton.disabled = true;
    try {
      await submitQuiz();
    } catch (error) {
      showError(getErrorMessage(error));
    } finally {
      elements.submitButton.disabled = false;
    }
    return;
  }

  state.quiz.currentIndex += 1;
  saveQuizState();
  render();
}

function handlePrev() {
  if (!state.quiz || state.quiz.currentIndex <= 0) return;
  state.quiz.currentIndex -= 1;
  saveQuizState();
  render();
}

async function restoreOrStartQuiz() {
  const currentLanguage = getCurrentLanguage();
  const storedQuiz = getActiveQuizState();
  const storedQuizHasTranslations = storedQuiz?.questions?.every(
    (question) => question.translations?.ru && question.translations?.en && question.translations?.kk
  );
  if (storedQuiz && storedQuizHasTranslations) {
    state.quiz = storedQuiz;
    return;
  }
  if (storedQuiz) {
    clearActiveQuizState();
  }

  const pendingContext = getPendingQuizContext();
  if (!pendingContext?.city || !pendingContext?.periodCode) {
    throw new Error("Нет активного теста. Вернитесь на карту и запустите новый.");
  }

  const response = await api.startTest({
    player_id: state.playerId,
    city: pendingContext.city,
    period_code: pendingContext.periodCode,
    language: currentLanguage,
    question_count: 5,
  });

  state.quiz = {
    city: response.city,
    periodCode: response.period_code,
    testSessionId: response.test_session_id,
    questions: response.questions,
    answers: {},
    currentIndex: 0,
  };
  saveQuizState();
}

async function loadSupportingData() {
  state.bootstrap = await api.getBootstrap(state.playerId);
  state.period =
    state.bootstrap.periods.find((period) => period.code === state.quiz.periodCode) ||
    null;

  try {
    const response = await api.getCityContent(state.quiz.periodCode, state.quiz.city);
    state.cityContent = response.content;
  } catch {
    state.cityContent = null;
  }
}

function bindEvents() {
  elements.closeButton.addEventListener("click", () => {
    window.location.href = "../map_hub/code.html";
  });
  elements.submitButton.addEventListener("click", handleContinue);
  elements.prevButton.addEventListener("click", handlePrev);
  elements.primaryHintButton.addEventListener("click", () => {
    state.hintMessage =
      state.cityContent?.history_summary ||
      "Историческая подсказка пока недоступна.";
    renderSidebar();
  });
  elements.secondaryHintButton.addEventListener("click", () => {
    state.hintMessage =
      state.cityContent?.importance_reason ||
      state.cityContent?.interesting_fact ||
      "Дополнительная подсказка пока недоступна.";
    renderSidebar();
  });
}

function cacheElements() {
  elements.closeButton = queryRequired("[data-close-quiz]");
  elements.progressBar = queryRequired("[data-progress-bar]");
  elements.progressCounter = queryRequired("[data-progress-counter]");
  elements.xpCounter = queryRequired("[data-xp-counter]");
  elements.questionSection = queryRequired("[data-question-section]");
  elements.questionTag = queryRequired("[data-question-tag]");
  elements.questionTitle = queryRequired("[data-question-title]");
  elements.questionBody = queryRequired("[data-question-body]");
  elements.optionsGrid = queryRequired("[data-options-grid]");
  elements.errorState = queryRequired("[data-error-state]");
  elements.errorMessage = queryRequired("[data-error-message]");
  elements.sidebarImage = queryRequired("[data-sidebar-image]");
  elements.sidebarTag = queryRequired("[data-sidebar-tag]");
  elements.sidebarTitle = queryRequired("[data-sidebar-title]");
  elements.sidebarBody = queryRequired("[data-sidebar-body]");
  elements.primaryHintButton = queryRequired("[data-primary-hint]");
  elements.secondaryHintButton = queryRequired("[data-secondary-hint]");
  elements.hintPrimaryLabel = queryRequired("[data-primary-hint-label]");
  elements.hintSecondaryLabel = queryRequired("[data-secondary-hint-label]");
  elements.hintMessage = queryRequired("[data-hint-message]");
  elements.submitButton = queryRequired("[data-submit-button]");
  elements.prevButton = queryRequired("[data-prev-button]");
  elements.resultSection = queryRequired("[data-result-section]");
  elements.resultBadge = queryRequired("[data-result-badge]");
  elements.resultTitle = queryRequired("[data-result-title]");
  elements.resultBody = queryRequired("[data-result-body]");
  elements.resultSecondary = queryRequired("[data-result-secondary]");
  elements.resultAchievements = queryRequired("[data-result-achievements]");
}

async function init() {
  mountLanguageMenu();
  if (!hasStoredAuthUser()) {
    window.location.href = "../registration/code.html";
    return;
  }

  cacheElements();
  bindEvents();
  await reconcileStoredAuthUser();
  state.playerId = getOrCreatePlayerId();
  hideError();

  window.addEventListener("sapar-language-change", () => {
    render();
  });

  await restoreOrStartQuiz();
  await loadSupportingData();
  render();
}

init().catch((error) => {
  showError(getErrorMessage(error));
  setText(elements.questionTitle, window.saparI18n?.t("error_test_unavailable") || "Тест пока недоступен");
  setText(
    elements.questionBody,
    window.saparI18n?.t("error_test_unavailable_hint_quiz") || "Вернитесь на карту, выберите город и попробуйте начать тест снова."
  );
  setHtml(elements.optionsGrid, "");
});
