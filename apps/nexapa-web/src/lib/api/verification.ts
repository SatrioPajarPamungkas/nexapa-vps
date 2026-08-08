import { apiPost, apiGet } from "./client";

type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export async function resendVerificationEmail() {
  const response = await apiPost<ApiEnvelope<Record<string, never>>>(
    "/auth/email/verification-notification",
    {}
  );
  return response.data;
}

export async function getVerificationStatus() {
  const response = await apiGet<ApiEnvelope<{ email_verified: boolean }>>(
    "/auth/email/verify/status"
  );
  return response.data;
}
