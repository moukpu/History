import { api } from "./api.js";
import { translateAchievement } from "./achievements-i18n.js";
import { getLocalizedCityName } from "./city-visuals.js";
import { escapeHtml, setHtml, setText, setVisible } from "./helpers.js";
import { clearStoredPlayerId, reconcileStoredAuthUser } from "./storage.js";
import { getCurrentLanguage, mountLanguageMenu } from "./language.js";

const USER_KEY = "sapar-user";
const AVATAR_STORAGE_KEY = "sapar-avatar-by-user";
const AVATAR_STAGE_SIZE = 288;
const AVATAR_CROP_INSET = 16;
const AVATAR_CROP_SIZE = AVATAR_STAGE_SIZE - AVATAR_CROP_INSET * 2;
const AVATAR_EXPORT_SIZE = 512;
const TEMPLATE_AVATARS = Array.from({ length: 10 }, (_, index) => ({
  id: `template-${index + 1}`,
  src: `../assets/avatars/cartoon-avatar-${String(index + 1).padStart(2, "0")}.svg`,
  number: index + 1,
}));

const translations = {
  ru: {
    page_title: "Sapar Quest - Профиль",
    nav_explore: "Главная",
    nav_map: "Карта",
    nav_leaderboard: "Рейтинг",
    loading: "Загрузка...",
    stat_xp: "Опыт",
    stat_tests: "Пройдено тестов",
    stat_achievements: "Достижения",
    stat_accuracy: "Точность",
    achievements_title: "Мои достижения",
    recent_title: "Последняя активность",
    ent_title: "История ЕНТ",
    logout: "Выйти",
    profile_load_error: "Ошибка загрузки данных.",
    achievements_empty: "Достижения ещё не открыты. Пройдите тест на карте!",
    recent_empty: "Пока нет результатов. Начните тест на карте!",
    ent_empty: "Пока нет пройденных ЕНТ тестов.",
    status_perfect: "Идеальный результат",
    status_passed: "Тест по городу пройден",
    status_attempted: "Есть попытки, но тест ещё не пройден",
    attempts: "Попыток",
    last_activity: "Последняя активность",
    ent_test_label: ({ number }) => `Попытка ЕНТ #${number}`,
    ent_test_subtitle: "Подготовка к экзамену",
    ent_review_open: "Посмотреть разбор",
    ent_review_title: "Разбор попытки ЕНТ",
    ent_review_loading: "Загрузка разбора...",
    ent_review_error: "Не удалось загрузить разбор попытки.",
    ent_review_correct_answer: "Правильный ответ",
    ent_review_your_answer: "Ваш ответ",
    ent_review_no_answer: "Нет ответа",
    ent_review_question: ({ current, total }) => `Вопрос ${current} из ${total}`,
    correct: "Верных",
    date: "Дата",
    passed: "Сдано",
    failed: "Не сдано",
    avatar_alt: "Аватар",
    avatar_edit_alt: "Редактирование",
    avatar_preview_alt: "Превью",
    avatar_modal_title: "Настройка аватара",
    avatar_crop_empty: "Выберите шаблон или загрузите своё фото",
    avatar_upload: "Загрузить",
    avatar_templates: "Шаблоны",
    avatar_preview: "Предпросмотр",
    avatar_cancel: "Отмена",
    avatar_save: "Сохранить",
    avatar_template_label: ({ number }) => `Аватар ${number}`,
    avatar_template_load_error: "Не удалось загрузить шаблонный аватар.",
    avatar_open_error: "Не удалось открыть изображение.",
    avatar_owner_error: "Не удалось определить профиль для сохранения аватара.",
    avatar_prepare_error: "Не удалось подготовить аватар.",
    avatar_save_error: "Не удалось сохранить аватар. Попробуйте изображение поменьше.",
    avatar_file_type_error: "Загрузите изображение в формате PNG, JPG или WEBP.",
    avatar_file_read_error: "Не удалось прочитать выбранный файл.",
    avatar_image_load_error: "Не удалось загрузить изображение.",
  },
  en: {
    page_title: "Sapar Quest - Profile",
    nav_explore: "Home",
    nav_map: "Map",
    nav_leaderboard: "Leaderboard",
    loading: "Loading...",
    stat_xp: "XP",
    stat_tests: "Tests completed",
    stat_achievements: "Achievements",
    stat_accuracy: "Accuracy",
    achievements_title: "My achievements",
    recent_title: "Recent activity",
    ent_title: "UNT history",
    logout: "Log out",
    profile_load_error: "Failed to load profile data.",
    achievements_empty: "No achievements unlocked yet. Complete a map test!",
    recent_empty: "No city test results yet. Start a test on the map!",
    ent_empty: "No completed UNT tests yet.",
    status_perfect: "Perfect result",
    status_passed: "City test completed",
    status_attempted: "Attempts exist, but the test is not passed yet",
    attempts: "Attempts",
    last_activity: "Last activity",
    ent_test_label: ({ number }) => `UNT attempt #${number}`,
    ent_test_subtitle: "Exam preparation",
    ent_review_open: "View review",
    ent_review_title: "UNT attempt review",
    ent_review_loading: "Loading review...",
    ent_review_error: "Could not load the attempt review.",
    ent_review_correct_answer: "Correct answer",
    ent_review_your_answer: "Your answer",
    ent_review_no_answer: "No answer",
    ent_review_question: ({ current, total }) => `Question ${current} of ${total}`,
    correct: "Correct",
    date: "Date",
    passed: "Passed",
    failed: "Failed",
    avatar_alt: "Avatar",
    avatar_edit_alt: "Editing",
    avatar_preview_alt: "Preview",
    avatar_modal_title: "Avatar settings",
    avatar_crop_empty: "Choose a template or upload your photo",
    avatar_upload: "Upload",
    avatar_templates: "Templates",
    avatar_preview: "Preview",
    avatar_cancel: "Cancel",
    avatar_save: "Save",
    avatar_template_label: ({ number }) => `Avatar ${number}`,
    avatar_template_load_error: "Could not load the avatar template.",
    avatar_open_error: "Could not open the image.",
    avatar_owner_error: "Could not identify the profile for saving the avatar.",
    avatar_prepare_error: "Could not prepare the avatar.",
    avatar_save_error: "Could not save the avatar. Try a smaller image.",
    avatar_file_type_error: "Upload an image in PNG, JPG, or WEBP format.",
    avatar_file_read_error: "Could not read the selected file.",
    avatar_image_load_error: "Could not load the image.",
  },
  kk: {
    page_title: "Sapar Quest - Профиль",
    nav_explore: "Басты бет",
    nav_map: "Карта",
    nav_leaderboard: "Рейтинг",
    loading: "Жүктелуде...",
    stat_xp: "Тәжірибе",
    stat_tests: "Өткен тесттер",
    stat_achievements: "Жетістіктер",
    stat_accuracy: "Дәлдік",
    achievements_title: "Менің жетістіктерім",
    recent_title: "Соңғы белсенділік",
    ent_title: "ҰБТ тарихы",
    logout: "Шығу",
    profile_load_error: "Профиль деректерін жүктеу қатесі.",
    achievements_empty: "Жетістіктер әлі ашылған жоқ. Картадан тест өтіңіз!",
    recent_empty: "Әзірге қала тесттерінің нәтижелері жоқ. Картадан тест бастаңыз!",
    ent_empty: "Әзірге өткен ҰБТ тесттері жоқ.",
    status_perfect: "Мінсіз нәтиже",
    status_passed: "Қала тесті өтті",
    status_attempted: "Әрекеттер бар, бірақ тест әлі өтпеді",
    attempts: "Әрекет",
    last_activity: "Соңғы белсенділік",
    ent_test_label: ({ number }) => `ҰБТ әрекеті #${number}`,
    ent_test_subtitle: "Емтиханға дайындық",
    ent_review_open: "Талдауды көру",
    ent_review_title: "ҰБТ әрекетін талдау",
    ent_review_loading: "Талдау жүктелуде...",
    ent_review_error: "Әрекет талдауын жүктеу мүмкін болмады.",
    ent_review_correct_answer: "Дұрыс жауап",
    ent_review_your_answer: "Сіздің жауабыңыз",
    ent_review_no_answer: "Жауап жоқ",
    ent_review_question: ({ current, total }) => `${current}/${total} сұрақ`,
    correct: "Дұрыс",
    date: "Күні",
    passed: "Өтті",
    failed: "Өтпеді",
    avatar_alt: "Аватар",
    avatar_edit_alt: "Өңдеу",
    avatar_preview_alt: "Алдын ала көру",
    avatar_modal_title: "Аватар баптауы",
    avatar_crop_empty: "Үлгіні таңдаңыз немесе өз фотоңызды жүктеңіз",
    avatar_upload: "Жүктеу",
    avatar_templates: "Үлгілер",
    avatar_preview: "Алдын ала көру",
    avatar_cancel: "Болдырмау",
    avatar_save: "Сақтау",
    avatar_template_label: ({ number }) => `Аватар ${number}`,
    avatar_template_load_error: "Аватар үлгісін жүктеу мүмкін болмады.",
    avatar_open_error: "Суретті ашу мүмкін болмады.",
    avatar_owner_error: "Аватарды сақтау үшін профильді анықтау мүмкін болмады.",
    avatar_prepare_error: "Аватарды дайындау мүмкін болмады.",
    avatar_save_error: "Аватарды сақтау мүмкін болмады. Кішірек суретті байқап көріңіз.",
    avatar_file_type_error: "PNG, JPG немесе WEBP форматындағы суретті жүктеңіз.",
    avatar_file_read_error: "Таңдалған файлды оқу мүмкін болмады.",
    avatar_image_load_error: "Суретті жүктеу мүмкін болмады.",
  },
};

