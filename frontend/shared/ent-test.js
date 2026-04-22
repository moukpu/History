import { api } from "./api.js";
import { getCurrentLanguage, markLanguageReady, mountLanguageMenu } from "./language.js";
import {
  getOrCreatePlayerId,
  hasStoredAuthUser,
  reconcileStoredAuthUser,
} from "./storage.js";
import {
  createElementFromHtml,
  escapeHtml,
  setHtml,
  setText,
  setVisible,
} from "./helpers.js";

const STORAGE_KEY = "sapar-ent-test-state";
const ENT_QUESTION_COUNT = 20;
const ENT_DURATION_MS = 10 * 60 * 1000;

const translations = {
  ru: {
    page_title: "Sapar Quest - Подготовка к ЕНТ",
    header_subtitle: "Подготовка к ЕНТ",
    timer_label: "Осталось",
    start_modal_title: "ЕНТ-тест готов",
    start_modal_body:
      "Вас ждут 20 вопросов по истории Казахстана. На весь тест дается 10 минут. Когда время закончится, тест сдастся автоматически, а неотвеченные вопросы дадут 0 баллов.",
    start_button: "Окей, начать",
    timeout_modal_title: "Время вышло",
    timeout_modal_body:
      "10 минут закончились. Тест сдан автоматически, неотвеченные вопросы засчитаны как 0 баллов. Результат уже готов.",
    timeout_button: "Показать результат",
    load_error: "Ошибка загрузки.",
    loading_question_title: "Вопрос загружается...",
    loading_question_body: "Подождите немного, тест ЕНТ загружается.",
    btn_prev: "← Назад",
    btn_next_arrow: "Следующий вопрос →",
    btn_finish: "Завершить тест",
    result_badge_default: "Результат",
    result_finished_title: "Тест завершён",
    return_home: "Вернуться на главную",
    ent_badge: "ЕНТ",
    sidebar_title: "История Казахстана",
    sidebar_body:
      "Тестовые вопросы по истории Казахстана для подготовки к Единому Национальному Тестированию.",
    tips_title: "Советы для ЕНТ",
    tip_read: "Не торопитесь - внимательно читайте вопрос",
    tip_exclude: "Исключайте заведомо неверные варианты",
    question_hint: "Вопрос {current} из {total}. Выберите один правильный ответ.",
    label_test_passed_check: "Тест пройден ✓",
    label_test_failed: "Тест не пройден",
    result_success_title: "Отлично! Вы хорошо знаете историю Казахстана.",
    result_fail_title: "Стоит повторить материал и попробовать ещё раз.",
    result_body_text: "Результат: {correct} из {total} ({percent}%).",
    result_success_secondary:
      "Продолжайте готовиться - вы на верном пути к успешной сдаче ЕНТ!",
    result_fail_secondary: "Не расстраивайтесь, повторите материал и пройдите тест заново.",
    result_timeout_secondary:
      "Время вышло. Тест сдан автоматически, неотвеченные вопросы засчитаны как 0 баллов.",
    error_select_answer: "Выберите вариант ответа перед продолжением.",
    error_test_unavailable: "Тест ЕНТ пока недоступен",
    error_test_unavailable_hint: "Вернитесь на главную и попробуйте снова.",
    error_submit: "Не удалось отправить тест. Попробуйте ещё раз.",
  },
  en: {
    page_title: "Sapar Quest - UNT Preparation",
    header_subtitle: "UNT preparation",
    timer_label: "Time left",
    start_modal_title: "UNT test is ready",
    start_modal_body:
      "You will answer 20 questions on the history of Kazakhstan. You have 10 minutes for the whole test. When time runs out, the test will be submitted automatically, and unanswered questions will count as 0 points.",
    start_button: "OK, start",
    timeout_modal_title: "Time is up",
    timeout_modal_body:
      "The 10 minutes are over. The test was submitted automatically, unanswered questions counted as 0 points, and your result is ready.",
    timeout_button: "Show result",
    load_error: "Loading error.",
    loading_question_title: "Question is loading...",
    loading_question_body: "Please wait while the UNT test loads.",
    btn_prev: "← Back",
    btn_next_arrow: "Next question →",
    btn_finish: "Finish test",
    result_badge_default: "Result",
    result_finished_title: "Test completed",
    return_home: "Return to home",
    ent_badge: "UNT",
    sidebar_title: "History of Kazakhstan",
    sidebar_body:
      "History of Kazakhstan practice questions for preparation for the Unified National Testing exam.",
    tips_title: "UNT tips",
    tip_read: "Do not rush - read each question carefully",
    tip_exclude: "Eliminate clearly incorrect options",
    question_hint: "Question {current} of {total}. Choose one correct answer.",
    label_test_passed_check: "Test passed ✓",
    label_test_failed: "Test not passed",
    result_success_title: "Great work! You know the history of Kazakhstan well.",
    result_fail_title: "Review the material and try again.",
    result_body_text: "Result: {correct} of {total} ({percent}%).",
    result_success_secondary: "Keep practicing - you are on the right path for the UNT.",
    result_fail_secondary: "Review the topic and retake the test when you are ready.",
    result_timeout_secondary:
      "Time is up. The test was submitted automatically, and unanswered questions counted as 0 points.",
    error_select_answer: "Choose an answer before continuing.",
    error_test_unavailable: "The UNT test is not available yet",
    error_test_unavailable_hint: "Return to the home page and try again.",
    error_submit: "Could not submit the test. Try again.",
  },
  kk: {
    page_title: "Sapar Quest - ҰБТ-ға дайындық",
    header_subtitle: "ҰБТ-ға дайындық",
    timer_label: "Қалған уақыт",
    start_modal_title: "ҰБТ тесті дайын",
    start_modal_body:
      "Сізді Қазақстан тарихы бойынша 20 сұрақ күтеді. Бүкіл тестке 10 минут беріледі. Уақыт аяқталса, тест автоматты түрде тапсырылады, ал жауапсыз сұрақтар 0 балл болып есептеледі.",
    start_button: "Жақсы, бастау",
    timeout_modal_title: "Уақыт аяқталды",
    timeout_modal_body:
      "10 минут аяқталды. Тест автоматты түрде тапсырылды, жауапсыз сұрақтар 0 балл болып есептелді. Нәтиже дайын.",
    timeout_button: "Нәтижені көрсету",
    load_error: "Жүктеу қатесі.",
    loading_question_title: "Сұрақ жүктелуде...",
    loading_question_body: "ҰБТ тесті жүктелгенше сәл күтіңіз.",
    btn_prev: "← Артқа",
    btn_next_arrow: "Келесі сұрақ →",
    btn_finish: "Тестті аяқтау",
    result_badge_default: "Нәтиже",
    result_finished_title: "Тест аяқталды",
    return_home: "Басты бетке оралу",
    ent_badge: "ҰБТ",
    sidebar_title: "Қазақстан тарихы",
    sidebar_body:
      "Ұлттық бірыңғай тестілеуге дайындалуға арналған Қазақстан тарихы сұрақтары.",
    tips_title: "ҰБТ кеңестері",
    tip_read: "Асықпаңыз - сұрақты мұқият оқыңыз",
    tip_exclude: "Анық қате жауаптарды алып тастаңыз",
    question_hint: "{total} сұрақтың {current}-сұрағы. Бір дұрыс жауапты таңдаңыз.",
    label_test_passed_check: "Тест өтті ✓",
    label_test_failed: "Тест өтпеді",
    result_success_title: "Жақсы нәтиже! Сіз Қазақстан тарихын жақсы білесіз.",
    result_fail_title: "Материалды қайталап, тағы бір рет байқап көріңіз.",
    result_body_text: "Нәтиже: {correct}/{total} ({percent}%).",
    result_success_secondary: "Дайындықты жалғастырыңыз - ҰБТ-ға дұрыс бағыттасыз.",
    result_fail_secondary: "Тақырыпты қайталап, дайын болғанда тестті қайта тапсырыңыз.",
    result_timeout_secondary:
      "Уақыт аяқталды. Тест автоматты түрде тапсырылды, жауапсыз сұрақтар 0 балл болып есептелді.",
    error_select_answer: "Жалғастыру үшін жауап нұсқасын таңдаңыз.",
    error_test_unavailable: "ҰБТ тесті әзірге қолжетімді емес",
    error_test_unavailable_hint: "Басты бетке оралып, қайта байқап көріңіз.",
    error_submit: "Тестті жіберу мүмкін болмады. Қайта байқап көріңіз.",
  },
};

