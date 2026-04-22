(function () {
  const storageKey = "sapar-language";
  const supportedLanguages = new Set(["ru", "en", "kk"]);
  let language = "ru";

  function isEditableTarget(target) {
    return Boolean(
      target?.closest?.(
        'input, textarea, select, [contenteditable="true"], [data-allow-copy]'
      )
    );
  }

  function installBasicContentProtection() {
    const style = document.createElement("style");
    style.textContent = `
      body.sapar-content-protected,
      body.sapar-content-protected *:not(input):not(textarea):not(select):not([contenteditable="true"]):not([data-allow-copy]) {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        user-select: none;
      }
      body.sapar-content-protected img,
      body.sapar-content-protected svg {
        -webkit-user-drag: none;
        user-drag: none;
      }
    `;
    document.head.appendChild(style);

    const protectBody = () => document.body?.classList.add("sapar-content-protected");
    if (document.body) {
      protectBody();
    } else {
      document.addEventListener("DOMContentLoaded", protectBody, { once: true });
    }

    const blockIfProtected = (event) => {
      if (!isEditableTarget(event.target)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    ["contextmenu", "copy", "cut", "selectstart", "dragstart"].forEach((type) => {
      document.addEventListener(type, blockIfProtected, true);
    });

    document.addEventListener(
      "keydown",
      (event) => {
        const key = event.key.toLowerCase();
        const hasModifier = event.ctrlKey || event.metaKey;
        const devToolsShortcut =
          event.key === "F12" ||
          (hasModifier && event.shiftKey && ["i", "j", "c"].includes(key)) ||
          (hasModifier && key === "u");
        const contentShortcut =
          !isEditableTarget(event.target) &&
          hasModifier &&
          ["a", "c", "x", "s", "p"].includes(key);

        if (devToolsShortcut || contentShortcut) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      true
    );
  }

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

  installBasicContentProtection();

  window.setTimeout(window.saparMarkLanguageReady, 2500);
})();
