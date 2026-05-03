import { getApiBaseUrl } from "./config.js";
// Side-effect imports: every page that uses the API gets baseline a11y
// (focus-visible, reduced-motion) and a global toast for 5xx/network errors.
import "./a11y.js";
import { TOAST_ERROR_EVENT } from "./error-toast.js";

const SESSION_CACHE_PREFIX = "sapar-api-cache:";
const REQUEST_TIMEOUT_MS = 20000;

// Auth token is stored as a field on the cached user object in localStorage.
// We read it lazily on each request so a fresh login is picked up without
// needing to reload the page or re-import storage.js (which would create a
// circular dependency between api.js and storage.js).
const AUTH_USER_KEY = "sapar-user";

// Storage keys that hold any reference to the current signed-in user. Wiped on
// a forced logout so a stale browser doesn't keep pretending the user is in.
const AUTH_LOCAL_KEYS = [
  "sapar-user",
  "sapar-user-resolved-at",
  "kazakhstan-timeline-player-id",
];

const AUTH_REDIRECT_PATH = "/registration/code.html";

function readStoredAuthToken() {
  try {
    const raw =
      typeof window !== "undefined" && window.localStorage
        ? window.localStorage.getItem(AUTH_USER_KEY)
        : null;
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    const token =
      parsed && typeof parsed.token === "string" ? parsed.token.trim() : "";
    return token;
  } catch {
    return "";
  }
}

// Forced logout. Called only when the server rejected an authenticated request
// (HTTP 401 on a request that carried a Bearer token), which means the JWT is
// dead -- expired, signed by a previous JWT_SECRET, or referencing a user that
// no longer exists in the database. Clears every per-user key, drops the
// session-storage API cache, and bounces the browser back to the login screen
// so the user gets a fresh start instead of an inconsistent profile.
function forceClientLogout() {
  if (typeof window === "undefined") return;
  try {
    for (const key of AUTH_LOCAL_KEYS) {
      window.localStorage?.removeItem(key);
    }
  } catch {
    // localStorage can be disabled (private mode); cleanup is best-effort.
  }
  try {
    const session = window.sessionStorage;
    if (session) {
      const stale = [];
      for (let i = 0; i < session.length; i += 1) {
        const key = session.key(i);
        if (key && key.startsWith(SESSION_CACHE_PREFIX)) {
          stale.push(key);
        }
      }
      for (const key of stale) {
        session.removeItem(key);
      }
    }
  } catch {
    // ignore session storage failures
  }

  try {
    const here = window.location?.pathname || "";
    if (!here.endsWith(AUTH_REDIRECT_PATH)) {
      window.location.replace(AUTH_REDIRECT_PATH);
    }
  } catch {
    // If navigation fails for any reason, leave the user on the page; the
    // ApiError will still propagate and pages can show their own UI.
  }
}

function emitGlobalApiError(status, message) {
  try {
    if (typeof window === "undefined" || typeof CustomEvent !== "function") {
      return;
    }
    window.dispatchEvent(
      new CustomEvent(TOAST_ERROR_EVENT, {
        detail: { status, message },
      }),
    );
  } catch {
    // Never let toast plumbing break the actual API call.
  }
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function getSessionStorage() {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

function readCachedJson(cacheKey, ttlMs) {
  const storage = getSessionStorage();
  if (!storage || !cacheKey || ttlMs <= 0) {
    return null;
  }

  try {
    const raw = storage.getItem(`${SESSION_CACHE_PREFIX}${cacheKey}`);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached?.savedAt || Date.now() - cached.savedAt > ttlMs) {
      storage.removeItem(`${SESSION_CACHE_PREFIX}${cacheKey}`);
      return null;
    }
    return cached.payload ?? null;
  } catch {
    storage.removeItem(`${SESSION_CACHE_PREFIX}${cacheKey}`);
    return null;
  }
}

function writeCachedJson(cacheKey, payload) {
  const storage = getSessionStorage();
  if (!storage || !cacheKey) {
    return;
  }

  try {
    storage.setItem(
      `${SESSION_CACHE_PREFIX}${cacheKey}`,
      JSON.stringify({ savedAt: Date.now(), payload })
    );
  } catch {
    // Storage can be full or disabled; caching is only an optimization.
  }
}

async function requestJson(path, options = {}) {
  const { cacheTtlMs = 0, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers || {});
  const method = String(fetchOptions.method || "GET").toUpperCase();
  const canSessionCache = method === "GET" && cacheTtlMs > 0;
  const cacheKey = canSessionCache ? `${getApiBaseUrl()}${path}` : "";
  const cached = readCachedJson(cacheKey, cacheTtlMs);
  if (cached !== null) {
    return cached;
  }

  if (fetchOptions.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json; charset=utf-8");
  }

  // Auto-attach the JWT bearer token whenever the user is signed in. Backend
  // endpoints that require ownership (avatar / username / account / minigame
  // completion) verify it; everywhere else it is simply ignored.
  if (!headers.has("Authorization")) {
    const token = readStoredAuthToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }
  // Track whether this particular request actually carried a Bearer token. We
  // need this below: a 401 on a token-carrying request means "your session is
  // dead" -> force-logout. A 401 on an anonymous request (e.g. wrong password
  // on /api/auth/login) is just a UX-level error and must NOT log anyone out.
  const sentBearerToken = headers.has("Authorization");

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );
  let response;

  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
      body:
        fetchOptions.body === undefined
          ? undefined
          : JSON.stringify(fetchOptions.body),
      cache: fetchOptions.cache || (canSessionCache ? "default" : "no-store"),
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      const message = "Слишком долгий ответ. Нажмите «Повторить».";
      emitGlobalApiError(408, message);
      throw new ApiError(408, message);
    }
    // TypeError from fetch() typically means network failure (offline / DNS /
    // CORS preflight). Surface it as a global toast so users notice.
    emitGlobalApiError(0, "Нет связи с сервером. Проверьте интернет.");
    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;

    try {
      const payload = await response.json();
      if (typeof payload.detail === "string") {
        message = payload.detail;
      } else if (Array.isArray(payload.detail) && payload.detail[0]?.msg) {
        message = payload.detail[0].msg;
      }
    } catch {
      // Ignore parse failures for non-JSON errors.
    }

    // 5xx are server crashes; surface globally. 4xx (validation, auth) stay
    // local — pages handle their own UX for those.
    if (response.status >= 500) {
      emitGlobalApiError(response.status, message);
    }

    // Stale-session recovery. A 401 on anything other than the explicit
    // "entry" auth endpoints (login / register / google / resolve / config)
    // always means the browser is holding a broken session: either the token
    // was sent and the server rejected it (expired, JWT_SECRET rotated, user
    // row wiped), OR the token was missing from localStorage to begin with
    // even though the UI thought the user was signed in. Both cases are
    // handled the same way -- wipe every stored auth key and bounce to the
    // login screen. We explicitly skip the entry endpoints so "wrong
    // password" keeps producing an inline error instead of a forced logout.
    const AUTH_ENTRY_PATHS = new Set([
      "/api/auth/login",
      "/api/auth/register",
      "/api/auth/google",
      "/api/auth/google/config",
      "/api/auth/resolve",
    ]);
    if (response.status === 401 && !AUTH_ENTRY_PATHS.has(path)) {
      forceClientLogout();
    }

    throw new ApiError(response.status, message);
  }

  const payload = await response.json();
  if (canSessionCache) {
    writeCachedJson(cacheKey, payload);
  }
  return payload;
}

