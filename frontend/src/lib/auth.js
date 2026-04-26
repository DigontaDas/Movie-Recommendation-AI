const AUTH_STORAGE_KEY = "movie-man-auth";

export function getStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredAuth(session) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function isAuthenticated() {
  const session = getStoredAuth();
  return Boolean(session?.token);
}

export async function authFetch(input, init = {}) {
  const session = getStoredAuth();
  const headers = new Headers(init.headers || {});

  if (session?.token) {
    headers.set("Authorization", `Bearer ${session.token}`);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}

export async function readApiResponse(response, fallbackMessage = "Request failed.") {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const data = await response.json();
    return { data, isJson: true };
  }

  const text = await response.text();
  const normalized = text.trim();

  if (normalized.startsWith("<!DOCTYPE") || normalized.startsWith("<html")) {
    throw new Error(
      "The API returned an HTML page instead of JSON. Check that the backend is running and the /api proxy is pointing to it.",
    );
  }

  if (!response.ok) {
    throw new Error(normalized || fallbackMessage);
  }

  return { data: normalized, isJson: false };
}
