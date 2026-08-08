import { ApiError } from "./errors";

const BASE_URL = import.meta.env.VITE_NEXAPA_API_BASE_URL ?? "";
const REQUEST_TIMEOUT_MS = 30_000;

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  timeout?: number;
};

export function isApiConfigured(): boolean {
  return Boolean(BASE_URL);
}

let csrfInitPromise: Promise<void> | null = null;

async function initCsrf(): Promise<void> {
  if (!csrfInitPromise) {
    const apiOrigin = new URL(BASE_URL).origin;
    const csrfUrl = `${apiOrigin}/sanctum/csrf-cookie`;
    csrfInitPromise = fetch(csrfUrl, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    }).then(() => {});
  }
  return csrfInitPromise;
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  if (!BASE_URL) {
    throw ApiError.networkError();
  }

  const url = `${BASE_URL}${path}`;
  const timeout = options.timeout ?? REQUEST_TIMEOUT_MS;
  const controller = new AbortController();
  const externalSignal = options.signal;

  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...options.headers,
    };

    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    // Ensure CSRF cookie is fetched and token is sent for state-changing requests
    // Laravel Sanctum sets XSRF-TOKEN cookie; we read it, URL-decode, and send as X-XSRF-TOKEN header
    if (options.method && !['GET', 'HEAD', 'OPTIONS'].includes(options.method)) {
      await initCsrf();
      const xsrfMatch = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
      if (xsrfMatch) {
        try {
          headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrfMatch[1]);
        } catch {
          headers['X-XSRF-TOKEN'] = xsrfMatch[1];
        }
      }
    }
    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
      credentials: "include",
    });

    if (response.status === 204) {
      return undefined as T;
    }

    let body: unknown;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      try {
        body = await response.json();
      } catch {
        throw ApiError.invalidResponse();
      }
    } else {
      const text = await response.text();
      try {
        body = JSON.parse(text);
      } catch {
        if (!response.ok) {
          throw ApiError.fromResponse(response.status, { message: text });
        }
        throw ApiError.invalidResponse();
      }
    }

    if (!response.ok) {
      throw ApiError.fromResponse(response.status, body);
    }

    return body as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      if (externalSignal?.aborted) {
        throw error;
      }
      throw ApiError.timeoutError();
    }
    throw ApiError.networkError();
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return apiFetch<T>(path, { method: "GET", signal });
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  return apiFetch<T>(path, { method: "POST", body, signal });
}

export async function apiDelete<T>(path: string, signal?: AbortSignal): Promise<T> {
  return apiFetch<T>(path, { method: "DELETE", signal });
}

export async function apiFetchWithMethod<T>(
  path: string,
  method: "PATCH" | "PUT" | "DELETE",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  return apiFetch<T>(path, { method, body, signal });
}



const normalizedBlobBaseUrl = BASE_URL.replace(/\/+$/, "");

function resolveBlobUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  if (path.startsWith("/api/")) {
    return `${new URL(normalizedBlobBaseUrl).origin}${path}`;
  }

  return `${normalizedBlobBaseUrl}/${path.replace(/^\/+/, "")}`;
}

export async function apiFetchBlob(
  path: string,
  options: RequestOptions = {}
): Promise<Blob> {
  if (!BASE_URL) {
    throw ApiError.networkError();
  }

  const url = resolveBlobUrl(path);
  const timeout = options.timeout ?? REQUEST_TIMEOUT_MS;
  const controller = new AbortController();
  const externalSignal = options.signal;

  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const headers: Record<string, string> = {
      Accept: "image/*",
      ...options.headers,
    };

    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      signal: controller.signal,
      credentials: "include",
    });

    if (!response.ok) {
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const errorBody = await response.json().catch(() => ({}));
        throw ApiError.fromResponse(response.status, errorBody);
      }
      throw ApiError.fromResponse(response.status, { message: `HTTP ${response.status}` });
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      throw ApiError.invalidResponse();
    }

    const blob = await response.blob();
    if (blob.size === 0) {
      throw ApiError.fromResponse(response.status, { message: "Empty response" });
    }

    return blob;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      if (externalSignal?.aborted) {
        throw error;
      }
      throw ApiError.timeoutError();
    }
    throw ApiError.networkError();
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

export { initCsrf };