const state = {
  playerId: null,
  quiz: null,
  result: null,
  resultTimedOut: false,
  timerId: null,
  submitting: false,
  pendingStartedAt: null,
  pendingExpiresAt: null,
  loadFailed: false,
  timeoutModalShown: false,
};

const elements = {};

function translate(key, params = {}) {
  const language = getCurrentLanguage();
  const value = translations[language]?.[key] ?? translations.ru[key] ?? key;
  return typeof value === "function" ? value(params) : value;
}

function applyTranslations() {
  document.documentElement.lang = getCurrentLanguage();
  document.title = translate("page_title");

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    if (element.closest("footer")) return;
    setText(element, translate(element.dataset.i18n));
  });

  markLanguageReady();
}

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

function getVisibleQuestion(question) {
  const language = getCurrentLanguage();
  const localized = question?.translations?.[language] || question?.translations?.ru;
  return {
    question: localized?.question || question?.question || "",
    options: localized?.options || question?.options || [],
  };
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

function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}

function isTimerStarted() {
  return Boolean(
    (state.quiz?.startedAt && state.quiz?.expiresAt) || state.pendingExpiresAt
  );
}

function getRemainingMs() {
  if (state.result) {
    return 0;
  }

  const expiresAt = Number(state.quiz?.expiresAt || state.pendingExpiresAt || 0);
  return expiresAt ? Math.max(0, expiresAt - Date.now()) : 0;
}

