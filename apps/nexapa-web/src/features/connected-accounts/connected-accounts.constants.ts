import type { AccountPlatform, UiPlatform, AccountCapability } from "./connected-accounts.types";

export {
  STATUS_LABEL,
  STATUS_TONE,
  PLATFORM_COLOR,
  PLATFORM_CONNECT_LABEL,
  PLATFORM_DISPLAY,
} from "./connected-accounts.types";

export const PLATFORM_CONNECTION_METHOD: Record<UiPlatform, string> = {
  tiktok: "OAuth 2.0 authorization flow via Nexapa API",
  facebook: "OAuth 2.0 authorization flow via Nexapa API",
  instagram: "OAuth 2.0 authorization flow via Nexapa API",
  youtube: "OAuth 2.0 authorization flow via Nexapa API",
  pinterest: "OAuth 2.0 authorization flow via Nexapa API",
  shopee: "OAuth 2.0 authorization flow via Nexapa API",
};

export const PLATFORM_CAPABILITIES: Record<AccountPlatform, AccountCapability[]> = {
  tiktok: ["publishing", "scheduling", "media-access"],
  facebook: ["publishing", "scheduling", "affiliate", "media-access"],
};

export const PLATFORM_CAPABILITY_LABELS: Record<AccountCapability, string> = {
  publishing: "Publishing",
  scheduling: "Scheduling",
  affiliate: "Affiliate",
  "media-access": "Media Access",
};

export const PLATFORM_DESCRIPTION: Record<UiPlatform, string> = {
  tiktok: "Connect TikTok accounts for video publishing and scheduling",
  facebook: "Connect Facebook Pages for publishing and affiliate workflows",
  instagram: "Connect Instagram accounts for visual content publishing",
  youtube: "Connect YouTube channels for video publishing",
  pinterest: "Connect Pinterest boards for content distribution",
  shopee: "Connect Shopee stores for affiliate and product linking",
};

export const EMPTY_TIKTOK = {
  title: "No TikTok accounts connected",
  description: "Connect a TikTok account to enable publishing and scheduling.",
};

export const EMPTY_FACEBOOK = {
  title: "No Facebook Pages connected",
  description: "Connect a Facebook Page to enable publishing and scheduling.",
};

export const CONNECT_HELP = [
  "OAuth authorization flow",
  "No password stored in Nexapa",
  "Secure browser session when required",
];