(function () {
  const storageKey = "sapar-language";
  const supportedLanguages = new Set(["ru", "en", "kk"]);
  let language = "ru";

  try {
    const saved = window.localStorage.getItem(storageKey);
    if (supportedLanguages.has(saved)) {
      language = saved;
    }
  } catch {
    language = "ru";
  }

  document.documentElement.lang = language;

  if (language !== "ru") {
    document.documentElement.dataset.saparLangPending = "1";

    const style = document.createElement("style");
    style.textContent = 'html[data-sapar-lang-pending="1"] body{opacity:0}';
    document.head.appendChild(style);
  }

  window.saparMarkLanguageReady = function () {
    delete document.documentElement.dataset.saparLangPending;
  };

  window.setTimeout(window.saparMarkLanguageReady, 2500);
})();
