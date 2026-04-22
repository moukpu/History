import { getApiBaseUrl } from "./config.js";

const KEYS = {
  authUser: "sapar-user",
  authResolvedAt: "sapar-user-resolved-at",
  playerId: "kazakhstan-timeline-player-id",
  lastPeriodCode: "kazakhstan-timeline-last-period",
  lastCity: "kazakhstan-timeline-last-city",
  pendingQuizContext: "sapar-pending-quiz-context",
  activeQuizState: "sapar-active-quiz-state",
  activeFactSession: "sapar-active-fact-session",
};

const AUTH_RESOLVE_CACHE_MS = 5 * 60 * 1000;

function createPlayerId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `player-${crypto.randomUUID()}`;
  }

  return `player-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getStorage() {
  return typeof window !== "undefined" ? window.localStorage : null;
}

function readJson(key) {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  const raw = storage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    storage.removeItem(key);
    return null;
  }
}

function writeJson(key, value) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(key, JSON.stringify(value));
}

export function getOrCreatePlayerId() {
  const storage = getStorage();
  if (!storage) {
    return createPlayerId();
  }

  const authUser = readJson(KEYS.authUser);
  if (authUser?.id) {
    storage.setItem(KEYS.playerId, authUser.id);
    return authUser.id;
  }

  const existing = storage.getItem(KEYS.playerId);
  if (existing) {
    return existing;
  }

  const nextId = createPlayerId();
  storage.setItem(KEYS.playerId, nextId);
  return nextId;
}

export function setStoredPlayerId(playerId) {
  const storage = getStorage();
  if (!storage || !playerId) {
    return;
  }

  storage.setItem(KEYS.playerId, playerId);
}

export function clearStoredPlayerId() {
  const storage = getStorage();
  if (storage) {
    storage.removeItem(KEYS.playerId);
  }
}

export async function reconcileStoredAuthUser() {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  const current = readJson(KEYS.authUser);
  if (!current?.id && !current?.email) {
    return null;
  }

  const lastResolvedAt = Number(storage.getItem(KEYS.authResolvedAt) || 0);
  if (
    lastResolvedAt > 0 &&
    Date.now() - lastResolvedAt < AUTH_RESOLVE_CACHE_MS
  ) {
    if (current?.id) {
      storage.setItem(KEYS.playerId, current.id);
    }
    return current;
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/auth/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: current.id,
        email: current.email,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return current;
    }

    const resolved = await response.json();
    writeJson(KEYS.authUser, resolved);
    storage.setItem(KEYS.authResolvedAt, String(Date.now()));
    if (resolved?.id) {
      storage.setItem(KEYS.playerId, resolved.id);
    }
    return resolved;
  } catch {
    return current;
  }
}

export function hasStoredAuthUser() {
  const storage = getStorage();
  return Boolean(storage?.getItem(KEYS.authUser));
}

export function getLastPeriodCode() {
  const storage = getStorage();
  return storage ? storage.getItem(KEYS.lastPeriodCode) : null;
}

export function setLastPeriodCode(periodCode) {
  const storage = getStorage();
  if (storage) {
    storage.setItem(KEYS.lastPeriodCode, periodCode);
  }
}

export function getLastCity() {
  const storage = getStorage();
  return storage ? storage.getItem(KEYS.lastCity) : null;
}

export function setLastCity(city) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  if (!city) {
    storage.removeItem(KEYS.lastCity);
    return;
  }

  storage.setItem(KEYS.lastCity, city);
}

export function getPendingQuizContext() {
  return readJson(KEYS.pendingQuizContext);
}

export function setPendingQuizContext(value) {
  writeJson(KEYS.pendingQuizContext, value);
}

export function clearPendingQuizContext() {
  const storage = getStorage();
  if (storage) {
    storage.removeItem(KEYS.pendingQuizContext);
  }
}

export function getActiveQuizState() {
  return readJson(KEYS.activeQuizState);
}

export function setActiveQuizState(value) {
  writeJson(KEYS.activeQuizState, value);
}

export function clearActiveQuizState() {
  const storage = getStorage();
  if (storage) {
    storage.removeItem(KEYS.activeQuizState);
  }
}

export function getActiveFactSession() {
  return readJson(KEYS.activeFactSession);
}

export function setActiveFactSession(value) {
  writeJson(KEYS.activeFactSession, value);
}

export function clearActiveFactSession() {
  const storage = getStorage();
  if (storage) {
    storage.removeItem(KEYS.activeFactSession);
  }
}