const state = {
  user: null,
  avatarEditor: createEmptyAvatarEditor(),
  entAttemptDetail: null,
};

const elements = {};
let currentLanguage = getCurrentLanguage();

function translate(key, params = {}) {
  const value = translations[currentLanguage]?.[key] ?? translations.ru[key] ?? key;
  return typeof value === "function" ? value(params) : value;
}

function applyStaticTranslations() {
  document.documentElement.lang = currentLanguage;
  document.title = translate("page_title");

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    if (element.closest("footer")) return;
    setText(element, translate(element.dataset.i18n));
  });

  document.querySelector("[data-profile-avatar-image]")?.setAttribute("alt", translate("avatar_alt"));
  document.querySelector("[data-avatar-crop-image]")?.setAttribute("alt", translate("avatar_edit_alt"));
  document.querySelector("[data-avatar-preview-image]")?.setAttribute("alt", translate("avatar_preview_alt"));
}

function createEmptyAvatarEditor() {
  return {
    sourceUrl: "",
    sourceType: null,
    templateId: null,
    image: null,
    naturalWidth: 0,
    naturalHeight: 0,
    baseScale: 1,
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragOriginX: 0,
    dragOriginY: 0,
    pinchDistance: 0,
    pinchStartZoom: 1,
    activePointers: new Map(),
  };
}

function queryRequired(selector) {
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }
  return element;
}

