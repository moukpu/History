import { api } from "./api.js";
import { translateAchievement } from "./achievements-i18n.js";
import {
  getCityImage,
  getLocalizedCityDisplayName,
  getLocalizedCityName,
} from "./city-visuals.js";
import { getCurrentLanguage, markLanguageReady, mountLanguageMenu } from "./language.js";
import {
  clearActiveQuizState,
  clearPendingQuizContext,
  ensureStoredAuthOrRedirect,
  getActiveQuizState,
  getOrCreatePlayerId,
  getPendingQuizContext,
  hasStoredAuthUser,
  setActiveQuizState,
  startStoredAuthWatcher,
} from "./storage.js";
import {
  createElementFromHtml,
  escapeHtml,
  protectQuizContent,
  setHtml,
  setText,
  setVisible,
} from "./helpers.js";

const translations = {
  ru: {
    page_title: "Sapar Quest - Исторический тест",
    header_subtitle: "Исторический тест",
    label_achievements_short: "достиж.",
    load_error: "Ошибка загрузки.",
    loading: "Загрузка...",
    loading_question_title: "Вопрос загружается...",
    loading_question_body: "Подождите немного, тест загружается.",
    btn_prev: "← Назад",
    btn_next: "Следующий вопрос",
    btn_finish: "Завершить тест",
    result_badge_default: "Результат",
    result_finished_title: "Тест завершён",
    awards: "Награды",
    return_map: "Вернуться к карте",
    city_alt: "Город",
    historical_period: "Исторический период",
    period: "Период",
    city_default: "Город",
    sidebar_title_default: "История города",
    sidebar_body_default:
      "Вы открываете историю Казахстана через его великие города. Каждый вопрос приближает вас к пониманию наследия предков.",
    tips_title: "Советы",
    label_hist_hint: "Историческая подсказка",
    label_city_importance: "Значимость города",
    hint_message_default: "Подсказка появится здесь после выбора действия.",
    history_summary_fallback: "Историческая справка появится после загрузки контента.",
    interesting_fact_fallback: "Интересный факт появится после загрузки контента.",
    historical_hint_unavailable: "Историческая подсказка пока недоступна.",
    additional_hint_unavailable: "Дополнительная подсказка пока недоступна.",
    question_hint: "Вопрос {current} из {total}. Выберите один ответ.",
    label_test_passed_check: "Тест пройден ✓",
    label_test_failed: "Тест не пройден",
    result_success_title: "Отлично, вы завершили исторический тест.",
    result_fail_title: "Попробуйте ещё раз, чтобы улучшить результат.",
    result_body_text: "Результат: {correct} из {total} ({percent}%).",
    result_success_secondary_quiz: "Новые достижения уже сохранены.",
    result_fail_secondary_quiz:
      "Прогресс попытки сохранён. Можно вернуться на карту и пройти тест заново.",
    no_new_achievements: "Новых достижений в этой попытке нет.",
    finish_test_before_achievements: "Завершите тест, чтобы посмотреть достижения.",
    error_select_answer: "Выберите вариант ответа перед продолжением.",
    error_test_unavailable: "Тест пока недоступен",
    error_test_unavailable_hint_quiz:
      "Вернитесь на карту, выберите город и попробуйте начать тест снова.",
    error_submit: "Не удалось отправить тест. Попробуйте ещё раз.",
  },
  en: {
    page_title: "Sapar Quest - Historical Test",
    header_subtitle: "Historical test",
    label_achievements_short: "achiev.",
    load_error: "Loading error.",
    loading: "Loading...",
    loading_question_title: "Question is loading...",
    loading_question_body: "Please wait while the test loads.",
    btn_prev: "← Back",
    btn_next: "Next question",
    btn_finish: "Finish test",
    result_badge_default: "Result",
    result_finished_title: "Test completed",
    awards: "Awards",
    return_map: "Return to map",
    city_alt: "City",
    historical_period: "Historical period",
    period: "Period",
    city_default: "City",
    sidebar_title_default: "City history",
    sidebar_body_default:
      "You are exploring Kazakhstan's history through its great cities. Each question brings you closer to understanding this heritage.",
    tips_title: "Tips",
    label_hist_hint: "Historical hint",
    label_city_importance: "City importance",
    hint_message_default: "A hint will appear here after you choose an action.",
    history_summary_fallback: "Historical notes will appear after the content loads.",
    interesting_fact_fallback: "An interesting fact will appear after the content loads.",
    historical_hint_unavailable: "The historical hint is not available yet.",
    additional_hint_unavailable: "The additional hint is not available yet.",
    question_hint: "Question {current} of {total}. Choose one answer.",
    label_test_passed_check: "Test passed ✓",
    label_test_failed: "Test not passed",
    result_success_title: "Great work, you completed the historical test.",
    result_fail_title: "Try again to improve your result.",
    result_body_text: "Result: {correct} of {total} ({percent}%).",
    result_success_secondary_quiz: "New achievements have already been saved.",
    result_fail_secondary_quiz:
      "Your attempt progress was saved. You can return to the map and retake the test.",
    no_new_achievements: "No new achievements in this attempt.",
    finish_test_before_achievements: "Finish the test to view your achievements.",
    error_select_answer: "Choose an answer before continuing.",
    error_test_unavailable: "The test is not available yet",
    error_test_unavailable_hint_quiz:
      "Return to the map, choose a city, and try to start the test again.",
    error_submit: "Could not submit the test. Try again.",
  },
  kk: {
    page_title: "Sapar Quest - Тарихи тест",
    header_subtitle: "Тарихи тест",
    label_achievements_short: "жетіст.",
    load_error: "Жүктеу қатесі.",
    loading: "Жүктелуде...",
    loading_question_title: "Сұрақ жүктелуде...",
    loading_question_body: "Тест жүктелгенше сәл күтіңіз.",
    btn_prev: "← Артқа",
    btn_next: "Келесі сұрақ",
    btn_finish: "Тестті аяқтау",
    result_badge_default: "Нәтиже",
    result_finished_title: "Тест аяқталды",
    awards: "Марапаттар",
    return_map: "Картаға оралу",
    city_alt: "Қала",
    historical_period: "Тарихи кезең",
    period: "Кезең",
    city_default: "Қала",
    sidebar_title_default: "Қала тарихы",
    sidebar_body_default:
      "Сіз Қазақстан тарихын оның ұлы қалалары арқылы ашасыз. Әр сұрақ ата-баба мұрасын түсінуге жақындатады.",
    tips_title: "Кеңестер",
    label_hist_hint: "Тарихи кеңес",
    label_city_importance: "Қаланың маңызы",
    hint_message_default: "Әрекетті таңдағаннан кейін кеңес осы жерде пайда болады.",
    history_summary_fallback: "Тарихи анықтама ақпарат жүктелгеннен кейін пайда болады.",
    interesting_fact_fallback: "Қызықты факт ақпарат жүктелгеннен кейін пайда болады.",
    historical_hint_unavailable: "Тарихи кеңес әзірге қолжетімді емес.",
    additional_hint_unavailable: "Қосымша кеңес әзірге қолжетімді емес.",
    question_hint: "{total} сұрақтың {current}-сұрағы. Бір жауапты таңдаңыз.",
    label_test_passed_check: "Тест өтті ✓",
    label_test_failed: "Тест өтпеді",
    result_success_title: "Жақсы нәтиже, тарихи тестті аяқтадыңыз.",
    result_fail_title: "Нәтижені жақсарту үшін тағы бір рет байқап көріңіз.",
    result_body_text: "Нәтиже: {correct}/{total} ({percent}%).",
    result_success_secondary_quiz: "Жаңа жетістіктер сақталды.",
    result_fail_secondary_quiz:
      "Талпыныс прогресі сақталды. Картаға оралып, тестті қайта тапсыруға болады.",
    no_new_achievements: "Бұл талпыныста жаңа жетістік жоқ.",
    finish_test_before_achievements: "Жетістіктерді көру үшін тестті аяқтаңыз.",
    error_select_answer: "Жалғастыру үшін жауап нұсқасын таңдаңыз.",
    error_test_unavailable: "Тест әзірге қолжетімді емес",
    error_test_unavailable_hint_quiz:
      "Картаға оралып, қаланы таңдап, тестті қайта бастап көріңіз.",
    error_submit: "Тестті жіберу мүмкін болмады. Қайта байқап көріңіз.",
  },
};