function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function setStartModalVisible(visible) {
  if (!elements.startModal) {
    return;
  }

  elements.startModal.classList.toggle("hidden", !visible);
  elements.startModal.classList.toggle("flex", visible);
  elements.questionSection?.classList.toggle("pointer-events-none", visible);

  if (visible) {
    elements.startConfirmButton?.focus();
  }
}

function setTimeoutModalVisible(visible) {
  if (!elements.timeoutModal) {
    return;
  }

  elements.timeoutModal.classList.toggle("hidden", !visible);
  elements.timeoutModal.classList.toggle("flex", visible);

  if (visible) {
    elements.timeoutConfirmButton?.focus();
  }
}

function stopTimer() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

function syncTimerDisplay() {
  if (state.result) {
    elements.scoreCounters.forEach((counter) => setText(counter, "0:00"));
    return;
  }

  const remainingMs = isTimerStarted() ? getRemainingMs() : ENT_DURATION_MS;
  elements.scoreCounters.forEach((counter) => setText(counter, formatTime(remainingMs)));
}

function startCountdown() {
  stopTimer();
  syncTimerDisplay();

  state.timerId = window.setInterval(() => {
    syncTimerDisplay();
    if (state.quiz && isTimerStarted() && getRemainingMs() <= 0) {
      stopTimer();
      submitQuiz({ allowIncomplete: true, timedOut: true }).catch((error) => {
        console.error(error);
        showError(translate("error_submit"));
      });
    }
  }, 250);
}

