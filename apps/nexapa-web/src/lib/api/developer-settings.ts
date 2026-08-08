import { apiGet, apiPost } from "./client";

export type TikTokSettings = {
  client_key: string;
  client_secret: string;
  environment: string;
  content_posting_mode: string;
};

export type TikTokSettingsResponse = {
  success: boolean;
  message: string;
  data: TikTokSettings;
};

export type SaveTikTokSettingsPayload = {
  client_key: string;
  client_secret: string;
  environment: string;
  content_posting_mode: string;
  has_stored_secret?: boolean;
};

export type FacebookSettings = {
  app_id: string;
  app_secret: string;
  has_stored_secret: boolean;
  configuration_id: string | null;
  graph_api_version: string;
  callback_url: string;
  webhook_url?: string;
  webhook_verify_token?: string;
  environment?: string;
  planned_products?: string[];
  requested_permissions?: string[];
};

export type FacebookSettingsResponse = {
  success: boolean;
  message: string;
  data: FacebookSettings;
};

export type SaveFacebookSettingsPayload = {
  app_id: string;
  app_secret?: string;
  graph_api_version: string;
  configuration_id?: string | null;
  has_stored_secret?: boolean;
  webhook_url?: string;
  webhook_verify_token?: string;
  environment?: string;
  planned_products?: string[];
  requested_permissions?: string[];
};

export async function getTikTokSettings(): Promise<TikTokSettingsResponse> {
  return apiGet<TikTokSettingsResponse>("/developer-settings/tiktok");
}

export async function saveTikTokSettings(
  payload: SaveTikTokSettingsPayload,
): Promise<TikTokSettingsResponse> {
  return apiPost<TikTokSettingsResponse>(
    "/developer-settings/tiktok",
    payload,
  );
}

export async function getFacebookSettings(): Promise<FacebookSettingsResponse> {
  return apiGet<FacebookSettingsResponse>("/developer-settings/facebook");
}

export async function saveFacebookSettings(
  payload: SaveFacebookSettingsPayload,
): Promise<FacebookSettingsResponse> {
  return apiPost<FacebookSettingsResponse>(
    "/developer-settings/facebook",
    payload,
  );
}