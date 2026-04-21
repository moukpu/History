export const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

function getDefaultApiBaseUrl() {
  if (typeof window === "undefined") {
    return DEFAULT_API_BASE_URL;
  }

  const localFrontendPorts = new Set(["3000", "5173", "5500", "8080"]);
  if (["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    return localFrontendPorts.has(window.location.port)
      ? DEFAULT_API_BASE_URL
      : window.location.origin;
  }

  return window.location.origin;
}

export function getApiBaseUrl() {
  if (typeof window === "undefined") {
    return DEFAULT_API_BASE_URL;
  }

  const runtimeValue =
    window.SAPAR_API_BASE_URL || window.localStorage.getItem("sapar-api-base-url");

  return (runtimeValue || getDefaultApiBaseUrl()).replace(/\/+$/, "");
}

export function getPageUrl(relativePath) {
  return new URL(relativePath, window.location.href).toString();
}
