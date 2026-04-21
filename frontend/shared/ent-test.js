import { api } from "./api.js";
import { mountLanguageMenu } from "./language.js";
import {
  getOrCreatePlayerId,
  hasStoredAuthUser,
  reconcileStoredAuthUser,
} from "./storage.js";
import {
  createElementFromHtml,
  escapeHtml,
  getErrorMessage,
  setHtml,
  setText,
  setVisible,
} from "./helpers.js";

const STORAGE_KEY = "sapar-ent-test-state";

const state = {
  playerId: null,
  quiz: null,
  result: null,
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
  if (!state.quiz) return null;
  return state.quiz.questions[state.quiz.currentIndex] || null;
}

function getSelectedAnswerIndex() {
  const question = getCurrentQuestion();
  if (!question || !state.quiz) return null;
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

function saveState() {
  if (state.quiz) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.quiz));
    } catch {}
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}

function renderHeader() {
  if (!state.quiz) return;

  const progressValue = state.result
    ? state.quiz.questions.length
    : state.quiz.currentIndex + 1;
  const progressPercent = Math.max(
    8,
    Math.round((progressValue / state.quiz.questions.length) * 100)
  );

  elements.progressBar.style.width = `${progressPercent}%`;
  setText(elements.progressCounter, `${progressValue} / ${state.quiz.questions.length}`);

  const answered = Object.keys(state.quiz.answers).length;
  const unit = window.saparI18n?.t("label_answers_short") || "отв.";
  setText(elements.scoreCounter, `${answered} ${unit}`);
}

function renderQuestion() {
  if (!state.quiz) return;

  if (state.result) {
    renderResult();
    return;
  }

  const question = getCurrentQuestion();
  if (!question) return;

  setVisible(elements.questionSection, true);
  setVisible(elements.resultSection, false);
  setVisible(elements.submitButton, true);

  setText(elements.questionTitle, question.question);
  
  const qHint = (window.saparI18n?.t("question_hint") || "Вопрос {current} из {total}. Выберите один правильный ответ.")
    .replace("{current}", state.quiz.currentIndex + 1)
    .replace("{total}", state.quiz.questions.length);
  setText(elements.questionBody, qHint);

  // Show/hide prev button
  setVisible(elements.prevButton, state.quiz.currentIndex > 0);

  const selectedIndex = getSelectedAnswerIndex();
  const letters = ["A", "B", "C", "D"];
  const fragment = document.createDocumentFragment();

  question.options.forEach((option, optionIndex) => {
    const selected = selectedIndex === optionIndex;
    const optionButton = createElementFromHtml(`
      <button type="button" class="group flex items-center gap-5 p-4 rounded-full bg-surface-container-lowest border-2 ${
        selected
          ? "border-secondary-container pill-active-glow"
          : "border-transparent hover:border-secondary-container"
      } transition-all text-left discovery-glow active:scale-95 duration-200">
        <div class="w-14 h-14 rounded-full ${
          selected
            ? "bg-secondary-container text-on-secondary-container"
            : "bg-surface-container-low text-secondary group-hover:bg-secondary-container"
        } flex items-center justify-center font-headline font-black text-xl transition-colors">
          ${letters[optionIndex]}
        </div>
        <div class="flex-1">
          <span class="block font-normal text-[15px] md:text-base leading-relaxed text-on-surface">${escapeHtml(option)}</span>
        </div>
        <span class="material-symbols-outlined ${
          selected ? "text-secondary" : "text-outline-variant group-hover:text-secondary"
        } transition-colors" style="font-variation-settings: 'FILL' ${
          selected ? 1 : 0
        };">${selected ? "check_circle" : "radio_button_unchecked"}</span>
      </button>
    `);

    optionButton.addEventListener("click", () => {
      state.quiz.answers[question.id] = optionIndex;
      saveState();
      renderQuestion();
    });

    fragment.appendChild(optionButton);
  });

  elements.optionsGrid.replaceChildren(fragment);
  setText(
    elements.submitButton,
    state.quiz.currentIndex === state.quiz.questions.length - 1
      ? (window.saparI18n?.t("btn_finish") || "Завершить тест")
      : (window.saparI18n?.t("btn_next_arrow") || "Следующий вопрос →")
  );
}