function beginTimedTest() {
  if (state.loadFailed) {
    setStartModalVisible(false);
    return;
  }

  if (!state.quiz) {
    const now = Date.now();
    state.pendingStartedAt = now;
    state.pendingExpiresAt = now + ENT_DURATION_MS;
    setStartModalVisible(false);
    setVisible(elements.submitButton, false);
    setVisible(elements.prevButton, false);
    startCountdown();
    return;
  }

  if (isTimerStarted()) {
    state.quiz.awaitingStart = false;
    saveState();
    setStartModalVisible(false);
    startCountdown();
    render();
    return;
  }

  const now = Date.now();
  state.quiz.startedAt = now;
  state.quiz.expiresAt = now + ENT_DURATION_MS;
  state.quiz.awaitingStart = false;
  saveState();
  setStartModalVisible(false);
  startCountdown();
  render();
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

  syncTimerDisplay();
}

function renderQuestion() {
  if (!state.quiz) return;

  if (state.result) {
    renderResult();
    return;
  }

  const question = getCurrentQuestion();
  if (!question) return;
  const visibleQuestion = getVisibleQuestion(question);

  setVisible(elements.questionSection, true);
  setVisible(elements.resultSection, false);
  setVisible(elements.submitButton, isTimerStarted());
  setVisible(elements.prevButton, isTimerStarted() && state.quiz.currentIndex > 0);

  setText(elements.questionTitle, visibleQuestion.question);
  
  const qHint = translate("question_hint")
    .replace("{current}", state.quiz.currentIndex + 1)
    .replace("{total}", state.quiz.questions.length);
  setText(elements.questionBody, qHint);

  const selectedIndex = getSelectedAnswerIndex();
  const letters = ["A", "B", "C", "D"];
  const fragment = document.createDocumentFragment();

  visibleQuestion.options.forEach((option, optionIndex) => {
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
      if (!isTimerStarted()) {
        setStartModalVisible(true);
        return;
      }

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
      ? translate("btn_finish")
      : translate("btn_next_arrow")
  );
}

function renderResult() {
  if (!state.result) return;

  stopTimer();
  setVisible(elements.questionSection, false);
  setVisible(elements.resultSection, true);
  setVisible(elements.submitButton, false);
  setVisible(elements.prevButton, false);

  const percent = state.result.score_percent;
  const passed = percent >= 50;

  const statusKey = passed ? "label_test_passed_check" : "label_test_failed";
  setText(elements.resultBadge, translate(statusKey));

  const titleKey = passed ? "result_success_title" : "result_fail_title";
  setText(elements.resultTitle, translate(titleKey));

  const bodyText = translate("result_body_text")
    .replace("{correct}", state.result.correct_answers)
    .replace("{total}", state.result.total_questions)
    .replace("{percent}", percent);
  setText(elements.resultBody, bodyText);

  const secondaryKey = passed ? "result_success_secondary" : "result_fail_secondary";
  setText(
    elements.resultSecondary,
    state.resultTimedOut
      ? translate("result_timeout_secondary")
      : translate(secondaryKey)
  );
}

function render() {
  applyTranslations();
  renderHeader();
  renderQuestion();
}

async function submitQuiz({ allowIncomplete = false, timedOut = false } = {}) {
  if (state.submitting || !state.quiz) {
    return;
  }

  state.submitting = true;
  stopTimer();
  hideError();

  const answers = state.quiz.questions
    .filter((question) => state.quiz.answers[question.id] !== undefined)
    .map((question) => ({
      question_id: question.id,
      selected_index: state.quiz.answers[question.id],
    }));

  if (!allowIncomplete && answers.length !== state.quiz.questions.length) {
    state.submitting = false;
    startCountdown();
    return;
  }

  const payload = {
    player_id: state.playerId,
    test_session_id: state.quiz.testSessionId,
    answers,
  };

  try {
    const response = await api.submitTest(payload);
    state.result = response;
    state.resultTimedOut = timedOut;
    clearState();
    render();
    if (timedOut && !state.timeoutModalShown) {
      state.timeoutModalShown = true;
      setTimeoutModalVisible(true);
    }
  } finally {
    state.submitting = false;
  }
}

async function handleContinue() {
  hideError();

  if (state.result) {
    window.location.href = "../home_page/code.html";
    return;
  }

  if (!isTimerStarted()) {
    return;
  }

  const question = getCurrentQuestion();
  if (!question) return;

  if (state.quiz.answers[question.id] === undefined) {
    showError(translate("error_select_answer"));
    return;
  }

  if (state.quiz.currentIndex === state.quiz.questions.length - 1) {
    elements.submitButton.disabled = true;
    try {
      await submitQuiz();
    } catch (error) {
      console.error(error);
      showError(translate("error_submit"));
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
  // ENT must always start from its own intro modal. Old localStorage sessions
  // made the page skip the modal and left a stale 10:00 timer on screen.
  clearState();

  const response = await api.startTest({
    player_id: state.playerId,
    city: "ENT_MODE",
    period_code: "ENT",
    question_count: ENT_QUESTION_COUNT,
  });

  state.quiz = {
    isEntTest: true,
    testSessionId: response.test_session_id,
    questions: response.questions,
    answers: {},
    currentIndex: 0,
    startedAt: state.pendingStartedAt,
    expiresAt: state.pendingExpiresAt,
    awaitingStart: !state.pendingStartedAt,
  };
  saveState();
}

function bindEvents() {
  elements.closeButton.addEventListener("click", () => {
    window.location.href = "../home_page/code.html";
  });
  elements.submitButton.addEventListener("click", handleContinue);
  elements.prevButton.addEventListener("click", handlePrev);
  elements.startConfirmButton.addEventListener("click", beginTimedTest);
  elements.timeoutConfirmButton.addEventListener("click", () => {
    setTimeoutModalVisible(false);
  });
}

function cacheElements() {
  elements.closeButton = queryRequired("[data-close-quiz]");
  elements.progressBar = queryRequired("[data-progress-bar]");
  elements.progressCounter = queryRequired("[data-progress-counter]");
  elements.scoreCounters = Array.from(document.querySelectorAll("[data-score-counter]"));
  if (elements.scoreCounters.length === 0) {
    throw new Error("Missing required element: [data-score-counter]");
  }
  elements.startModal = queryRequired("[data-ent-start-modal]");
  elements.startConfirmButton = queryRequired("[data-ent-start-confirm]");
  elements.timeoutModal = queryRequired("[data-ent-timeout-modal]");
  elements.timeoutConfirmButton = queryRequired("[data-ent-timeout-confirm]");
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
  mountLanguageMenu({
    onChange: () => {
      applyTranslations();
      if (state.quiz) render();
    },
  });
  if (!hasStoredAuthUser()) {
    console.warn("ENT Test: No auth user, redirecting...");
    window.location.href = "../registration/code.html";
    return;
  }

  cacheElements();
  bindEvents();
  applyTranslations();
  setStartModalVisible(true);
  setVisible(elements.submitButton, false);
  setVisible(elements.prevButton, false);
  syncTimerDisplay();

  await reconcileStoredAuthUser();
  state.playerId = getOrCreatePlayerId();
  hideError();
  
  try {
    await startEntTest();
    render();
    if (state.pendingStartedAt || isTimerStarted()) {
      setStartModalVisible(false);
      startCountdown();
    } else if (state.quiz?.awaitingStart || !isTimerStarted()) {
      setStartModalVisible(true);
      syncTimerDisplay();
    } else {
      setStartModalVisible(false);
      startCountdown();
    }
  } catch (error) {
    console.error("ENT Test: Failed to load questions", error);
    state.loadFailed = true;
    state.pendingStartedAt = null;
    state.pendingExpiresAt = null;
    stopTimer();
    throw error;
  }
}

init().catch((error) => {
  console.error(error);
  applyTranslations();
  showError(translate("load_error"));
  setText(elements.questionTitle, translate("error_test_unavailable"));
  setText(elements.questionBody, translate("error_test_unavailable_hint"));
  elements.optionsGrid && setHtml(elements.optionsGrid, "");
});
