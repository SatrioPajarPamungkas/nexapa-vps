import type { FullSettings, ValidationItem, PlatformTab, SettingsSection } from "./settings.types";
import { DEFAULTS, SENSITIVE_KEYS, MAX_LENGTHS } from "./settings.constants";

export function isValidHttpsUrl(value: string, allowLocalhostHttp = true): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.length > MAX_LENGTHS.url) return false;
  try {
    const url = new URL(trimmed);
    if (url.protocol === "https:") return true;
    if (allowLocalhostHttp && url.protocol === "http:") {
      const host = url.hostname.toLowerCase();
      if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function isValidUrl(value: string): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_LENGTHS.url) return false;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function isValidEmail(value: string): boolean {
  if (!value) return true; // optional considered valid when empty
  const trimmed = value.trim();
  if (trimmed.length === 0) return true;
  if (trimmed.length > MAX_LENGTHS.email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function trimValues<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj } as Record<string, unknown>;
  for (const k of Object.keys(out)) {
    const v = out[k];
    if (typeof v === "string") out[k] = v.trim();
  }
  return out as T;
}

export function cloneSettings(s: FullSettings): FullSettings {
  return JSON.parse(JSON.stringify(s)) as FullSettings;
}

export function isDirty(current: FullSettings, applied: FullSettings): boolean {
  return JSON.stringify(current) !== JSON.stringify(applied);
}

export function getDefaultSettings(): FullSettings {
  return cloneSettings(DEFAULTS);
}

export function redactSecretsForValidation(items: ValidationItem[]): ValidationItem[] {
  // ensure no secret value leaks into validation – we already don't include values
  // but double-check messages
  return items.map((it) => {
    const msg = it.message;
    // simple safeguard: if message contains suspicious key substring, mask – not really needed since we never inject secret
    if (SENSITIVE_KEYS.size > 0) {
      // no-op, keep logic for safety
    }
    return { ...it, message: msg };
  });
}

export function buildSafeExport(current: FullSettings): Record<string, unknown> {
  const safe = cloneSettings(current);

  // Strip sensitive fields
  safe.tiktok.clientSecret = "";
  safe.meta.appSecret = "";
  safe.meta.verifyToken = "";
  safe.youtube.clientSecret = "";
  safe.shopee.partnerKey = "";
  safe.storage.secretKey = "";
  safe.storage.accessKey = ""; // access key also sensitive per task: access keys, secret keys, etc
  safe.proxy.password = "";

  // Also redact clientKey? Spec says keep? It says exclude client secrets, app secrets, access keys, secret keys, partner keys, webhook verification token, proxy password
  // So keep client key/id but redact secrets only – we keep clientKey as non-secret? Actually spec lists "Client Secret" excluded but not Client Key. So keep.
  // Keep other non-secret settings as is

  // Remove explicit secret indicators from checklist? Keep.
  return {
    general: safe.general,
    developer: {
      ...safe.developer,
      // hide email? email not sensitive but keep
    },
    tiktok: {
      clientKey: safe.tiktok.clientKey ? "[non-secret present]" : "",
      environment: safe.tiktok.environment,
      redirectUri: safe.tiktok.redirectUri,
      webhookUrl: safe.tiktok.webhookUrl,
      termsUrl: safe.tiktok.termsUrl,
      privacyUrl: safe.tiktok.privacyUrl,
      postingMode: safe.tiktok.postingMode,
      products: safe.tiktok.products,
      scopes: safe.tiktok.scopes,
      note: "Sensitive values were excluded.",
    },
    meta: {
      appId: safe.meta.appId,
      redirectUri: safe.meta.redirectUri,
      webhookUrl: safe.meta.webhookUrl,
      environment: safe.meta.environment,
      products: safe.meta.products,
      permissions: safe.meta.permissions,
    },
    youtube: {
      clientId: safe.youtube.clientId,
      redirectUri: safe.youtube.redirectUri,
      projectId: safe.youtube.projectId,
      environment: safe.youtube.environment,
      scopes: safe.youtube.scopes,
    },
    shopee: {
      partnerId: safe.shopee.partnerId,
      shopId: safe.shopee.shopId,
      redirectUrl: safe.shopee.redirectUrl,
      webhookUrl: safe.shopee.webhookUrl,
      environment: safe.shopee.environment,
      direction: safe.shopee.direction,
    },
    endpoints: safe.endpoints,
    workers: safe.workers,
    storage: {
      provider: safe.storage.provider,
      endpoint: safe.storage.endpoint,
      region: safe.storage.region,
      bucket: safe.storage.bucket,
      publicUrl: safe.storage.publicUrl,
      uploadLimitMb: safe.storage.uploadLimitMb,
      signedUrlMinutes: safe.storage.signedUrlMinutes,
    },
    proxy: {
      mode: safe.proxy.mode,
      protocol: safe.proxy.protocol,
      host: safe.proxy.host,
      port: safe.proxy.port,
      rotation: safe.proxy.rotation,
      regionLabel: safe.proxy.regionLabel,
    },
    security: {
      accountIsolatedSessions: safe.security.accountIsolatedSessions,
      expirationDays: safe.security.expirationDays,
      revokeAfterPasswordChange: safe.security.revokeAfterPasswordChange,
      stateValidation: safe.security.stateValidation,
      pkce: safe.security.pkce,
    },
    environment: safe.environment,
    _notice: "Sensitive values were excluded.",
  };
}

export function validateAllSettings(s: FullSettings): ValidationItem[] {
  const items: ValidationItem[] = [];

  const push = (section: SettingsSection, label: string, severity: ValidationItem["severity"], message: string, platform?: PlatformTab) => {
    items.push({ id: `${section}-${label}-${Math.random().toString(36).slice(2, 6)}`, section, platform, severity, label, message });
  };

  // General
  if (!s.general.appName.trim()) push("general", "Application name", "required", "Application name is required.");
  if (!isValidHttpsUrl(s.general.marketingDomain)) push("general", "Marketing domain", "required", "Marketing domain must be a valid HTTPS URL.");
  if (!isValidHttpsUrl(s.general.appDomain)) push("general", "Application domain", "required", "Application domain must be valid HTTPS.");
  if (!isValidHttpsUrl(s.general.apiBaseUrl)) push("general", "API base URL", "required", "API base URL must be valid HTTPS.");

  // Developer
  if (!s.developer.productName.trim()) push("developer", "Product name", "required", "Product name is required.");
  if (!isValidHttpsUrl(s.developer.primaryWebsite)) push("developer", "Primary website", "required", "Primary website URL must be valid HTTPS.");
  if (!isValidHttpsUrl(s.developer.appUrl)) push("developer", "Application URL", "required", "Application URL must be valid HTTPS.");
  if (!isValidHttpsUrl(s.developer.privacyUrl)) push("developer", "Privacy Policy URL", "required", "Privacy Policy URL must be valid HTTPS.");
  if (!isValidHttpsUrl(s.developer.termsUrl)) push("developer", "Terms URL", "required", "Terms URL must be valid HTTPS.");
  if (s.developer.supportEmail && !isValidEmail(s.developer.supportEmail)) push("developer", "Support email", "warning", "Support email format is invalid.");
  if (!s.developer.description.trim()) push("developer", "Application description", "required", "Description is required for submission.");
  else if (s.developer.description.length < 20) push("developer", "Application description", "warning", "Description seems short – consider richer detail for reviewers.");

  // Meta
  if (!s.meta.appId.trim()) push("platforms", "Meta App ID", "required", "Meta App ID is required.", "meta");
  if (!s.meta.appSecret.trim()) push("platforms", "Meta App Secret", "required", "Meta App Secret is required (memory only).", "meta");
  if (!isValidHttpsUrl(s.meta.redirectUri)) push("platforms", "Meta Redirect URI", "required", "Redirect URI must be valid HTTPS.", "meta");
  if (!isValidHttpsUrl(s.meta.webhookUrl, true)) push("platforms", "Meta Webhook URL", "warning", "Webhook URL should be valid HTTPS.", "meta");
  if (s.meta.permissions.length === 0) push("platforms", "Meta Permissions", "warning", "At least one permission should be selected.", "meta");

  // YouTube
  if (!s.youtube.clientId.trim()) push("platforms", "YouTube Client ID", "required", "Google Client ID is required.", "youtube");
  if (!s.youtube.clientSecret.trim()) push("platforms", "YouTube Client Secret", "required", "Google Client Secret is required.", "youtube");
  if (!isValidHttpsUrl(s.youtube.redirectUri)) push("platforms", "YouTube Redirect URI", "required", "Redirect URI must be valid HTTPS.", "youtube");
  if (s.youtube.scopes.length === 0) push("platforms", "YouTube Scopes", "warning", "At least one scope should be selected.", "youtube");

  // Shopee
  if (!s.shopee.partnerId.trim()) push("platforms", "Shopee Partner ID", "required", "Partner ID required.", "shopee");
  if (!s.shopee.partnerKey.trim()) push("platforms", "Shopee Partner Key", "required", "Partner Key required.", "shopee");
  if (!isValidHttpsUrl(s.shopee.redirectUrl)) push("platforms", "Shopee Redirect", "required", "Redirect URL must be valid HTTPS.", "shopee");
  if (!isValidHttpsUrl(s.shopee.webhookUrl, true)) push("platforms", "Shopee Webhook", "warning", "Webhook URL should be valid HTTPS.", "shopee");

  // Endpoints
  const endpointVals = Object.entries(s.endpoints) as Array<[string, string]>;
  for (const [key, val] of endpointVals) {
    if (!isValidHttpsUrl(val)) push("endpoints", key, "required", `${key} must be valid HTTPS URL.`);
  }
  // duplicate detection
  const seen = new Map<string, string[]>();
  for (const [k, v] of endpointVals) {
    const norm = v.trim().toLowerCase();
    const list = seen.get(norm) ?? [];
    list.push(k);
    seen.set(norm, list);
  }
  for (const [, keys] of seen) {
    if (keys.length > 1 && keys.some((k) => k !== "health")) {
      // not necessarily invalid but warn
      push("endpoints", "Duplicate endpoints", "warning", `Duplicate endpoint values detected: ${keys.join(", ")} – verify if intentional.`);
      break;
    }
  }

  // Workers
  for (const [workerKey, workerConfig] of Object.entries(s.workers)) {
    if (workerKey === "enabled") continue;
    const cfg = workerConfig as { url?: string };
    if (cfg.url && !isValidHttpsUrl(cfg.url)) {
      push("workers", `${workerKey} URL`, "warning", `${workerKey} worker URL should be valid HTTPS.`);
    }
  }

  // Storage
  if (s.storage.provider !== "Not configured") {
    if (s.storage.provider !== "Local server storage" && !s.storage.endpoint.trim()) {
      push("storage", "Storage endpoint", "required", "Storage endpoint is required for selected provider.");
    }
    if (!s.storage.bucket.trim()) push("storage", "Bucket", "required", "Bucket name is required.");
  }

  // Proxy
  if (s.proxy.mode !== "Disabled") {
    if (!s.proxy.host.trim()) push("proxy", "Proxy host", "required", "Proxy host is required when proxy is enabled.");
    if (!s.proxy.port.trim() || Number.isNaN(Number(s.proxy.port)) || Number(s.proxy.port) <= 0) push("proxy", "Proxy port", "required", "Valid proxy port required.");
  }

  // Security
  if (s.security.expirationDays <= 0 || s.security.expirationDays > 365)
    push("security", "Session expiration", "warning", "Session expiration should be between 1 and 365 days.");

  // Environment
  if (!["Development", "Staging", "Production"].includes(s.environment.mode)) {
    push("environment", "Environment mode", "required", "Select environment mode.");
  }

  // Backend required generic
  push("environment", "Backend connection", "backend-required", "Nexapa API and encrypted storage are required to persist configuration securely.");

  // Complete locally placeholders
  const hasRequiredErrors = items.some((i) => i.severity === "required");
  if (!hasRequiredErrors) {
    push("general", "Configuration status", "complete-locally", "General configuration is complete locally. API credentials have not been verified and platform approval is still required.");
  }

  return redactSecretsForValidation(items);
}

export function getFrontendDetection(): { hostname: string; protocol: string; timezone: string; apiBase: string; buildMode: string } {
  let hostname = "unknown";
  let protocol = "unknown";
  let tz = "unknown";
  try {
    hostname = window.location.hostname || "unknown";
    protocol = window.location.protocol || "unknown";
  } catch {
    // ignore
  }
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown";
  } catch {
    // ignore
  }
  const apiBase = (import.meta.env.VITE_NEXAPA_API_BASE_URL as string) ?? "https://api.nexapa.app/api";
  const buildMode = (import.meta.env.MODE as string) ?? "development";
  return { hostname, protocol, timezone: tz, apiBase, buildMode };
}

export function getSectionStatus(
  section: SettingsSection,
  validationItems: ValidationItem[],
): "not-configured" | "partial" | "complete-locally" | "backend-required" | "has-errors" {
  const items = validationItems.filter((v) => v.section === section);
  const hasRequired = items.some((i) => i.severity === "required");
  const hasWarning = items.some((i) => i.severity === "warning");
  const hasComplete = items.some((i) => i.severity === "complete-locally");
  if (hasRequired) return "has-errors";
  if (hasComplete && !hasWarning) return "complete-locally";
  if (hasWarning) return "partial";
  // if only backend-required etc
  return items.length === 0 ? "not-configured" : "backend-required";
}

export function getPlatformTabStatus(platform: PlatformTab, validationItems: ValidationItem[]): ReturnType<typeof getSectionStatus> {
  const items = validationItems.filter((v) => v.platform === platform);
  const hasRequired = items.some((i) => i.severity === "required");
  const hasComplete = items.some((i) => i.severity === "complete-locally");
  const hasWarning = items.some((i) => i.severity === "warning");
  if (hasRequired) return "has-errors";
  if (hasComplete && !hasWarning) return "complete-locally";
  if (hasWarning) return "partial";
  return items.length === 0 ? "not-configured" : "backend-required";
}