function ensureEntReviewModal() {
  let modal = document.querySelector("[data-ent-review-modal]");
  if (modal) {
    return modal;
  }

  modal = document.createElement("div");
  modal.className = "fixed inset-0 z-[110] hidden items-center justify-center bg-black/60 backdrop-blur-sm p-4";
  modal.dataset.entReviewModal = "";
  modal.innerHTML = `
    <div class="bg-surface-container-lowest w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
      <div class="px-6 md:px-8 py-5 border-b border-outline/5 flex items-center justify-between gap-4">
        <div>
          <h3 class="text-2xl font-black text-on-surface tracking-tight" data-ent-review-title></h3>
          <p class="text-sm font-bold text-on-surface-variant mt-1" data-ent-review-summary></p>
        </div>
        <button type="button" class="text-on-surface-variant hover:text-on-surface transition-colors" data-ent-review-close>
          <span class="material-symbols-outlined text-3xl">close</span>
        </button>
      </div>
      <div class="flex-1 overflow-y-auto p-5 md:p-8 space-y-4 custom-scroll" data-ent-review-content></div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getStoredAvatarMap() {
  try {
    const raw = localStorage.getItem(AVATAR_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    localStorage.removeItem(AVATAR_STORAGE_KEY);
    return {};
  }
}

function getAvatarOwnerKey(user) {
  if (!user) {
    return "";
  }
  return String(user.id ?? user.email ?? user.username ?? "");
}

function writeStoredAvatarMap(value) {
  localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(value));
}

function getStoredAvatar(key) {
  return getStoredAvatarMap()?.[key] ?? null;
}

function setStoredAvatar(key, avatar) {
  const current = getStoredAvatarMap();
  current[key] = avatar;
  writeStoredAvatarMap(current);
}

function clearStoredAvatar(key) {
  const current = getStoredAvatarMap();
  delete current[key];
  writeStoredAvatarMap(current);
}

function requireAuth() {
  const user = getStoredUser();
  if (!user) {
    window.location.href = "../registration/code.html";
    return null;
  }
  return user;
}

function getProfilePlayerId() {
  return String(state.user?.id ?? state.user?.user_id ?? state.user?.email ?? state.user?.username ?? "");
}

function cacheElements() {
  elements.error = document.querySelector("[data-profile-error]");
  elements.username = queryRequired("[data-profile-username]");
  elements.email = queryRequired("[data-profile-email]");
  elements.score = queryRequired("[data-profile-score]");
  elements.tests = queryRequired("[data-profile-tests]");
  elements.achievementsCount = queryRequired("[data-profile-achievements-count]");
  elements.accuracy = queryRequired("[data-profile-accuracy]");
  elements.achievementsGrid = queryRequired("[data-achievements-grid]");
  elements.recentResults = queryRequired("[data-recent-results]");
  elements.entResults = queryRequired("[data-ent-results]");
  elements.logoutButton = queryRequired("[data-logout-button]");
  elements.avatarButton = queryRequired("[data-profile-avatar-button]");
  elements.avatarImage = queryRequired("[data-profile-avatar-image]");
  elements.avatarFallback = queryRequired("[data-profile-avatar-fallback]");
  elements.avatarModal = queryRequired("[data-avatar-modal]");
  elements.avatarModalClose = queryRequired("[data-avatar-modal-close]");
  elements.avatarCloseButton = queryRequired("[data-avatar-close-button]");
  elements.avatarUploadTrigger = queryRequired("[data-avatar-upload-trigger]");
  elements.avatarFileInput = queryRequired("[data-avatar-file-input]");
  elements.avatarResetButton = queryRequired("[data-avatar-reset-button]");
  elements.avatarCropStage = queryRequired("[data-avatar-crop-stage]");
  elements.avatarCropImage = queryRequired("[data-avatar-crop-image]");
  elements.avatarCropEmpty = queryRequired("[data-avatar-crop-empty]");
  elements.avatarPreviewImage = queryRequired("[data-avatar-preview-image]");
  elements.avatarPreviewFallback = queryRequired("[data-avatar-preview-fallback]");
  elements.avatarTemplateGrid = queryRequired("[data-avatar-template-grid]");
  elements.avatarError = queryRequired("[data-avatar-error]");
  elements.avatarCancelButton = queryRequired("[data-avatar-cancel-button]");
  elements.avatarSaveButton = queryRequired("[data-avatar-save-button]");
  elements.entReviewModal = ensureEntReviewModal();
  elements.entReviewClose = queryRequired("[data-ent-review-close]");
  elements.entReviewTitle = queryRequired("[data-ent-review-title]");
  elements.entReviewSummary = queryRequired("[data-ent-review-summary]");
  elements.entReviewContent = queryRequired("[data-ent-review-content]");
}

function showProfileError(message) {
  if (!elements.error) {
    return;
  }
  elements.error.textContent = message;
  elements.error.classList.remove("hidden");
}

function hideAvatarError() {
  elements.avatarError.classList.add("hidden");
  elements.avatarError.textContent = "";
}

function showAvatarError(message) {
  elements.avatarError.textContent = message;
  elements.avatarError.classList.remove("hidden");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getAvatarDisplaySize() {
  const editor = state.avatarEditor;
  return {
    width: editor.naturalWidth * editor.baseScale * editor.zoom,
    height: editor.naturalHeight * editor.baseScale * editor.zoom,
  };
}

function clampAvatarOffsets() {
  // Убираем жесткие ограничения, даем пользователю полную свободу позиционирования.
  // В профессиональных редакторах часто позволяют оставлять пустые края, 
  // если пользователь так хочет.
  return; 
}

function getStagePoint(clientX, clientY) {
  const rect = elements.avatarCropStage.getBoundingClientRect();
  return {
    x: clamp(clientX - rect.left, 0, rect.width),
    y: clamp(clientY - rect.top, 0, rect.height),
  };
}

function setAvatarZoomAroundPoint(nextZoom, stageX = AVATAR_STAGE_SIZE / 2, stageY = AVATAR_STAGE_SIZE / 2) {
  const editor = state.avatarEditor;
  if (!editor.image) {
    return;
  }

  const oldWidth = editor.naturalWidth * editor.baseScale * editor.zoom;
  const oldHeight = editor.naturalHeight * editor.baseScale * editor.zoom;
  const oldLeft = AVATAR_STAGE_SIZE / 2 - oldWidth / 2 + editor.offsetX;
  const oldTop = AVATAR_STAGE_SIZE / 2 - oldHeight / 2 + editor.offsetY;
  const relativeX = clamp((stageX - oldLeft) / oldWidth, 0, 1);
  const relativeY = clamp((stageY - oldTop) / oldHeight, 0, 1);

  editor.zoom = clamp(nextZoom, 0.4, 4.0);

  const newWidth = editor.naturalWidth * editor.baseScale * editor.zoom;
  const newHeight = editor.naturalHeight * editor.baseScale * editor.zoom;
  editor.offsetX = stageX - AVATAR_STAGE_SIZE / 2 + (0.5 - relativeX) * newWidth;
  editor.offsetY = stageY - AVATAR_STAGE_SIZE / 2 + (0.5 - relativeY) * newHeight;
  clampAvatarOffsets();
}

function renderAvatarSelection() {
  const html = TEMPLATE_AVATARS.map(
    (avatar) => {
      const label = translate("avatar_template_label", { number: avatar.number });
      return `
      <button
        type="button"
        class="avatar-template-tile ${state.avatarEditor.templateId === avatar.id ? "is-selected" : ""} w-full aspect-square rounded-2xl overflow-hidden border border-outline-variant/15 bg-surface shadow-sm transition-all hover:-translate-y-0.5 active:scale-[0.98]"
        data-avatar-template-id="${avatar.id}"
        title="${escapeHtml(label)}"
      >
        <img alt="${escapeHtml(label)}" class="w-full h-full object-cover" src="${avatar.src}" />
      </button>
    `;
    }
  ).join("");

  setHtml(elements.avatarTemplateGrid, html);

  elements.avatarTemplateGrid.querySelectorAll("[data-avatar-template-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const templateId = button.getAttribute("data-avatar-template-id");
      const avatar = TEMPLATE_AVATARS.find((item) => item.id === templateId);
      if (!avatar) {
        return;
      }

      loadAvatarEditorSource({
        src: avatar.src,
        sourceType: "template",
        templateId: avatar.id,
      }).catch((error) => {
        showAvatarError(error.message || translate("avatar_template_load_error"));
      });
    });
  });
}

function renderStoredAvatar() {
  const avatarKey = getAvatarOwnerKey(state.user);
  const avatar = avatarKey ? getStoredAvatar(avatarKey) : null;
  if (avatar?.src) {
    elements.avatarImage.src = avatar.src;
    elements.avatarImage.classList.remove("hidden");
    elements.avatarFallback.classList.add("hidden");
    return;
  }

  elements.avatarImage.removeAttribute("src");
  elements.avatarImage.classList.add("hidden");
  elements.avatarFallback.classList.remove("hidden");
}

function drawAvatarToCanvas(canvas, { clipCircle = true } = {}) {
  const editor = state.avatarEditor;
  if (!editor.image) {
    return false;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return false;
  }

  const { width, height } = getAvatarDisplaySize();
  const left = AVATAR_STAGE_SIZE / 2 - width / 2 + editor.offsetX;
  const top = AVATAR_STAGE_SIZE / 2 - height / 2 + editor.offsetY;
  const scale = AVATAR_EXPORT_SIZE / AVATAR_CROP_SIZE;

  canvas.width = AVATAR_EXPORT_SIZE;
  canvas.height = AVATAR_EXPORT_SIZE;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.save();
  ctx.scale(scale, scale);

  if (clipCircle) {
    ctx.beginPath();
    ctx.arc(AVATAR_CROP_SIZE / 2, AVATAR_CROP_SIZE / 2, AVATAR_CROP_SIZE / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
  }

  ctx.drawImage(
    editor.image,
    left - AVATAR_CROP_INSET,
    top - AVATAR_CROP_INSET,
    width,
    height
  );
  ctx.restore();
  return true;
}

function updateAvatarPreview() {
  if (!state.avatarEditor.image) {
    elements.avatarPreviewImage.classList.add("hidden");
    elements.avatarPreviewImage.removeAttribute("src");
    elements.avatarPreviewFallback.classList.remove("hidden");
    return;
  }

  const canvas = document.createElement("canvas");
  if (!drawAvatarToCanvas(canvas)) {
    return;
  }

  elements.avatarPreviewImage.src = canvas.toDataURL("image/png");
  elements.avatarPreviewImage.classList.remove("hidden");
  elements.avatarPreviewFallback.classList.add("hidden");
}

function renderAvatarEditor() {
  const editor = state.avatarEditor;
  renderAvatarSelection();

  if (!editor.image) {
    elements.avatarCropImage.classList.add("hidden");
    elements.avatarCropImage.removeAttribute("src");
    elements.avatarCropEmpty.classList.remove("hidden");
    updateAvatarPreview();
    return;
  }

  const { width, height } = getAvatarDisplaySize();
  elements.avatarCropImage.src = editor.sourceUrl;
  elements.avatarCropImage.style.width = `${width}px`;
  elements.avatarCropImage.style.height = `${height}px`;
  elements.avatarCropImage.style.transform = `translate(-50%, -50%) translate(${editor.offsetX}px, ${editor.offsetY}px)`;
  elements.avatarCropImage.classList.toggle("is-dragging", editor.isDragging);
  elements.avatarCropImage.classList.remove("hidden");
  elements.avatarCropEmpty.classList.add("hidden");
  updateAvatarPreview();
}

async function loadAvatarEditorSource({ src, sourceType, templateId = null }) {
  hideAvatarError();

  const image = new Image();
  image.decoding = "async";

  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error(translate("avatar_open_error")));
    image.src = src;
  });

  // Начинаем в режиме "cover" точно по размеру области кропа (256px),
  // чтобы картинка сразу идеально заполняла круглую аватарку.
  const baseScale = Math.max(
    AVATAR_CROP_SIZE / image.naturalWidth,
    AVATAR_CROP_SIZE / image.naturalHeight
  );

  state.avatarEditor = {
    ...createEmptyAvatarEditor(),
    sourceUrl: src,
    sourceType,
    templateId,
    image,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    baseScale,
  };

  renderAvatarEditor();
}

function resetAvatarEditor() {
  state.avatarEditor = createEmptyAvatarEditor();
  renderAvatarEditor();
}

function openAvatarModal() {
  hideAvatarError();
  const avatarKey = getAvatarOwnerKey(state.user);
  const currentAvatar = avatarKey ? getStoredAvatar(avatarKey) : null;

  elements.avatarModal.classList.remove("hidden");
  document.body.classList.add("overflow-hidden");

  if (currentAvatar?.src) {
    loadAvatarEditorSource({
      src: currentAvatar.src,
      sourceType: currentAvatar.sourceType || "custom",
      templateId: currentAvatar.templateId || null,
    }).catch(() => resetAvatarEditor());
    return;
  }

  resetAvatarEditor();
  loadAvatarEditorSource({
    src: TEMPLATE_AVATARS[0].src,
    sourceType: "template",
    templateId: TEMPLATE_AVATARS[0].id,
  }).catch(() => resetAvatarEditor());
}

function closeAvatarModal() {
  elements.avatarModal.classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
  elements.avatarFileInput.value = "";
  hideAvatarError();
}

function saveAvatar() {
  const avatarKey = getAvatarOwnerKey(state.user);
  if (!avatarKey) {
    showAvatarError(translate("avatar_owner_error"));
    return;
  }

  if (!state.avatarEditor.image) {
    clearStoredAvatar(avatarKey);
    renderStoredAvatar();
    closeAvatarModal();
    return;
  }

  const canvas = document.createElement("canvas");
  if (!drawAvatarToCanvas(canvas)) {
    showAvatarError(translate("avatar_prepare_error"));
    return;
  }

  try {
    const src = canvas.toDataURL("image/webp", 0.92);
    setStoredAvatar(avatarKey, {
      src,
      sourceType: state.avatarEditor.sourceType,
      templateId: state.avatarEditor.templateId,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    showAvatarError(
      error instanceof Error && error.message
        ? error.message
        : translate("avatar_save_error")
    );
    return;
  }

  renderStoredAvatar();
  closeAvatarModal();
}

function handleAvatarFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    showAvatarError(translate("avatar_file_type_error"));
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const result = typeof reader.result === "string" ? reader.result : "";
    if (!result) {
      showAvatarError(translate("avatar_file_read_error"));
      return;
    }

    loadAvatarEditorSource({
      src: result,
      sourceType: "custom",
      templateId: null,
    }).catch((error) => {
      showAvatarError(error.message || translate("avatar_image_load_error"));
    });
  };
  reader.onerror = () => showAvatarError(translate("avatar_file_read_error"));
  reader.readAsDataURL(file);
}

function handleCropPointerDown(event) {
  if (!state.avatarEditor.image) {
    return;
  }

  state.avatarEditor.activePointers.set(event.pointerId, {
    x: event.clientX,
    y: event.clientY,
  });

  if (state.avatarEditor.activePointers.size === 1) {
    state.avatarEditor.isDragging = true;
    state.avatarEditor.dragStartX = event.clientX;
    state.avatarEditor.dragStartY = event.clientY;
    state.avatarEditor.dragOriginX = state.avatarEditor.offsetX;
    state.avatarEditor.dragOriginY = state.avatarEditor.offsetY;
    elements.avatarCropImage.classList.add("is-dragging");
  } else if (state.avatarEditor.activePointers.size === 2) {
    state.avatarEditor.isDragging = false;
    elements.avatarCropImage.classList.remove("is-dragging");
    const [first, second] = [...state.avatarEditor.activePointers.values()];
    state.avatarEditor.pinchDistance = Math.hypot(second.x - first.x, second.y - first.y);
    state.avatarEditor.pinchStartZoom = state.avatarEditor.zoom;
  }

  elements.avatarCropStage.setPointerCapture?.(event.pointerId);
}

function handleCropPointerMove(event) {
  if (!state.avatarEditor.activePointers.has(event.pointerId)) {
    return;
  }

  state.avatarEditor.activePointers.set(event.pointerId, {
    x: event.clientX,
    y: event.clientY,
  });

  if (state.avatarEditor.activePointers.size === 2) {
    const [first, second] = [...state.avatarEditor.activePointers.values()];
    const nextDistance = Math.hypot(second.x - first.x, second.y - first.y);
    if (state.avatarEditor.pinchDistance > 0 && nextDistance > 0) {
      const center = getStagePoint((first.x + second.x) / 2, (first.y + second.y) / 2);
      setAvatarZoomAroundPoint(
        state.avatarEditor.pinchStartZoom * (nextDistance / state.avatarEditor.pinchDistance),
        center.x,
        center.y
      );
      renderAvatarEditor();
    }
    return;
  }

  if (!state.avatarEditor.isDragging) {
    return;
  }

  state.avatarEditor.offsetX =
    state.avatarEditor.dragOriginX + (event.clientX - state.avatarEditor.dragStartX);
  state.avatarEditor.offsetY =
    state.avatarEditor.dragOriginY + (event.clientY - state.avatarEditor.dragStartY);
  clampAvatarOffsets();
  renderAvatarEditor();
}

function handleCropPointerUp(event) {
  state.avatarEditor.activePointers.delete(event.pointerId);

  if (elements.avatarCropStage.hasPointerCapture?.(event.pointerId)) {
    elements.avatarCropStage.releasePointerCapture(event.pointerId);
  }

  if (state.avatarEditor.activePointers.size < 2) {
    state.avatarEditor.pinchDistance = 0;
  }

  if (state.avatarEditor.activePointers.size === 1) {
    const [pointer] = [...state.avatarEditor.activePointers.values()];
    state.avatarEditor.isDragging = true;
    state.avatarEditor.dragStartX = pointer.x;
    state.avatarEditor.dragStartY = pointer.y;
    state.avatarEditor.dragOriginX = state.avatarEditor.offsetX;
    state.avatarEditor.dragOriginY = state.avatarEditor.offsetY;
    elements.avatarCropImage.classList.add("is-dragging");
  } else {
    state.avatarEditor.isDragging = false;
    elements.avatarCropImage.classList.remove("is-dragging");
  }

  renderAvatarEditor();
}

function bindAvatarEvents() {
  elements.avatarButton.addEventListener("click", openAvatarModal);
  elements.avatarModalClose.addEventListener("click", closeAvatarModal);
  elements.avatarCloseButton.addEventListener("click", closeAvatarModal);
  elements.avatarCancelButton.addEventListener("click", closeAvatarModal);
  elements.avatarUploadTrigger.addEventListener("click", () => elements.avatarFileInput.click());
  elements.avatarFileInput.addEventListener("change", handleAvatarFileChange);
  elements.avatarResetButton.addEventListener("click", resetAvatarEditor);
  elements.avatarSaveButton.addEventListener("click", saveAvatar);

  elements.avatarCropStage.addEventListener(
    "wheel",
    (event) => {
      if (!state.avatarEditor.image) {
        return;
      }
      event.preventDefault();
      const step = event.deltaY < 0 ? 0.12 : -0.12;
      const point = getStagePoint(event.clientX, event.clientY);
      setAvatarZoomAroundPoint(state.avatarEditor.zoom + step, point.x, point.y);
      renderAvatarEditor();
    },
    { passive: false }
  );

  elements.avatarCropStage.addEventListener("pointerdown", handleCropPointerDown);
  elements.avatarCropStage.addEventListener("pointermove", handleCropPointerMove);
  elements.avatarCropStage.addEventListener("pointerup", handleCropPointerUp);
  elements.avatarCropStage.addEventListener("pointercancel", handleCropPointerUp);

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.avatarModal.classList.contains("hidden")) {
      closeAvatarModal();
    }
  });
}

function renderAchievements(data, catalogData) {
  const allAchievements = data?.achievements || [];
  const catalog = catalogData?.achievements || [];

  if (catalog.length === 0 && allAchievements.length === 0) {
    setHtml(
      elements.achievementsGrid,
      `<div class="col-span-full text-center text-on-surface-variant py-8">${translate("achievements_empty")}</div>`
    );
    return;
  }

  const unlockedCodes = new Set(allAchievements.map((achievement) => achievement.code));
  const items = catalog.length > 0 ? catalog : allAchievements;

  const html = items
    .map((item) => {
      const unlocked = unlockedCodes.has(item.code);
      const translatedAchievement = translateAchievement(item, currentLanguage);
      const achievementName = translatedAchievement.name || item.name || item.code;
      const achievementDescription = translatedAchievement.description || item.description || "";
      if (unlocked) {
        return `
          <div class="flex flex-col items-center text-center group cursor-pointer" title="${escapeHtml(achievementDescription)}">
            <div class="w-16 h-16 md:w-20 md:h-20 rounded-full bg-secondary-container p-1 shadow-[0_8px_24px_rgba(46,47,45,0.06)] group-hover:scale-105 transition-transform flex items-center justify-center">
              <span class="material-symbols-outlined text-on-secondary-container text-3xl" style="font-variation-settings: 'FILL' 1;">emoji_events</span>
            </div>
            <span class="text-xs font-bold text-on-surface mt-2 leading-tight">${escapeHtml(achievementName)}</span>
          </div>
        `;
      }

      return `
        <div class="flex flex-col items-center text-center opacity-50 grayscale group cursor-pointer" title="${escapeHtml(achievementDescription)}">
          <div class="w-16 h-16 md:w-20 md:h-20 rounded-full bg-surface-container-highest p-1 border-2 border-dashed border-outline flex items-center justify-center">
            <span class="material-symbols-outlined text-outline">lock</span>
          </div>
          <span class="text-xs font-bold text-on-surface mt-2 leading-tight">${escapeHtml(achievementName)}</span>
        </div>
      `;
    })
    .join("");

  setHtml(elements.achievementsGrid, html);
}

function buildPeriodMetaMap(bootstrap) {
  const periods = bootstrap?.periods || [];
  return new Map(
    periods.map((period) => [
      period.code,
      {
        yearLabel: period.year_label,
        title: period.title,
      },
    ])
  );
}

function getPeriodDisplay(periodCode, periodMeta) {
  const meta = periodMeta.get(periodCode);
  if (!meta) {
    return periodCode;
  }
  return `${meta.yearLabel} — ${meta.title}`;
}

function formatCompletedAt(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const locale = {
    ru: "ru-RU",
    en: "en-US",
    kk: "kk-KZ",
  }[currentLanguage] || "ru-RU";

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function calculateProfileAccuracy(progress) {
  const backendAccuracy = Number(progress?.overall_accuracy_percent ?? 0);
  const cityProgress = Array.isArray(progress?.city_progress) ? progress.city_progress : [];
  const attemptedItems = cityProgress.filter(
    (item) => (Number(item?.total_attempts ?? 0) > 0 || Number(item?.best_score ?? 0) > 0) && item.city !== "ЕНТ"
  );

  if (attemptedItems.length === 0) {
    return backendAccuracy;
  }

  const derivedAccuracy = Math.round(
    attemptedItems.reduce((sum, item) => sum + Number(item?.best_score ?? 0), 0) /
      attemptedItems.length
  );

  return Math.max(backendAccuracy, derivedAccuracy);
}

function getRecentResultVisual(item) {
  if ((item.best_score ?? 0) >= 100) {
    return {
      icon: "workspace_premium",
      iconClasses: "bg-secondary-container text-on-secondary-container",
      status: translate("status_perfect"),
    };
  }

  if ((item.passed_count ?? 0) > 0) {
    return {
      icon: "task_alt",
      iconClasses: "bg-primary-container text-on-primary-container",
      status: translate("status_passed"),
    };
  }

  return {
    icon: "history_edu",
    iconClasses: "bg-surface-container-high text-on-surface-variant",
    status: translate("status_attempted"),
  };
}

function renderRecentResults(progress, bootstrap) {
  const cityProgress = progress?.city_progress || [];
  const recent = cityProgress
    .filter((item) => item.last_completed_at && item.city !== "ЕНТ")
    .sort((left, right) => (right.last_completed_at || "").localeCompare(left.last_completed_at || ""));

  if (recent.length === 0) {
    setHtml(
      elements.recentResults,
      `<div class="bg-surface-container-lowest rounded-xl p-4 text-on-surface-variant text-sm">${translate("recent_empty")}</div>`
    );
    return;
  }

  const periodMeta = buildPeriodMetaMap(bootstrap);

  const labelAttempts = translate("attempts");
  const labelLastActivity = translate("last_activity");

  const html = recent
    .map((item) => {
      const visual = getRecentResultVisual(item);
      const formattedDate = formatCompletedAt(item.last_completed_at);
      const cityName = getLocalizedCityName(item.city, currentLanguage);
      return `
        <div class="bg-surface-container-lowest rounded-xl p-4 flex items-start gap-4 shadow-[0_8px_24px_rgba(46,47,45,0.06)] border border-outline-variant/15">
          <div class="${visual.iconClasses} p-2.5 rounded-full flex-shrink-0">
            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">${visual.icon}</span>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h3 class="font-bold text-on-surface text-sm leading-tight">${escapeHtml(cityName)}</h3>
                <p class="mt-1 text-xs text-on-surface-variant leading-tight">${escapeHtml(getPeriodDisplay(item.period_code, periodMeta))}</p>
              </div>
              <span class="shrink-0 rounded-full bg-surface-container-low px-2.5 py-1 text-[11px] font-bold text-primary">${item.best_score}%</span>
            </div>
            <p class="mt-2 text-xs text-on-surface-variant">${escapeHtml(visual.status)}</p>
            <div class="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-on-surface-variant">
              <span class="rounded-full bg-surface-container-low px-2.5 py-1">${labelAttempts}: ${item.total_attempts}</span>
              ${
                formattedDate
                  ? `<span class="rounded-full bg-surface-container-low px-2.5 py-1">${labelLastActivity}: ${escapeHtml(formattedDate)}</span>`
                  : ""
              }
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  setHtml(elements.recentResults, html);
}

