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

const AVATAR_STORAGE_KEY = "sapar-avatar-by-user";
const AUTH_RESOLVE_CACHE_MS = 5 * 60 * 1000;
const AUTH_RESOLVE_TIMEOUT_MS = 8000;

function getStoredAvatarMap(storage) {
  if (!storage) {
    return {};
  }

  try {
    const raw = storage.getItem(AVATAR_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    storage.removeItem(AVATAR_STORAGE_KEY);
    return {};
  }
}

async function syncStoredAvatarIfNeeded(storage, user) {
  if (!storage || !user?.id) {
    return user;
  }

  const localAvatar = getStoredAvatarMap(storage)?.[user.id];
  const localAvatarSrc =
    localAvatar && typeof localAvatar.src === "string" ? localAvatar.src.trim() : "";
  const serverAvatarSrc =
    typeof user.avatar_url === "string" ? user.avatar_url.trim() : "";

  if (!localAvatarSrc || localAvatarSrc === serverAvatarSrc) {
    return user;
  }

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(
    () => controller.abort(),
    AUTH_RESOLVE_TIMEOUT_MS
  );

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/auth/avatar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id,
        avatar_url: localAvatarSrc,
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return user;
    }

    const updated = await response.json();
    writeJson(KEYS.authUser, updated);
    storage.setItem(KEYS.authResolvedAt, String(Date.now()));
    return updated;
  } catch {
    return user;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

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
    return syncStoredAvatarIfNeeded(storage, current);
  }

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(
    () => controller.abort(),
    AUTH_RESOLVE_TIMEOUT_MS
  );

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/auth/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: current.id,
        email: current.email,
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return current;
    }

    const resolved = await response.json();
    const synced = await syncStoredAvatarIfNeeded(storage, resolved);
    writeJson(KEYS.authUser, synced);
    storage.setItem(KEYS.authResolvedAt, String(Date.now()));
    if (synced?.id) {
      storage.setItem(KEYS.playerId, synced.id);
    }
    return synced;
  } catch {
    return syncStoredAvatarIfNeeded(storage, current);
  } finally {
    globalThis.clearTimeout(timeoutId);
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
