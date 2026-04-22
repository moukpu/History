const LANGUAGE_STORAGE_KEY = "sapar-language";
const SUPPORTED_LANGUAGES = new Set(["ru", "en", "kk"]);

const LANGUAGE_LABELS = {
  ru: "Русский",
  en: "English",
  kk: "Қазақша",
};

const LANGUAGE_OPTIONS = [
  { code: "ru", shortLabel: "RU", label: "Русский" },
  { code: "en", shortLabel: "EN", label: "English" },
  { code: "kk", shortLabel: "KZ", label: "Қазақша" },
];

const listeners = new Set();
let isMounted = false;

export function getCurrentLanguage() {
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (SUPPORTED_LANGUAGES.has(saved)) {
      return saved;
    }
  } catch {
    return "ru";
  }

  return "ru";
}

export function setCurrentLanguage(language) {
  if (!SUPPORTED_LANGUAGES.has(language)) return;

  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Keep the page-level switch working even if storage is unavailable.
  }

  updateLanguageMenu(language);
  window.dispatchEvent(new CustomEvent("sapar-language-change", { detail: { language } }));

  for (const listener of listeners) {
    listener(language);
  }
}

export function markLanguageReady() {
  if (typeof window.saparMarkLanguageReady === "function") {
    window.saparMarkLanguageReady();
    return;
  }

  delete document.documentElement.dataset.saparLangPending;
}

export function mountLanguageMenu({ onChange } = {}) {
  if (typeof onChange === "function") {
    listeners.add(onChange);
  }

  if (!document.body) return;

  let menu = document.querySelector("[data-language-menu]");
  if (!menu) {
    const host = findLanguageHost();
    if (!host) return;

    menu = createLanguageMenu();
    host.prepend(menu);
  }

  if (!isMounted) {
    bindLanguageMenuEvents();
    isMounted = true;
  }

  updateLanguageMenu(getCurrentLanguage());
}

function findLanguageHost() {
  const navHost = document.querySelector("nav .ml-auto");
  if (navHost) return navHost;

  const registrationHost = document.querySelector("header .flex.justify-between.items-center > .flex.items-center.gap-4");
  if (registrationHost) return registrationHost;

  const quizHeaderHosts = document.querySelectorAll("main > header .flex.items-center.gap-4");
  if (quizHeaderHosts.length > 0) {
    return quizHeaderHosts[quizHeaderHosts.length - 1];
  }

  const nav = document.querySelector("nav");
  if (nav) return nav;

  const header = document.querySelector("header");
  return header || null;
}

function createLanguageMenu() {
  const wrapper = document.createElement("div");
  wrapper.className = "relative";
  wrapper.dataset.languageMenu = "";
  wrapper.innerHTML = `
    <button type="button" data-language-toggle aria-haspopup="true" aria-expanded="false" class="h-11 min-w-[7.75rem] rounded-full border border-outline-variant/30 bg-white/95 px-4 shadow-[0_10px_24px_rgba(46,47,45,0.08)] hover:border-primary/45 hover:bg-primary-container/20 transition-all flex items-center justify-between gap-2">
      <span data-language-current class="text-sm font-black text-on-surface">Русский</span>
      <span class="material-symbols-outlined text-primary text-[20px] transition-transform" data-language-arrow>expand_more</span>
    </button>
    <div data-language-options class="hidden absolute right-0 top-full mt-2 z-[70] w-52 rounded-2xl border border-outline-variant/20 bg-white p-2 shadow-[0_24px_56px_rgba(46,47,45,0.18)]">
      ${LANGUAGE_OPTIONS.map(
        (option) => `
          <button type="button" data-language-option="${option.code}" class="w-full rounded-xl px-3 py-3 text-left transition-colors hover:bg-surface-container-low flex items-center gap-3">
            <span class="h-8 w-8 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center">${option.shortLabel}</span>
            <span class="flex-1 text-sm font-black text-on-surface">${option.label}</span>
            <span data-language-check class="material-symbols-outlined text-primary text-[18px] opacity-0">check</span>
          </button>`
      ).join("")}
    </div>
  `;

  return wrapper;
}

function bindLanguageMenuEvents() {
  document.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-language-toggle]");
    if (toggle) {
      event.stopPropagation();
      toggleLanguageMenu();
      return;
    }

    const option = event.target.closest("[data-language-option]");
    if (option) {
      event.stopPropagation();
      const language = option.dataset.languageOption;
      setCurrentLanguage(language);
      closeLanguageMenu();
      return;
    }

    if (!event.target.closest("[data-language-menu]")) {
      closeLanguageMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeLanguageMenu();
    }
  });
}

function toggleLanguageMenu() {
  const options = document.querySelector("[data-language-options]");
  const toggle = document.querySelector("[data-language-toggle]");
  const arrow = document.querySelector("[data-language-arrow]");
  if (!options || !toggle) return;

  const isOpening = options.classList.contains("hidden");
  options.classList.toggle("hidden", !isOpening);
  toggle.setAttribute("aria-expanded", String(isOpening));
  arrow?.classList.toggle("rotate-180", isOpening);
}

function closeLanguageMenu() {
  const options = document.querySelector("[data-language-options]");
  const toggle = document.querySelector("[data-language-toggle]");
  const arrow = document.querySelector("[data-language-arrow]");
  if (!options || !toggle) return;

  options.classList.add("hidden");
  toggle.setAttribute("aria-expanded", "false");
  arrow?.classList.remove("rotate-180");
}

function updateLanguageMenu(language) {
  document.documentElement.lang = language;

  const currentLabel = document.querySelector("[data-language-current]");
  if (currentLabel) {
    currentLabel.textContent = LANGUAGE_LABELS[language] || LANGUAGE_LABELS.ru;
  }

  document.querySelectorAll("[data-language-option]").forEach((option) => {
    const active = option.dataset.languageOption === language;
    option.style.backgroundColor = active ? "rgba(82, 242, 245, 0.28)" : "";
    option.setAttribute("aria-pressed", String(active));
    option.querySelector("[data-language-check]")?.classList.toggle("opacity-0", !active);
  });
}
