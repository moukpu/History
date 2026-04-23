import { getApiBaseUrl } from "./config.js";
import { clearStoredPlayerId, reconcileStoredAuthUser, setStoredPlayerId } from "./storage.js?v=20260423d";
import { getCurrentLanguage, markLanguageReady, mountLanguageMenu } from "./language.js";

const USER_KEY = "sapar-user";
const AVATAR_STORAGE_KEY = "sapar-avatar-by-user";
const ALLOWED_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "mail.com",
  "email.com",
  "usa.com",
  "post.com",
  "mail.ru",
  "inbox.ru",
  "list.ru",
  "bk.ru",
  "yandex.ru",
  "yandex.com",
  "ya.ru",
  "proton.me",
  "protonmail.com",
]);

const translations = {
  ru: {
    page_title: "Sapar Quest - Регистрация",
    nav_auth: "Регистрация",
    hero_register_title: "Присоединяйся!",
    hero_register_subtitle: "Создай профиль исследователя и начни путешествие.",
    hero_login_title: "С возвращением!",
    hero_login_subtitle: "Войди в профиль и продолжи исторический квест.",
    label_username: "Имя исследователя",
    label_email: "Почта",
    label_password: "Пароль",
    placeholder_username: "Как тебя называть?",
    placeholder_email: "email@example.com",
    placeholder_password: "Минимум 4 символа",
    placeholder_login_password: "Ваш пароль",
    register_button: "Начать путешествие!",
    login_button: "Войти",
    have_account: "Уже есть аккаунт?",
    no_account: "Нет аккаунта?",
    switch_login: "Войти",
    switch_register: "Зарегистрироваться",
    google_hint: "или продолжить через Google",
    google_button: "Войти через Google",
    google_not_configured: "Вход через Google пока не настроен. Попробуйте обычный вход или регистрацию.",
    google_error: "Не удалось войти через Google.",
    duplicate_email: "Аккаунт с этой почтой уже существует. Войдите в аккаунт.",
    duplicate_username: "Имя пользователя уже занято.",
    invalid_credentials: "Неверная почта или пароль.",
    invalid_email: "Введите корректную почту.",
    invalid_email_domain:
      "Почта указана неправильно. Используйте популярный домен: gmail.com, mail.com, outlook.com, yahoo.com, icloud.com, mail.ru, yandex.ru или proton.me.",
    invalid_username: "Имя должно быть не короче 2 символов.",
    invalid_password: "Пароль должен быть не короче 4 символов.",
    validation_error: "Проверьте введенные данные.",
    network_error: "Не удалось связаться с сервисом. Попробуйте обновить страницу чуть позже.",
    error_status: ({ status }) => `Ошибка ${status}.`,
  },
  en: {
    page_title: "Sapar Quest - Sign up",
    nav_auth: "Sign up",
    hero_register_title: "Join the journey!",
    hero_register_subtitle: "Create an explorer profile and start your trip.",
    hero_login_title: "Welcome back!",
    hero_login_subtitle: "Sign in and continue your historical quest.",
    label_username: "Explorer name",
    label_email: "Email",
    label_password: "Password",
    placeholder_username: "What should we call you?",
    placeholder_email: "email@example.com",
    placeholder_password: "At least 4 characters",
    placeholder_login_password: "Your password",
    register_button: "Start the journey!",
    login_button: "Sign in",
    have_account: "Already have an account?",
    no_account: "No account yet?",
    switch_login: "Sign in",
    switch_register: "Sign up",
    google_hint: "or continue with Google",
    google_button: "Sign in with Google",
    google_not_configured: "Google sign-in is not configured yet. Use regular sign-in or registration for now.",
    google_error: "Could not sign in with Google.",
    duplicate_email: "An account with this email already exists. Sign in instead.",
    duplicate_username: "This username is already taken.",
    invalid_credentials: "Incorrect email or password.",
    invalid_email: "Enter a valid email address.",
    invalid_email_domain:
      "The email address looks incorrect. Use a common domain: gmail.com, mail.com, outlook.com, yahoo.com, icloud.com, mail.ru, yandex.ru, or proton.me.",
    invalid_username: "The name must be at least 2 characters long.",
    invalid_password: "The password must be at least 4 characters long.",
    validation_error: "Check the entered data.",
    network_error: "Could not reach the service. Try refreshing the page later.",
    error_status: ({ status }) => `Error ${status}.`,
  },
  kk: {
    page_title: "Sapar Quest - Тіркелу",
    nav_auth: "Тіркелу",
    hero_register_title: "Сапарға қосыл!",
    hero_register_subtitle: "Зерттеуші профилін құрып, саяхатты баста.",
    hero_login_title: "Қайта қош келдің!",
    hero_login_subtitle: "Профильге кіріп, тарихи квестті жалғастыр.",
    label_username: "Зерттеуші аты",
    label_email: "Пошта",
    label_password: "Құпиясөз",
    placeholder_username: "Сені қалай атаймыз?",
    placeholder_email: "email@example.com",
    placeholder_password: "Кемінде 4 таңба",
    placeholder_login_password: "Құпиясөзіңіз",
    register_button: "Саяхатты бастау!",
    login_button: "Кіру",
    have_account: "Аккаунтыңыз бар ма?",
    no_account: "Аккаунтыңыз жоқ па?",
    switch_login: "Кіру",
    switch_register: "Тіркелу",
    google_hint: "немесе Google арқылы жалғастыру",
    google_button: "Google арқылы кіру",
    google_not_configured: "Google арқылы кіру әлі бапталмаған. Әзірге кәдімгі кіруді немесе тіркелуді қолданыңыз.",
    google_error: "Google арқылы кіру мүмкін болмады.",
    duplicate_email: "Бұл поштаға аккаунт бұрыннан бар. Аккаунтқа кіріңіз.",
    duplicate_username: "Бұл пайдаланушы аты бос емес.",
    invalid_credentials: "Пошта немесе құпиясөз қате.",
    invalid_email: "Дұрыс пошта енгізіңіз.",
    invalid_email_domain:
      "Пошта қате сияқты. Кең таралған доменді қолданыңыз: gmail.com, mail.com, outlook.com, yahoo.com, icloud.com, mail.ru, yandex.ru немесе proton.me.",
    invalid_username: "Аты кемінде 2 таңбадан тұруы керек.",
    invalid_password: "Құпиясөз кемінде 4 таңбадан тұруы керек.",
    validation_error: "Енгізілген деректерді тексеріңіз.",
    network_error: "Қызметке қосылу мүмкін болмады. Бетті кейінірек жаңартып көріңіз.",
    error_status: ({ status }) => `Қате ${status}.`,
  },
};