function renderResult() {
  if (!state.result) return;

  setVisible(elements.questionSection, false);
  setVisible(elements.resultSection, true);
  setVisible(elements.submitButton, false);
  setVisible(elements.prevButton, false);

  const percent = state.result.score_percent;
  const passed = percent >= 50;

  const statusKey = passed ? "label_test_passed_check" : "label_test_failed";
  setText(elements.resultBadge, window.saparI18n?.t(statusKey) || (passed ? "Тест пройден ✓" : "Тест не пройден"));

  const titleKey = passed ? "result_success_title" : "result_fail_title";
  setText(elements.resultTitle, window.saparI18n?.t(titleKey) || (passed ? "Отлично! Вы хорошо знаете историю Казахстана." : "Стоит повторить материал и попробовать ещё раз."));

  const bodyText = (window.saparI18n?.t("result_body_text") || "Результат: {correct} из {total} ({percent}%).")
    .replace("{correct}", state.result.correct_answers)
    .replace("{total}", state.result.total_questions)
    .replace("{percent}", percent);
  setText(elements.resultBody, bodyText);

  const secondaryKey = passed ? "result_success_secondary" : "result_fail_secondary";
  setText(elements.resultSecondary, window.saparI18n?.t(secondaryKey) || (passed ? "Продолжайте готовиться — вы на верном пути к успешной сдаче ЕНТ!" : "Не расстраивайтесь, повторите материал и пройдите тест заново."));
}

function render() {
  renderHeader();
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
  clearState();
  render();
}

async function handleContinue() {
  hideError();

  if (state.result) {
    window.location.href = "../home_page/code.html";
    return;
  }

  const question = getCurrentQuestion();
  if (!question) return;

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
  saveState();
  render();
}

function handlePrev() {
  if (!state.quiz || state.quiz.currentIndex <= 0) return;
  state.quiz.currentIndex -= 1;
  saveState();
  render();
}

async function startEntTest() {
  const urlParams = new URLSearchParams(window.location.search);
  const forceNew = urlParams.get("new") === "true";

  if (forceNew) {
    console.log("ENT Test: Force new test requested, clearing state.");
    clearState();
  } else {
    // Try to restore saved state
    const saved = loadState();
    if (saved && saved.isEntTest && saved.questions && saved.questions.length > 0) {
      console.log("ENT Test: Resuming saved session.");
      state.quiz = saved;
      return;
    }
  }
  
  // Clear potentially stale state
  clearState();

  // Start ENT test via the standard fast API
  const response = await api.startTest({
    player_id: state.playerId,
    city: "ENT_MODE",
    period_code: "ENT",
    question_count: 20,
  });

  state.quiz = {
    isEntTest: true,
    testSessionId: response.test_session_id,
    questions: response.questions,
    answers: {},
    currentIndex: 0,
  };
  saveState();
}

function bindEvents() {
  elements.closeButton.addEventListener("click", () => {
    window.location.href = "../home_page/code.html";
  });
  elements.submitButton.addEventListener("click", handleContinue);
  elements.prevButton.addEventListener("click", handlePrev);
}

function cacheElements() {
  elements.closeButton = queryRequired("[data-close-quiz]");
  elements.progressBar = queryRequired("[data-progress-bar]");
  elements.progressCounter = queryRequired("[data-progress-counter]");
  elements.scoreCounter = queryRequired("[data-score-counter]");
  elements.questionSection = queryRequired("[data-question-section]");
  elements.questionTitle = queryRequired("[data-question-title]");
  elements.questionBody = queryRequired("[data-question-body]");
  elements.optionsGrid = queryRequired("[data-options-grid]");
  elements.errorState = queryRequired("[data-error-state]");
  elements.errorMessage = queryRequired("[data-error-message]");
  elements.submitButton = queryRequired("[data-submit-button]");
  elements.prevButton = queryRequired("[data-prev-button]");
  elements.resultSection = queryRequired("[data-result-section]");
  elements.resultBadge = queryRequired("[data-result-badge]");
  elements.resultTitle = queryRequired("[data-result-title]");
  elements.resultBody = queryRequired("[data-result-body]");
  elements.resultSecondary = queryRequired("[data-result-secondary]");
  elements.resultDetails = queryRequired("[data-result-details]");
}

async function init() {
  console.log("ENT Test: Initializing...");
  mountLanguageMenu();
  if (!hasStoredAuthUser()) {
    console.warn("ENT Test: No auth user, redirecting...");
    window.location.href = "../registration/code.html";
    return;
  }

  cacheElements();
  bindEvents();
  await reconcileStoredAuthUser();
  state.playerId = getOrCreatePlayerId();
  hideError();
  
  console.log("ENT Test: Loading questions...");
  try {
    await startEntTest();
    console.log("ENT Test: Questions loaded successfully", state.quiz);
    render();
  } catch (error) {
    console.error("ENT Test: Failed to load questions", error);
    throw error;
  }
}

init().catch((error) => {
  showError(getErrorMessage(error));
  setText(elements.questionTitle, window.saparI18n?.t("error_test_unavailable") || "Тест ЕНТ пока недоступен");
  setText(
    elements.questionBody,
    window.saparI18n?.t("error_test_unavailable_hint") || "Вернитесь на главную и попробуйте снова."
  );
  setHtml(elements.optionsGrid, "");
});