translations.ru.result_time_points = "Время: {time} • Очки: {points}.";
translations.ru.start_modal_title = "Городской тест";
translations.ru.start_modal_body =
  "После нажатия на OK начнётся тест и запустится таймер. Чем быстрее вы завершите тест, тем больше очков получите.";
translations.ru.start_modal_confirm = "OK";
translations.en.result_time_points = "Time: {time} • Points: {points}.";
translations.en.start_modal_title = "City test";
translations.en.start_modal_body =
  "After you press OK, the test will begin and the timer will start. The faster you finish, the more points you will earn.";
translations.en.start_modal_confirm = "OK";
translations.kk.result_time_points = "Уақыт: {time} • Ұпай: {points}.";
translations.kk.start_modal_title = "Қала тесті";
translations.kk.start_modal_body =
  "OK батырмасын басқаннан кейін тест басталып, таймер іске қосылады. Неғұрлым тез аяқтасаңыз, соғұрлым көп ұпай аласыз.";
translations.kk.start_modal_confirm = "OK";

const periodTitleTranslations = {
  en: {
    khanate_1465: "Kazakh Khanate",
    imperial_1731: "Russian Empire Influence",
    imperial_1868: "Imperial Administrative Reform",
    soviet_1925: "Soviet Kazakhstan",
    independence_1991: "Independent Kazakhstan",
    transition_1998: "Capital Relocation Era",
    modern_2025: "Modern Kazakhstan",
  },
  kk: {
    khanate_1465: "Қазақ хандығы",
    imperial_1731: "Ресей империясының ықпалы",
    imperial_1868: "Империялық әкімшілік реформа",
    soviet_1925: "Кеңестік Қазақстан",
    independence_1991: "Тәуелсіз Қазақстан",
    transition_1998: "Астананы көшіру кезеңі",
    modern_2025: "Қазіргі Қазақстан",
  },
};