function getVisibleEntQuestion(question) {
  const localized = question?.translations?.[currentLanguage] || question?.translations?.ru;
  return {
    question: localized?.question || question?.question || "",
    options: localized?.options || question?.options || [],
  };
}

function closeEntAttemptReview() {
  state.entAttemptDetail = null;
  setVisible(elements.entReviewModal, false);
  elements.entReviewModal.classList.remove("flex");
}

function showEntAttemptReviewShell() {
  setText(elements.entReviewTitle, translate("ent_review_title"));
  setText(elements.entReviewSummary, "");
  setHtml(
    elements.entReviewContent,
    `<div class="bg-surface-container-low rounded-2xl p-5 text-on-surface-variant text-sm font-bold">${translate("ent_review_loading")}</div>`
  );
  elements.entReviewModal.classList.remove("hidden");
  elements.entReviewModal.classList.add("flex");
}

function renderEntAttemptDetail() {
  const detail = state.entAttemptDetail;
  if (!detail) {
    return;
  }

  const totalQuestions = Number(detail.total_questions ?? 0);
  const correctAnswers = Number(detail.correct_answers ?? 0);
  const scorePercent = Number(detail.score_percent ?? 0);
  const formattedDate = formatCompletedAt(detail.completed_at);
  const status = detail.passed ? translate("passed") : translate("failed");

  setText(elements.entReviewTitle, translate("ent_review_title"));
  setText(
    elements.entReviewSummary,
    `${translate("correct")}: ${correctAnswers} / ${totalQuestions} • ${scorePercent}% • ${status}${formattedDate ? ` • ${formattedDate}` : ""}`
  );

  const labelCorrectAnswer = translate("ent_review_correct_answer");
  const labelYourAnswer = translate("ent_review_your_answer");
  const labelNoAnswer = translate("ent_review_no_answer");
  const letters = ["A", "B", "C", "D"];
  const questions = Array.isArray(detail.questions) ? detail.questions : [];

  const html = questions
    .map((question, index) => {
      const visible = getVisibleEntQuestion(question);
      const selectedIndex =
        question.selected_index === null || question.selected_index === undefined
          ? null
          : Number(question.selected_index);
      const correctIndex = Number(question.correct_index);
      const selectedText = selectedIndex === null
        ? labelNoAnswer
        : visible.options[selectedIndex] || labelNoAnswer;
      const correctText = visible.options[correctIndex] || "";
      const isCorrect = Boolean(question.is_correct);

      const optionsHtml = visible.options
        .map((option, optionIndex) => {
          const isSelected = selectedIndex === optionIndex;
          const isRight = correctIndex === optionIndex;
          const style = isRight
            ? "border-primary/30 bg-primary/10 text-on-surface"
            : isSelected
              ? "border-error/30 bg-error-container/10 text-on-surface"
              : "border-outline/10 bg-surface-container-lowest text-on-surface-variant";
          const icon = isRight ? "check_circle" : isSelected ? "cancel" : "radio_button_unchecked";
          return `
            <div class="flex items-start gap-3 rounded-2xl border ${style} p-3">
              <span class="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-white/70 text-xs font-black flex items-center justify-center">${letters[optionIndex] || ""}</span>
              <span class="flex-1 text-sm font-bold leading-relaxed">${escapeHtml(option)}</span>
              <span class="material-symbols-outlined text-lg ${isRight ? "text-primary" : isSelected ? "text-error" : "text-outline-variant"}">${icon}</span>
            </div>
          `;
        })
        .join("");

      return `
        <article class="rounded-3xl bg-surface-container-low p-5 border ${isCorrect ? "border-primary/15" : "border-error/15"}">
          <div class="flex items-start justify-between gap-4 mb-4">
            <div>
              <p class="text-[11px] font-black uppercase tracking-widest text-on-surface-variant mb-2">${escapeHtml(translate("ent_review_question", { current: index + 1, total: questions.length }))}</p>
              <h4 class="text-lg font-black text-on-surface leading-snug">${escapeHtml(visible.question)}</h4>
            </div>
            <span class="shrink-0 rounded-full px-3 py-1 text-xs font-black ${isCorrect ? "bg-primary text-on-primary" : "bg-error-container/20 text-error"}">${escapeHtml(isCorrect ? translate("passed") : translate("failed"))}</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">${optionsHtml}</div>
          <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-bold text-on-surface-variant">
            <div class="rounded-2xl bg-surface-container-lowest p-3">${labelYourAnswer}: ${escapeHtml(selectedText)}</div>
            <div class="rounded-2xl bg-surface-container-lowest p-3">${labelCorrectAnswer}: ${escapeHtml(correctText)}</div>
          </div>
        </article>
      `;
    })
    .join("");

  setHtml(
    elements.entReviewContent,
    html || `<div class="bg-surface-container-low rounded-2xl p-5 text-on-surface-variant text-sm font-bold">${translate("ent_review_error")}</div>`
  );
}

