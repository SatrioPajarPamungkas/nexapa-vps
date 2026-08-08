import {
  apiGet,
  apiPost,
  apiDelete,
  apiFetchWithMethod,
  apiFetch,
} from "./client";
import type {
  AppearanceThemeData,
  AppearanceThemeListItem,
} from "@/features/appearance/appearance.types";

type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export async function getActiveAppearance() {
  const res = await apiGet<
    ApiEnvelope<{ theme: AppearanceThemeData; is_default: boolean }>
  >("/appearance");
  return res.data;
}

export async function getAppearanceThemes(scope?: string) {
  const query = scope ? `?scope=${scope}` : "";
  const res = await apiGet<
    ApiEnvelope<{
      themes: AppearanceThemeListItem[];
      active_theme: AppearanceThemeData;
      is_default: boolean;
    }>
  >(`/appearance/themes${query}`);
  return res.data;
}

export async function createAppearanceTheme(payload: {
  name: string;
  background_type: string;
  preset_key?: string | null;
  background_path?: string | null;
  background_position: string;
  background_size: string;
  background_attachment?: string;
  card_opacity: number;
  card_blur: number;
  sidebar_opacity: number;
  topbar_opacity: number;
  overlay_opacity: number;
  animation_speed: number;
  motion_intensity: number;
  scope_type?: string;
}) {
  const res = await apiPost<
    ApiEnvelope<{ theme: AppearanceThemeListItem }>
  >("/appearance/themes", payload);
  return res.data;
}

export async function updateAppearanceTheme(
  id: number,
  payload: Partial<{
    name: string;
    background_type: string;
    preset_key: string | null;
    background_position: string;
    background_size: string;
    background_attachment: string;
    card_opacity: number;
    card_blur: number;
    sidebar_opacity: number;
    topbar_opacity: number;
    overlay_opacity: number;
    animation_speed: number;
    motion_intensity: number;
  }>
) {
  const res = await apiFetchWithMethod<
    ApiEnvelope<{ theme: AppearanceThemeListItem }>
  >(`/appearance/themes/${id}`, "PUT", payload);
  return res.data;
}

export async function activateAppearanceTheme(id: number) {
  const res = await apiPost<
    ApiEnvelope<{ theme: AppearanceThemeData }>
  >(`/appearance/themes/${id}/activate`, {});
  return res.data;
}

export async function resetAppearance(scope?: string) {
  const res = await apiPost<
    ApiEnvelope<{ theme: AppearanceThemeData; is_default: boolean }>
  >("/appearance/reset", scope ? { scope } : {});
  return res.data;
}

export async function deleteAppearanceTheme(id: number) {
  const res = await apiDelete<ApiEnvelope<Record<string, never>>>(
    `/appearance/themes/${id}`
  );
  return res;
}

export async function uploadWallpaper(file: File, scope?: string) {
  const BASE_URL = import.meta.env.VITE_NEXAPA_API_BASE_URL ?? "";
  if (!BASE_URL) throw new Error("API not configured");

  const apiOrigin = new URL(BASE_URL).origin;
  const csrfUrl = `${apiOrigin}/sanctum/csrf-cookie`;

  await fetch(csrfUrl, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  let xsrfToken = "";
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  if (match) {
    try {
      xsrfToken = decodeURIComponent(match[1]);
    } catch {
      xsrfToken = match[1];
    }
  }

  const form = new FormData();
  form.append("file", file);
  if (scope) form.append("scope", scope);

  const url = `${BASE_URL}/appearance/wallpapers`;
  const response = await fetch(url, {
    method: "POST",
    body: form,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(xsrfToken ? { "X-XSRF-TOKEN": xsrfToken } : {}),
    },
  });

  if (!response.ok) {
    let body: any = {};
    try {
      body = await response.json();
    } catch {
      const text = await response.text();
      body = { message: text };
    }
    const message =
      body?.message || body?.errors?.file?.[0] || `Upload failed (${response.status})`;
    const err: any = new Error(message);
    err.status = response.status;
    err.body = body;
    throw err;
  }

  const json = (await response.json()) as ApiEnvelope<{
    theme: AppearanceThemeListItem;
  }>;
  return json.data;
}

export async function downloadWallpaperBlob(themeId: number): Promise<Blob> {
  return apiFetch<Blob>(`/appearance/wallpapers/${themeId}/content`, {
    method: "GET",
    headers: { Accept: "image/*" },
  } as any);
}

export async function getPublicCompanyTheme(): Promise<{ theme: AppearanceThemeData }> {
  const BASE_URL = import.meta.env.VITE_NEXAPA_API_BASE_URL ?? "";
  if (!BASE_URL) throw new Error("API not configured");

  const response = await fetch(`${BASE_URL}/public/appearance/company`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch company theme (${response.status})`);
  }

  const json = await response.json();
  return json.data;
}
