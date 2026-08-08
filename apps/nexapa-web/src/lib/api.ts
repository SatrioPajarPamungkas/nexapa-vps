/**
 * API boundary for Nexapa Web.
 * No requests are performed yet. This file only exposes configuration
 * and a placeholder client for future implementation.
 */

export const API_BASE_URL: string =
  import.meta.env.VITE_NEXAPA_API_BASE_URL ?? "";

type ApiConfig = {
  baseUrl: string;
  isConfigured: boolean;
};

export const apiConfig: ApiConfig = {
  baseUrl: API_BASE_URL,
  isConfigured: Boolean(import.meta.env.VITE_NEXAPA_API_BASE_URL),
};

/**
 * Placeholder for future typed client.
 * Intentionally does not perform fetch / axios calls in this phase.
 */
export function getApiInfo(): ApiConfig & { note: string } {
  return {
    ...apiConfig,
    note: "API boundary reserved. No backend requests are performed in current phase.",
  };
}
