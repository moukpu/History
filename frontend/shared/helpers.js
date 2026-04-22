export function getErrorMessage(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Не удалось загрузить данные.";
}

export function clamp(number, min, max) {
  return Math.min(max, Math.max(min, number));
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function createElementFromHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

export function setText(element, value) {
  if (element) {
    element.textContent = value ?? "";
  }
}

export function setHtml(element, value) {
  if (element) {
    element.innerHTML = value ?? "";
  }
}

export function setVisible(element, visible) {
  if (!element) {
    return;
  }

  element.classList.toggle("hidden", !visible);
}

export function formatPercent(value) {
  return `${Number.isFinite(value) ? value : 0}%`;
}

export function protectQuizContent(selectors) {
  const protectedSelectors = Array.isArray(selectors) ? selectors : [selectors];
  const isProtectedTarget = (target) =>
    target instanceof Element &&
    protectedSelectors.some((selector) => target.closest(selector));

  const blockEvent = (event) => {
    if (isProtectedTarget(event.target)) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  ["copy", "cut", "contextmenu", "selectstart", "dragstart"].forEach((type) => {
    document.addEventListener(type, blockEvent, true);
  });

  document.addEventListener(
    "keydown",
    (event) => {
      if (!isProtectedTarget(event.target) || !(event.ctrlKey || event.metaKey)) {
        return;
      }

      if (["a", "c", "x", "p", "s"].includes(event.key.toLowerCase())) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    true
  );

  protectedSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((element) => {
      element.classList.add("quiz-copy-protected");
      element.setAttribute("draggable", "false");
    });
  });
}