async function openEntAttemptReview(attemptId) {
  const playerId = getProfilePlayerId();
  if (!playerId || !attemptId) {
    return;
  }

  showEntAttemptReviewShell();
  try {
    state.entAttemptDetail = await api.getEntAttemptDetail(playerId, attemptId);
    renderEntAttemptDetail();
  } catch (error) {
    state.entAttemptDetail = null;
    setText(elements.entReviewSummary, "");
    setHtml(
      elements.entReviewContent,
      `<div class="bg-error-container/10 rounded-2xl p-5 text-error text-sm font-bold">${translate("ent_review_error")}</div>`
    );
  }
}

function renderEntResults(progress) {
  const attempts = Array.isArray(progress?.ent_attempts) ? progress.ent_attempts : [];
  const fallbackCityProgress = progress?.city_progress || [];
  const ent = attempts.length > 0
    ? attempts
    : fallbackCityProgress
        .filter((item) => item.city === "ЕНТ" && item.last_completed_at)
        .sort((left, right) => (right.last_completed_at || "").localeCompare(left.last_completed_at || ""))
        .map((item, index) => ({
          id: index + 1,
          total_questions: 100,
          correct_answers: item.best_score,
          score_percent: item.best_score,
          passed: (item.passed_count ?? 0) > 0,
          completed_at: item.last_completed_at,
          has_details: false,
        }));

  if (ent.length === 0) {
    setHtml(
      elements.entResults,
      `<div class="bg-surface-container-low rounded-xl p-4 text-on-surface-variant text-sm">${translate("ent_empty")}</div>`
    );
    return;
  }

  const labelEntPrep = translate("ent_test_subtitle");
  const labelCorrect = translate("correct");
  const labelDate = translate("date");
  const html = ent
    .map((item, index) => {
      const formattedDate = formatCompletedAt(item.completed_at);
      const scorePercent = Number(item.score_percent ?? 0);
      const correctAnswers = Number(item.correct_answers ?? 0);
      const totalQuestions = Number(item.total_questions ?? 0);
      const status = item.passed ? translate("passed") : translate("failed");
      const canReview = item.has_details !== false && item.id;
      return `
        <div class="bg-surface-container-low rounded-xl p-4 flex items-start gap-4 border border-tertiary/10">
          <div class="bg-tertiary-container text-on-tertiary-container w-16 h-16 rounded-full flex-shrink-0 flex items-center justify-center">
            <span class="material-symbols-outlined text-[32px] leading-none block" style="font-variation-settings: 'FILL' 1;">school</span>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h3 class="font-bold text-on-surface text-sm leading-tight">${escapeHtml(translate("ent_test_label", { number: ent.length - index }))}</h3>
                <p class="mt-1 text-[11px] text-on-surface-variant leading-tight">${labelEntPrep}</p>
              </div>
              <span class="shrink-0 rounded-full bg-tertiary text-on-tertiary px-2.5 py-1 text-[11px] font-bold">${scorePercent}%</span>
            </div>
            <div class="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-on-surface-variant">
              <span class="rounded-full bg-surface-container-lowest px-2.5 py-1">${labelCorrect}: ${correctAnswers} / ${totalQuestions}</span>
              <span class="rounded-full bg-surface-container-lowest px-2.5 py-1">${escapeHtml(status)}</span>
              ${
                formattedDate
                  ? `<span class="rounded-full bg-surface-container-lowest px-2.5 py-1">${labelDate}: ${escapeHtml(formattedDate)}</span>`
                  : ""
              }
            </div>
            ${
              canReview
                ? `<button type="button" class="mt-3 inline-flex items-center gap-2 rounded-full bg-primary text-on-primary px-4 py-2 text-xs font-black hover:scale-[1.02] active:scale-95 transition-all" data-ent-attempt-review="${escapeHtml(item.id)}">
                    <span class="material-symbols-outlined text-base">fact_check</span>
                    <span>${escapeHtml(translate("ent_review_open"))}</span>
                  </button>`
                : ""
            }
          </div>
        </div>
      `;
    })
    .join("");

  setHtml(elements.entResults, html);
}

