const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface ApiFetchOptions extends RequestInit {
  skipAuth?: boolean;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

async function rawFetch<T>(path: string, options: ApiFetchOptions): Promise<T> {
  const token = getToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(!options.skipAuth && token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({detail: "Request failed"}));
    let message = "Request failed";

    if (typeof body.detail === "string") {
      message = body.detail;
    } else if (Array.isArray(body.detail)) {
      message = body.detail
          .map((d: { msg?: string }) => d.msg || JSON.stringify(d))
          .join(", ");
    }

    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

let refreshPromise: Promise<string> | null = null;

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  try {
    return await rawFetch<T>(path, options);
  } catch (err) {
    const status = (err as Error & { status?: number }).status;

    if (status !== 401 || options.skipAuth) {
      throw err;
    }

    try {
      // Only one refresh call in flight, even if several requests 401 at once
      if (!refreshPromise) {
        const { refreshAccessToken } = await import("./auth");
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      await refreshPromise;
    } catch {
      const { logout } = await import("./auth");
      logout();
      throw err;
    }

    return await rawFetch<T>(path, options);
  }
}

import { HttpClient } from "./httpClient";

export const httpClient: HttpClient = {
  get: (path) => apiFetch(path),
  post: (path, body) => apiFetch(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path, body) => apiFetch(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: (path) => apiFetch(path, { method: "DELETE" }),
};