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
