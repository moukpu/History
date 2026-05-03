// Side-effect module: injects baseline accessibility CSS once per page.
//
// Why: the project ships a pre-built `tailwind.css` bundle and adding rules
// to it requires rebuilding. We instead inject a tiny stylesheet that:
//
//   1. Restores a clearly visible focus ring on keyboard navigation
//      (browsers strip many of these via Tailwind preflight + MD3 themes).
//   2. Hides the focus ring for mouse/touch users via `:focus-visible`,
//      so we don't add visual noise for sighted clickers.
//   3. Respects `prefers-reduced-motion` for users who set the OS preference.
//
// This is a non-destructive default: existing custom focus styles still win
// because we use a low-specificity selector that browsers fall back to only
// when the page itself does not define one.

const STYLE_ID = "sapar-a11y-baseline";

const CSS = `
/* Keyboard-focus ring (only when focus-visible matches). */
:focus-visible {
  outline: 2px solid #f59e0b;
  outline-offset: 2px;
  border-radius: 4px;
}

/* Suppress the legacy non-keyboard focus ring browsers add by default
   so we don't double up with the focus-visible ring above. */
:focus:not(:focus-visible) {
  outline: none;
}

/* Honour reduced-motion across the app. Individual pages may opt back in
   with their own !important rules if motion is essential. */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
`;

function injectStyle() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;

  // Insert as the FIRST <style> in <head> so page-level CSS keeps priority.
  const target = document.head || document.documentElement;
  if (target.firstChild) {
    target.insertBefore(style, target.firstChild);
  } else {
    target.appendChild(style);
  }
}

if (typeof window !== "undefined" && !window.__saparA11yInstalled) {
  window.__saparA11yInstalled = true;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectStyle, { once: true });
  } else {
    injectStyle();
  }
}