let currentLanguage = getCurrentLanguage();
let activeMode = "register";
let googleScriptPromise = null;

class ApiRequestError extends Error {
  constructor(status, detail) {
    super(detail || "");
    this.name = "ApiRequestError";
    this.status = status;
    this.detail = detail || "";
  }
}

function translate(key, params = {}) {
  const value = translations[currentLanguage]?.[key] ?? translations.ru[key] ?? key;
  return typeof value === "function" ? value(params) : value;
}

function isAllowedEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  const atIndex = normalized.lastIndexOf("@");
  if (atIndex <= 0 || atIndex === normalized.length - 1) {
    return false;
  }

  return ALLOWED_EMAIL_DOMAINS.has(normalized.slice(atIndex + 1));
}

function translateApiError(error, fallbackKey = "validation_error") {
  if (!(error instanceof ApiRequestError)) {
    return translate("network_error");
  }

  const detail = String(error.detail || "").toLowerCase();

  if (error.status === 409 && (detail.includes("почт") || detail.includes("email"))) {
    return translate("duplicate_email");
  }

  if (error.status === 409 && (detail.includes("имя") || detail.includes("username"))) {
    return translate("duplicate_username");
  }

  if (error.status === 401) {
    return translate("invalid_credentials");
  }

  if (error.status === 422) {
    if (detail.includes("common email domain") || detail.includes("gmail.com")) {
      return translate("invalid_email_domain");
    }
    if (detail.includes("email")) return translate("invalid_email");
    if (detail.includes("username")) return translate("invalid_username");
    if (detail.includes("password")) return translate("invalid_password");
    return translate("validation_error");
  }

  if (error.status === 503 && detail.includes("google")) {
    return translate("google_not_configured");
  }

  return error.detail || translate(fallbackKey) || translate("error_status", { status: error.status });
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem(USER_KEY);
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

function storeGoogleAvatar(user) {
  if (!user?.id || !user?.avatar_url) return;

  const current = getStoredAvatarMap();
  current[user.id] = {
    src: user.avatar_url,
    sourceType: "google",
    templateId: null,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(current));
}

function storeUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  setStoredPlayerId(user.id);
  storeGoogleAvatar(user);
}

