import { apiPost, apiGet, apiFetchWithMethod, initCsrf } from "./client";
import type { AuthUser } from "@/types/auth";

type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export async function register(data: {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  terms_accepted: boolean;
  remember?: boolean;
}) {
  await initCsrf();
  const response = await apiPost<ApiEnvelope<{ user: AuthUser }>>("/auth/register", data);
  return response.data;
}

export async function login(data: { email: string; password: string; remember?: boolean }) {
  await initCsrf();
  const response = await apiPost<ApiEnvelope<{ user: AuthUser }>>("/auth/login", data);
  return response.data;
}

export async function getCurrentUser() {
  const response = await apiGet<ApiEnvelope<{ user: AuthUser }>>("/auth/me");
  return response.data;
}

export async function updateProfile(data: { name: string; email: string }) {
  const response = await apiFetchWithMethod<ApiEnvelope<{ user: AuthUser }>>(
    "/auth/profile",
    "PATCH",
    data
  );
  return response.data;
}

export async function logout() {
  return apiPost<ApiEnvelope<Record<string, never>>>("/auth/logout", {});
}
