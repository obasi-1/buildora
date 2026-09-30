import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "buildora.tokens";

function readTokens() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));

    if (saved?.accessToken) return saved;

    // Support sessions saved before this update.
    const accessToken = sessionStorage.getItem("buildora.accessToken");

    return accessToken
      ? { accessToken, refreshToken: null }
      : null;
  } catch {
    return null;
  }
}

let tokens = readTokens();
let sessionVersion = 0;
let refreshTask = null;

function saveTokens(nextTokens) {
  tokens = nextTokens;

  try {
    sessionStorage.removeItem("buildora.accessToken");

    if (nextTokens) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextTokens));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Tokens remain available in memory if storage is unavailable.
  }
}

function checkSession(version, signal) {
  if (signal?.aborted || version !== sessionVersion) {
    throw new DOMException("Request cancelled.", "AbortError");
  }
}

async function renewAccessToken(version) {
  if (!tokens?.refreshToken) return false;

  if (refreshTask?.version === version) {
    return refreshTask.promise;
  }

  const refreshToken = tokens.refreshToken;

  const task = {
    version,
    promise: null,
  };

  task.promise = (async () => {
    const response = await fetch("/api/accounts/token/refresh/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    checkSession(version);

    if (response.status === 401 || response.status === 403) {
      return false;
    }

    if (!response.ok) {
      throw new Error(
        `Unable to renew your session (${response.status}). Please try again.`
      );
    }

    const data = await response.json();

    checkSession(version);

    if (typeof data.access !== "string" || !data.access) {
      throw new Error("The server did not return a new access token.");
    }

    saveTokens({
      accessToken: data.access,
      refreshToken: data.refresh || refreshToken,
    });

    return true;
  })();

  refreshTask = task;

  try {
    return await task.promise;
  } finally {
    if (refreshTask === task) {
      refreshTask = null;
    }
  }
}

// Use this for authenticated Buildora API requests.
export async function apiFetch(url, options = {}) {
  if (typeof url !== "string" || !url.startsWith("/api/")) {
    throw new Error("apiFetch requires a local /api/ URL.");
  }

  const version = sessionVersion;
  const originalAccessToken = tokens?.accessToken;

  async function send() {
    checkSession(version, options.signal);

    const headers = new Headers(options.headers);

    if (tokens?.accessToken) {
      headers.set("Authorization", `Bearer ${tokens.accessToken}`);
    } else {
      headers.delete("Authorization");
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    checkSession(version, options.signal);

    return response;
  }

  const response = await send();

  if (response.status !== 401) {
    return response;
  }

  // Another request may already have renewed the token.
  if (tokens?.accessToken === originalAccessToken) {
    const renewed = await renewAccessToken(version);

    checkSession(version, options.signal);

    if (!renewed) return response;
  }

  // Retry once. A second 401 reaches the existing login-again UI.
  return send();
}

export default function useSession() {
  const [session, updateSession] = useState(null);
  const [restoring, setRestoring] = useState(true);
  const [restoreError, setRestoreError] = useState("");
  const [attempt, setAttempt] = useState(0);

  const setSession = useCallback((nextSession) => {
    sessionVersion += 1;

    saveTokens(
      nextSession
        ? {
            accessToken: nextSession.accessToken,
            refreshToken: nextSession.refreshToken || null,
          }
        : null
    );

    updateSession(nextSession);
    setRestoreError("");
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function restoreSession() {
      try {
        if (!tokens?.accessToken) return;

        const response = await apiFetch("/api/accounts/me/", {
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        if (response.status === 401) {
          setSession(null);
          return;
        }

        if (!response.ok) {
          throw new Error(
            `Unable to restore your session (${response.status}).`
          );
        }

        const user = await response.json();

        if (!controller.signal.aborted) {
          updateSession({
            user,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          });
        }
      } catch (err) {
        if (!controller.signal.aborted && err.name !== "AbortError") {
          setRestoreError(
            err.message || "Unable to connect to the server."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setRestoring(false);
        }
      }
    }

    restoreSession();

    return () => controller.abort();
  }, [attempt, setSession]);

  function updateUser(user) {
  updateSession((current) =>
    current ? { ...current, user } : current
  );
}

  function retryRestore() {
    setRestoreError("");
    setRestoring(true);
    setAttempt((previous) => previous + 1);
  }

  function dismissRestore() {
    setSession(null);
    setRestoring(false);
  }

  return {
    session,
    setSession,
    restoring,
    restoreError,
    retryRestore,
    dismissRestore,
     updateUser,
  };
}