function bindEvents() {
  elements.logoutButton.addEventListener("click", () => {
    localStorage.removeItem(USER_KEY);
    clearStoredPlayerId();
    window.location.href = "../registration/code.html";
  });
  elements.entResults.addEventListener("click", (event) => {
    const reviewButton = event.target.closest("[data-ent-attempt-review]");
    if (!reviewButton) return;
    openEntAttemptReview(reviewButton.dataset.entAttemptReview);
  });
  elements.entReviewClose.addEventListener("click", closeEntAttemptReview);
  elements.entReviewModal.addEventListener("click", (event) => {
    if (event.target === elements.entReviewModal) {
      closeEntAttemptReview();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.entReviewModal.classList.contains("hidden")) {
      closeEntAttemptReview();
    }
  });
  bindAvatarEvents();
}

function renderProfileData({ bootstrap, progress, achievements, catalog }) {
  const totalQuestCities =
    bootstrap?.periods?.reduce((sum, period) => sum + (period.total_cities ?? 0), 0) ?? 0;
  const passedQuestCities =
    bootstrap?.periods?.reduce((sum, period) => sum + (period.passed_cities ?? 0), 0) ?? 0;
  const unlockedAchievements = achievements?.achievements?.length ?? 0;
  const totalCatalogAchievements = catalog?.achievements?.length ?? 0;
  const accuracy = calculateProfileAccuracy(progress);
  const totalScore = progress?.city_progress
    ?.filter((item) => item.city !== "ЕНТ")
    ?.reduce((sum, item) => sum + item.best_score, 0) ?? 0;

  setText(elements.score, `${totalScore}`);
  setText(elements.tests, `${passedQuestCities} / ${totalQuestCities}`);
  setText(
    elements.achievementsCount,
    totalCatalogAchievements > 0
      ? `${unlockedAchievements} / ${totalCatalogAchievements}`
      : String(unlockedAchievements)
  );
  setText(elements.accuracy, `${accuracy}`);

  renderAchievements(achievements, catalog);
  renderRecentResults(progress, bootstrap);
  renderEntResults(progress);
}

async function init() {
  mountLanguageMenu({
    onChange: (language) => {
      currentLanguage = language;
      applyStaticTranslations();
      refreshProfileUI();
      renderEntAttemptDetail();
      renderAvatarSelection();
    },
  });
  state.user = requireAuth();
  if (!state.user) {
    return;
  }
  state.user = (await reconcileStoredAuthUser()) || state.user;

  cacheElements();
  applyStaticTranslations();
  bindEvents();
  renderStoredAvatar();
  renderAvatarSelection();
  renderAvatarEditor();

  try {
    const playerId = getProfilePlayerId();
    const [bootstrap, progress, achievements, catalog] = await Promise.all([
      api.getBootstrap(playerId),
      api.getProgress(playerId),
      api.getAchievements(playerId),
      api.getAchievementCatalog(),
    ]);

    lastProfileData = { bootstrap, progress, achievements, catalog };
    setText(elements.username, state.user.username);
    setText(elements.email, state.user.email);
    renderProfileData(lastProfileData);
  } catch (error) {
    showProfileError(translate("profile_load_error"));
  }
}

let lastProfileData = null;

async function refreshProfileUI() {
  if (!lastProfileData) return;
  renderProfileData(lastProfileData);
}

init();