const state = {
  playerId: null,
  bootstrap: null,
  period: null,
  cityContent: null,
  quiz: null,
  result: null,
  hintMessage: "",
  timerId: null,
};

let stopAuthWatcher = null;

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

  document.querySelector("[data-sidebar-image]")?.setAttribute("alt", translate("city_alt"));
  if (!state.quiz) {
    document.querySelector("[data-xp-counter]") &&
      setText(document.querySelector("[data-xp-counter]"), `0 ${translate("label_achievements_short")}`);
  }

  markLanguageReady();
}

function formatElapsedSeconds(totalSeconds = 0) {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getElapsedSeconds() {
  if (!state.quiz?.startedAt) {
    return 0;
  }
  return Math.max(0, Math.round((Date.now() - Number(state.quiz.startedAt)) / 1000));
}

function syncTimerDisplay() {
  if (!elements.elapsedTimer) return;
  setText(elements.elapsedTimer, formatElapsedSeconds(getElapsedSeconds()));
}

function stopTimer() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

function startTimer() {
  stopTimer();
  syncTimerDisplay();
  state.timerId = window.setInterval(() => {
    syncTimerDisplay();
  }, 250);
}

function setStartModalVisible(visible) {
  setVisible(elements.startModal, visible);
  elements.startModal.classList.toggle("flex", Boolean(visible));
}

function beginTimedQuiz() {
  if (!state.quiz) return;
  if (!state.quiz.startedAt) {
    state.quiz.startedAt = Date.now();
  }
  state.quiz.awaitingStart = false;
  saveQuizState();
  setStartModalVisible(false);
  startTimer();
  render();
}

function getLocalizedPeriodTitle(period) {
  if (!period) {
    return translate("historical_period");
  }

  return periodTitleTranslations[getCurrentLanguage()]?.[period.code] || period.title;
}

function getLocalizedCityContentValue(field, fallbackKey) {
  const language = getCurrentLanguage();
  const translated = state.cityContent?.translations?.[language]?.[field];
  if (translated) {
    return translated;
  }

  if (language === "ru" && state.cityContent?.[field]) {
    return state.cityContent[field];
  }

  return translate(fallbackKey);
}

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

function hasLegacyQuestionSuffix(text) {
  return /\s*\([^()]*,\s*\d{4}\)\s*$/.test(String(text || ""));
}

function questionHasCurrentTranslations(question) {
  const translations = question?.translations || {};
  return ["ru", "en", "kk"].every((language) => {
    const localized = translations[language];
    return (
      localized?.question &&
      Array.isArray(localized?.options) &&
      localized.options.length === 4 &&
      !hasLegacyQuestionSuffix(localized.question)
    );
  });
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
  elements.errorState.className =
    "rounded-xl border border-error/20 bg-error-container/10 px-5 py-4 text-sm text-error";
  setVisible(elements.errorState, true);
  setText(elements.errorMessage, message);
}

function showNotice(message) {
  elements.errorState.className =
    "rounded-xl border border-secondary-container bg-secondary-container/30 px-5 py-4 text-sm font-bold text-on-secondary-container";
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
  const achUnit = translate("label_achievements_short");
  setText(elements.xpCounter, `${achCount} ${achUnit}`);
}

function renderSidebar() {
  const language = getCurrentLanguage();
  const displayName =
    getLocalizedCityDisplayName(
      state.quiz?.city,
      state.cityContent?.display_name || state.quiz?.city,
      language
    ) || translate("city_default");
  const periodBadge = state.period
    ? `${state.period.year_label} • ${getLocalizedPeriodTitle(state.period)}`
    : translate("period");
  const historySummary = getLocalizedCityContentValue(
    "history_summary",
    "history_summary_fallback"
  );
  const interestingFact = getLocalizedCityContentValue(
    "interesting_fact",
    "interesting_fact_fallback"
  );

  elements.sidebarImage.src = getCityImage(state.quiz?.city, state.quiz?.periodCode);
  elements.sidebarImage.alt = displayName;
  setText(elements.sidebarTag, periodBadge);
  setText(elements.sidebarTitle, displayName);
  setText(elements.sidebarBody, interestingFact);
  setText(elements.hintPrimaryLabel, translate("label_hist_hint"));
  setText(elements.hintSecondaryLabel, translate("label_city_importance"));
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
  const quizStarted = Boolean(state.quiz?.startedAt) && !state.quiz?.awaitingStart;
  const visibleQuestion = getVisibleQuestion(question);

  setVisible(elements.questionSection, true);
  setVisible(elements.resultSection, false);
  setVisible(elements.prevButton, quizStarted && state.quiz.currentIndex > 0);
  setText(
    elements.questionTag,
    `${getLocalizedCityName(state.quiz.city, getCurrentLanguage())} • ${state.period?.year_label || state.quiz.periodCode}`
  );
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
      if (!quizStarted) {
        setStartModalVisible(true);
        return;
      }
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
      ? translate("btn_finish")
      : translate("btn_next")
  );
}