function clearUser() {
  localStorage.removeItem(USER_KEY);
  clearStoredPlayerId();
}

async function apiPost(path, body) {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const detail = Array.isArray(data.detail)
      ? data.detail.map((item) => item.msg || "").filter(Boolean).join(" ")
      : data.detail;
    throw new ApiRequestError(res.status, detail || translate("error_status", { status: res.status }));
  }

  return data;
}

function showError(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("hidden");
}

function hideError(el) {
  if (!el) return;
  el.classList.add("hidden");
  el.textContent = "";
}

function applyStaticTranslations() {
  document.documentElement.lang = currentLanguage;
  document.title = translate("page_title");

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    if (element.closest("footer")) return;
    element.textContent = translate(element.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.setAttribute("placeholder", translate(element.dataset.i18nPlaceholder));
  });

  const title = document.querySelector("[data-auth-hero-title]");
  const subtitle = document.querySelector("[data-auth-hero-subtitle]");
  if (title) {
    title.textContent = translate(
      activeMode === "login" ? "hero_login_title" : "hero_register_title"
    );
  }
  if (subtitle) {
    subtitle.textContent = translate(
      activeMode === "login" ? "hero_login_subtitle" : "hero_register_subtitle"
    );
  }

  const fallbackGoogleText = document.querySelector("[data-google-fallback-text]");
  if (fallbackGoogleText) {
    fallbackGoogleText.textContent = translate("google_button");
  }

  const googleStatus = document.querySelector("[data-google-status]");
  if (googleStatus && googleStatus.dataset.googleStatusKey) {
    googleStatus.textContent = translate(googleStatus.dataset.googleStatusKey);
  }

  markLanguageReady();
}

function loadGoogleScript() {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }
  if (googleScriptPromise) {
    return googleScriptPromise;
  }

  googleScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return googleScriptPromise;
}

async function handleGoogleCredential(response) {
  const errorTarget =
    activeMode === "login"
      ? document.querySelector("[data-login-error]")
      : document.querySelector("[data-form-error]");

  try {
    if (!response?.credential) {
      throw new Error(translate("google_error"));
    }
    const user = await apiPost("/api/auth/google", {
      credential: response.credential,
    });
    storeUser(user);
    window.location.href = "../home_page/code.html";
  } catch (error) {
    showError(errorTarget, translateApiError(error, "google_error"));
  }
}

