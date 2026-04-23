import { getApiBaseUrl } from "./config.js";

const SESSION_CACHE_PREFIX = "sapar-api-cache:";
const REQUEST_TIMEOUT_MS = 20000;

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
      throw new ApiError(408, "Слишком долгий ответ. Нажмите «Повторить».");
    }
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
};
