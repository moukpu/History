import { getApiBaseUrl } from "./config.js";

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function requestJson(path, options = {}) {
  const headers = new Headers(options.headers || {});

  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json; charset=utf-8");
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers,
    body:
      options.body === undefined
        ? undefined
        : JSON.stringify(options.body),
    cache: "no-store",
  });

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

  return response.json();
}

export const api = {
  getHealth() {
    return requestJson("/api/health");
  },

  getBootstrap(playerId) {
    return requestJson(`/api/app/bootstrap/${encodeURIComponent(playerId)}`);
  },

  getMapState(playerId, periodCode) {
    return requestJson(
      `/api/map-state/${encodeURIComponent(playerId)}/${encodeURIComponent(periodCode)}`
    );
  },

  getCityContent(periodCode, city) {
    return requestJson(
      `/api/city-content/${encodeURIComponent(periodCode)}/${encodeURIComponent(city)}`
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

  getAchievements(playerId) {
    return requestJson(`/api/achievements/${encodeURIComponent(playerId)}`);
  },

  getAchievementCatalog() {
    return requestJson("/api/achievements/catalog");
  },

  getProgress(playerId) {
    return requestJson(`/api/progress/${encodeURIComponent(playerId)}`);
  },

  getEntAttemptDetail(playerId, attemptId) {
    return requestJson(
      `/api/ent/attempts/${encodeURIComponent(playerId)}/${encodeURIComponent(attemptId)}`
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
