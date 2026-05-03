// Side-effect module: bootstraps a single global toast UI that surfaces
// network/5xx errors that pages don't handle locally. api.js dispatches
// `sapar:api-error` CustomEvents; this module listens and renders.
//
// Pages keep handling their own 4xx errors locally (form validation, login
// failures, etc.) because those need contextual UI, not a generic toast.

const TOAST_EVENT = "sapar:api-error";
const TOAST_AUTO_DISMISS_MS = 5000;
const TOAST_DEDUP_WINDOW_MS = 1500;

let containerEl = null;
let lastMessage = "";
let lastShownAt = 0;

function ensureContainer() {
  if (typeof document === "undefined") return null;
  if (containerEl && document.body.contains(containerEl)) return containerEl;

  containerEl = document.createElement("div");
  containerEl.id = "sapar-error-toast-stack";
  containerEl.setAttribute("role", "status");
  containerEl.setAttribute("aria-live", "polite");
  containerEl.style.cssText = [
    "position:fixed",
    "bottom:1rem",
    "left:50%",
    "transform:translateX(-50%)",
    "display:flex",
    "flex-direction:column",
    "gap:0.5rem",
    "z-index:2147483646",
    "pointer-events:none",
    "max-width:min(28rem, calc(100vw - 2rem))",
    "width:max-content",
  ].join(";");

  if (document.body) {
    document.body.appendChild(containerEl);
  } else {
    document.addEventListener(
      "DOMContentLoaded",
      () => document.body.appendChild(containerEl),
      { once: true },
    );
  }
  return containerEl;
}

function renderToast(message) {
  const container = ensureContainer();
  if (!container) return;

  const toast = document.createElement("div");
  toast.style.cssText = [
    "background:#7f1d1d",
    "color:#fef2f2",
    "border:1px solid #b91c1c",
    "border-radius:0.75rem",
    "padding:0.75rem 1rem",
    "font:500 0.875rem/1.4 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif",
    "box-shadow:0 10px 30px -10px rgba(0,0,0,0.4)",
    "pointer-events:auto",
    "transition:opacity 0.25s ease, transform 0.25s ease",
    "opacity:0",
    "transform:translateY(0.5rem)",
  ].join(";");
  toast.textContent = message;

  const dismiss = () => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(0.5rem)";
    globalThis.setTimeout(() => toast.remove(), 300);
  };
  toast.addEventListener("click", dismiss);

  container.appendChild(toast);
  // Trigger CSS transition.
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });

  globalThis.setTimeout(dismiss, TOAST_AUTO_DISMISS_MS);
}

function handleApiError(event) {
  const detail = event && event.detail;
  const rawMessage =
    detail && typeof detail.message === "string" ? detail.message.trim() : "";
  const message = rawMessage || "Сервер недоступен. Попробуйте чуть позже.";

  // Suppress identical bursts (e.g. multiple parallel failed requests).
  const now = Date.now();
  if (
    message === lastMessage &&
    now - lastShownAt < TOAST_DEDUP_WINDOW_MS
  ) {
    return;
  }
  lastMessage = message;
  lastShownAt = now;

  renderToast(message);
}

if (typeof window !== "undefined") {
  // Idempotent: re-importing this module won't double-register.
  if (!window.__saparErrorToastInstalled) {
    window.__saparErrorToastInstalled = true;
    window.addEventListener(TOAST_EVENT, handleApiError);
  }
}

export const TOAST_ERROR_EVENT = TOAST_EVENT;