async function initGoogleSignIn() {
  const section = document.querySelector("[data-google-section]");
  const button = document.querySelector("[data-google-button]");
  if (!section || !button) return;

  const showFallback = (statusKey = "google_not_configured") => {
    button.innerHTML = `
      <button type="button" disabled class="w-full max-w-xs rounded-full border border-outline-variant/30 bg-white px-5 py-3 text-sm font-bold text-on-surface-variant shadow-sm opacity-75 flex items-center justify-center gap-3 cursor-not-allowed">
        <span class="text-base font-black text-primary">G</span>
        <span data-google-fallback-text>${translate("google_button")}</span>
      </button>
    `;
    const status = document.querySelector("[data-google-status]");
    if (status) {
      status.dataset.googleStatusKey = statusKey;
      status.textContent = translate(statusKey);
      status.classList.remove("hidden");
    }
    section.classList.remove("hidden");
    adjustAuthFormSpacing(true);
  };

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/auth/google/config`, {
      cache: "no-store",
    });
    const config = await response.json();
    if (!config.enabled || !config.client_id) {
      showFallback("google_not_configured");
      return;
    }

    await loadGoogleScript();
    button.innerHTML = "";
    window.google.accounts.id.initialize({
      client_id: config.client_id,
      callback: handleGoogleCredential,
      ux_mode: "popup",
    });
    window.google.accounts.id.renderButton(button, {
      theme: "outline",
      size: "large",
      shape: "pill",
      text: activeMode === "login" ? "signin_with" : "signup_with",
      width: 320,
    });
    const status = document.querySelector("[data-google-status]");
    if (status) {
      status.classList.add("hidden");
      status.textContent = "";
      delete status.dataset.googleStatusKey;
    }
    section.classList.remove("hidden");
    adjustAuthFormSpacing(true);
  } catch {
    showFallback("google_error");
  }
}

function adjustAuthFormSpacing(hasGoogleSection) {
  document.querySelectorAll("[data-register-form], [data-login-form]").forEach((form) => {
    form.classList.toggle("pt-24", !hasGoogleSection);
    form.classList.toggle("pt-8", hasGoogleSection);
  });
}

function setMode(mode) {
  activeMode = mode;
  const registerForm = document.querySelector("[data-register-form]");
  const loginForm = document.querySelector("[data-login-form]");
  const formError = document.querySelector("[data-form-error]");
  const loginError = document.querySelector("[data-login-error]");

  registerForm?.classList.toggle("hidden", mode === "login");
  loginForm?.classList.toggle("hidden", mode !== "login");
  hideError(formError);
  hideError(loginError);
  applyStaticTranslations();
}

async function init() {
  mountLanguageMenu({
    onChange: (language) => {
      currentLanguage = language;
      applyStaticTranslations();
    },
  });

  const user = getStoredUser();
  if (user) {
    await reconcileStoredAuthUser();
    window.location.href = "../home_page/code.html";
    return;
  }

  const registerForm = document.querySelector("[data-register-form]");
  const loginForm = document.querySelector("[data-login-form]");
  const switchToLogin = document.querySelector("[data-switch-to-login]");
  const switchToRegister = document.querySelector("[data-switch-to-register]");
  const formError = document.querySelector("[data-form-error]");
  const loginError = document.querySelector("[data-login-error]");

  applyStaticTranslations();

  switchToLogin?.addEventListener("click", (event) => {
    event.preventDefault();
    setMode("login");
  });

  switchToRegister?.addEventListener("click", (event) => {
    event.preventDefault();
    setMode("register");
  });

  registerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideError(formError);

    const username = registerForm.querySelector('[name="username"]').value.trim();
    const email = registerForm.querySelector('[name="email"]').value.trim();
    const password = registerForm.querySelector('[name="password"]').value;

    if (!isAllowedEmail(email)) {
      showError(formError, translate("invalid_email_domain"));
      return;
    }

    try {
      const user = await apiPost("/api/auth/register", { username, email, password });
      storeUser(user);
      window.location.href = "../home_page/code.html";
    } catch (error) {
      showError(formError, translateApiError(error));
    }
  });

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideError(loginError);

    const email = loginForm.querySelector('[name="email"]').value.trim();
    const password = loginForm.querySelector('[name="password"]').value;

    if (!isAllowedEmail(email)) {
      showError(loginError, translate("invalid_email_domain"));
      return;
    }

    try {
      const user = await apiPost("/api/auth/login", { email, password });
      storeUser(user);
      window.location.href = "../home_page/code.html";
    } catch (error) {
      showError(loginError, translateApiError(error));
    }
  });

  initGoogleSignIn();
}

init().catch((error) => {
  console.error("Auth page failed to initialize", error);
});

export { getStoredUser, storeUser, clearUser };