function renderResult() {
  if (!state.result) {
    return;
  }

  stopTimer();
  setVisible(elements.questionSection, false);
  setVisible(elements.resultSection, true);
  setVisible(elements.submitButton, false);
  setVisible(elements.prevButton, false);

  const statusKey = state.result.passed ? "label_test_passed_check" : "label_test_failed";
  setText(elements.resultBadge, translate(statusKey));

  const titleKey = state.result.passed ? "result_success_title" : "result_fail_title";
  setText(elements.resultTitle, translate(titleKey));

  const bodyText = translate("result_body_text")
    .replace("{correct}", state.result.correct_answers)
    .replace("{total}", state.result.total_questions)
    .replace("{percent}", state.result.score_percent);
  setText(elements.resultBody, bodyText);

  const secondaryKey = state.result.passed ? "result_success_secondary_quiz" : "result_fail_secondary_quiz";
  setText(
    elements.resultSecondary,
    `${translate("result_time_points")
      .replace("{time}", formatElapsedSeconds(state.result.elapsed_seconds))
      .replace("{points}", state.result.earned_points)} ${translate(secondaryKey)}`
  );

  if (state.result.unlocked_achievements.length === 0) {
    setHtml(
      elements.resultAchievements,
      `<p class="text-sm text-on-surface-variant">${translate("no_new_achievements")}</p>`
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
  applyTranslations();
  syncTimerDisplay();
  renderHeader();
  renderSidebar();
  renderQuestion();
}

async function submitQuiz() {
  const payload = {
    player_id: state.playerId,
    test_session_id: state.quiz.testSessionId,
    elapsed_seconds: getElapsedSeconds(),
    answers: state.quiz.questions.map((question) => ({
      question_id: question.id,
      selected_index: state.quiz.answers[question.id],
    })),
  };

  const response = await api.submitTest(payload);
  state.result = response;
  stopTimer();
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

  if (state.quiz.awaitingStart || !state.quiz.startedAt) {
    setStartModalVisible(true);
    return;
  }

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
  const storedQuizIsCurrent = storedQuiz?.questions?.every(questionHasCurrentTranslations);
  if (storedQuiz && storedQuizIsCurrent) {
    state.quiz = storedQuiz;
    return;
  }
  if (storedQuiz) {
    clearActiveQuizState();
  }

  const pendingContext = getPendingQuizContext();
  if (!pendingContext?.city || !pendingContext?.periodCode) {
    throw new Error(translate("error_test_unavailable_hint_quiz"));
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
    startedAt: null,
    awaitingStart: true,
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
  elements.achievementsButton.addEventListener("click", () => {
    if (state.result) {
      window.location.href = "../profile/code.html";
      return;
    }
    showNotice(translate("finish_test_before_achievements"));
  });
  elements.submitButton.addEventListener("click", handleContinue);
  elements.prevButton.addEventListener("click", handlePrev);
  elements.startConfirmButton.addEventListener("click", beginTimedQuiz);
  elements.primaryHintButton.addEventListener("click", () => {
    state.hintMessage = getLocalizedCityContentValue(
      "history_summary",
      "historical_hint_unavailable"
    );
    renderSidebar();
  });
  elements.secondaryHintButton.addEventListener("click", () => {
    state.hintMessage =
      getLocalizedCityContentValue("importance_reason", "additional_hint_unavailable") ||
      getLocalizedCityContentValue("interesting_fact", "additional_hint_unavailable");
    renderSidebar();
  });
}

function cacheElements() {
  elements.closeButton = queryRequired("[data-close-quiz]");
  elements.progressBar = queryRequired("[data-progress-bar]");
  elements.progressCounter = queryRequired("[data-progress-counter]");
  elements.xpCounter = queryRequired("[data-xp-counter]");
  elements.achievementsButton = queryRequired("[data-achievements-button]");
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
  elements.elapsedTimer = queryRequired("[data-elapsed-timer]");
  elements.startModal = queryRequired("[data-city-start-modal]");
  elements.startConfirmButton = queryRequired("[data-city-start-confirm]");
}

async function init() {
  mountLanguageMenu({
    onChange: () => {
      applyTranslations();
      state.hintMessage = "";
      if (state.quiz && !state.quiz.questions.every(questionHasCurrentTranslations)) {
        clearActiveQuizState();
        window.location.reload();
        return;
      }
      if (state.quiz) render();
    },
  });
  if (!hasStoredAuthUser()) {
    window.location.href = "../registration/code.html";
    return;
  }

  cacheElements();
  protectQuizContent("[data-question-section]");
  bindEvents();
  applyTranslations();
  const authUser = await ensureStoredAuthOrRedirect();
  if (!authUser) {
    return;
  }
  stopAuthWatcher?.();
  stopAuthWatcher = startStoredAuthWatcher();
  state.playerId = getOrCreatePlayerId();
  hideError();

  await restoreOrStartQuiz();
  await loadSupportingData();
  if (state.quiz?.startedAt && !state.quiz?.awaitingStart) {
    startTimer();
    setStartModalVisible(false);
  } else {
    syncTimerDisplay();
    setStartModalVisible(true);
  }
  render();
}

init().catch((error) => {
  console.error(error);
  applyTranslations();
  showError(translate("load_error"));
  setText(elements.questionTitle, translate("error_test_unavailable"));
  setText(elements.questionBody, translate("error_test_unavailable_hint_quiz"));
  elements.optionsGrid && setHtml(elements.optionsGrid, "");
});