export const api = {
  getHealth() {
    return requestJson("/api/health");
  },

  getBootstrap(playerId) {
    return requestJson(`/api/app/bootstrap/${encodeURIComponent(playerId)}`);
  },

  getMapInitial(playerId) {
    return requestJson(`/api/map-initial/${encodeURIComponent(playerId)}`);
  },

  getMapState(playerId, periodCode) {
    return requestJson(
      `/api/map-state/${encodeURIComponent(playerId)}/${encodeURIComponent(periodCode)}`
    );
  },

  getCityContent(periodCode, city) {
    return requestJson(
      `/api/city-content/${encodeURIComponent(periodCode)}/${encodeURIComponent(city)}`,
      { cacheTtlMs: 30 * 60 * 1000 }
    );
  },

  startTest(payload) {
    return requestJson("/api/test/start", {
      method: "POST",
      body: payload,
    });
  },

  submitTest(payload) {
    return requestJson("/api/test/submit", {
      method: "POST",
      body: payload,
    });
  },

  startEntTest(payload) {
    return requestJson("/api/ent/start", {
      method: "POST",
      body: payload,
    });
  },

  submitEntTest(payload) {
    return requestJson("/api/ent/submit", {
      method: "POST",
      body: payload,
    });
  },

  getAchievements(playerId) {
    return requestJson(`/api/achievements/${encodeURIComponent(playerId)}`);
  },

  getAchievementCatalog() {
    return requestJson("/api/achievements/catalog", {
      cacheTtlMs: 10 * 60 * 1000,
    });
  },

  getProgress(playerId) {
    return requestJson(`/api/progress/${encodeURIComponent(playerId)}`);
  },

  getProfileDashboard(playerId) {
    return requestJson(`/api/profile/dashboard/${encodeURIComponent(playerId)}`);
  },

  updateAvatar(payload) {
    return requestJson("/api/auth/avatar", {
      method: "POST",
      body: payload,
    });
  },

  updateUsername(payload) {
    return requestJson("/api/auth/username", {
      method: "POST",
      body: payload,
    });
  },

  getEntAttemptDetail(playerId, attemptId) {
    return requestJson(
      `/api/ent/attempts/${encodeURIComponent(playerId)}/${encodeURIComponent(attemptId)}`
    );
  },

  getEntAttemptAnalysis(playerId, attemptId, language) {
    return requestJson(
      `/api/ent/attempts/${encodeURIComponent(playerId)}/${encodeURIComponent(attemptId)}/analysis?language=${encodeURIComponent(language)}`
    );
  },

  startFactChallenge(payload) {
    return requestJson("/api/fact-challenge/start", {
      method: "POST",
      body: payload,
    });
  },

  submitFactChallenge(payload) {
    return requestJson("/api/fact-challenge/submit", {
      method: "POST",
      body: payload,
    });
  },

  getFactChallengeProgress(playerId) {
    return requestJson(
      `/api/fact-challenge/progress/${encodeURIComponent(playerId)}`
    );
  },

  completeMinigame(payload) {
    return requestJson("/api/minigames/complete", {
      method: "POST",
      body: payload,
    });
  },

  deleteAccount(userId) {
    return requestJson(`/api/auth/account/${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
  },

  getVersion() {
    return requestJson("/api/version");
  },
};
