export type SettingsSection =
  | "general"
  | "developer"
  | "platforms"
  | "endpoints"
  | "workers"
  | "storage"
  | "proxy"
  | "security"
  | "environment";

export type PlatformTab = "tiktok" | "meta" | "youtube" | "shopee";

export type AppEnvironmentMode = "Development" | "Staging" | "Production";

export type Language = "Indonesian" | "English";
export type TimezoneOption = "Asia/Jakarta" | "Asia/Makassar" | "Asia/Jayapura" | "UTC" | "Browser";
export type DateFormat = "DD/MM/YYYY" | "YYYY-MM-DD" | "MM/DD/YYYY";
export type TimeFormat = "24-hour" | "12-hour";
export type LandingPage = "Dashboard" | "Downloader" | "Publisher" | "Scheduler";
export type AppCategory = "Content management" | "Social media publishing" | "Media workflow" | "Creator tools";
export type AppType = "Web application" | "Desktop application" | "Web and desktop";

export type TikTokEnvironment = "sandbox" | "production";
export type TikTokPostingMode = "direct_post" | "upload_as_draft" | "both_when_authorized";

export type MetaEnvironment = "Development" | "Live";
export type YouTubeEnvironment = "Testing" | "Production";
export type ShopeeEnvironment = "Test" | "Production";
export type ShopeeDirection =
  | "Affiliate workflow"
  | "Product link management"
  | "Commerce synchronization"
  | "Future approved publishing workflow";

export type StorageProvider = "Not configured" | "S3 compatible" | "Cloudflare R2" | "MinIO" | "Local server storage";
export type ProxyMode = "Disabled" | "Global proxy" | "Per-platform proxy pool" | "Per-account proxy assignment";
export type ProxyProtocol = "HTTP" | "HTTPS" | "SOCKS5";
export type ProxyRotation = "None" | "Per job" | "Per account" | "Timed rotation";
export type BrowserEngine = "Chrome" | "Chromium";

export type DeveloperChecklist = {
  nameFinalized: boolean;
  websiteAvailable: boolean;
  privacyAvailable: boolean;
  termsAvailable: boolean;
  descriptionPrepared: boolean;
  testAccountPrepared: boolean;
  demoVideoPrepared: boolean;
  redirectConfigured: boolean;
  scopesDocumented: boolean;
  reviewerInstructionsPrepared: boolean;
};

export type GeneralSettings = {
  appName: string;
  marketingDomain: string;
  appDomain: string;
  apiBaseUrl: string;
  language: Language;
  timezone: TimezoneOption;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  landingPage: LandingPage;
};

export type DeveloperSettings = {
  productName: string;
  companyName: string;
  category: AppCategory;
  appType: AppType;
  primaryWebsite: string;
  appUrl: string;
  privacyUrl: string;
  termsUrl: string;
  supportUrl: string;
  supportEmail: string;
  description: string;
  reviewNotes: string;
  demoVideoUrl: string;
  checklist: DeveloperChecklist;
};

export type TikTokSettings = {
  clientKey: string;
  clientSecret: string;
  environment: TikTokEnvironment;
  redirectUri: string;
  webhookUrl: string;
  termsUrl: string;
  privacyUrl: string;
  postingMode: TikTokPostingMode;
  products: string[];
  scopes: string[];
  appDescription: string;
  productUsage: string;
  scopeUsage: string;
  reviewerSteps: string;
  demoAccountNotes: string;
  demoVideoUrl: string;
  productionNotes: string;
};

export type MetaSettings = {
  appId: string;
  appSecret: string;
  redirectUri: string;
  webhookUrl: string;
  verifyToken: string;
  environment: MetaEnvironment;
  products: string[];
  permissions: string[];
};

export type YouTubeSettings = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  projectId: string;
  environment: YouTubeEnvironment;
  scopes: string[];
};

export type ShopeeSettings = {
  partnerId: string;
  partnerKey: string;
  shopId: string;
  redirectUrl: string;
  webhookUrl: string;
  environment: ShopeeEnvironment;
  direction: ShopeeDirection;
};

export type EndpointSettings = {
  apiBase: string;
  authBase: string;
  webhookBase: string;
  mediaBase: string;
  workerCallback: string;
  health: string;
};

export type WorkerEnabledMap = {
  downloader: boolean;
  scheduler: boolean;
  publishing: boolean;
  browser: boolean;
  python: boolean;
};

export type DownloaderWorkerSettings = {
  url: string;
  concurrency: number;
  delaySeconds: number;
  maxBatch: number;
  timeoutSeconds: number;
  retryCount: number;
};

export type SchedulerWorkerSettings = {
  url: string;
  pollingSeconds: number;
  retryCount: number;
  confirmationTimeoutSeconds: number;
};

export type PublishingWorkerSettings = {
  url: string;
  maxParallel: number;
  retryCount: number;
};

export type BrowserWorkerSettings = {
  url: string;
  engine: BrowserEngine;
  isolatedProfile: boolean;
  sessionValidationMinutes: number;
};

export type PythonWorkerSettings = {
  url: string;
  healthPath: string;
};

export type AllWorkerSettings = {
  enabled: WorkerEnabledMap;
  downloader: DownloaderWorkerSettings;
  scheduler: SchedulerWorkerSettings;
  publishing: PublishingWorkerSettings;
  browser: BrowserWorkerSettings;
  python: PythonWorkerSettings;
};

export type StorageSettings = {
  provider: StorageProvider;
  endpoint: string;
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  publicUrl: string;
  uploadLimitMb: number;
  signedUrlMinutes: number;
};

export type ProxySettings = {
  mode: ProxyMode;
  protocol: ProxyProtocol;
  host: string;
  port: string;
  username: string;
  password: string;
  rotation: ProxyRotation;
  regionLabel: string;
  notes: string;
};

export type SecuritySettings = {
  secretStorage: string;
  atRestStatus: string;
  accountIsolatedSessions: boolean;
  expirationDays: number;
  revokeAfterPasswordChange: boolean;
  disconnectConfirmation: boolean;
  stateValidation: boolean;
  pkce: boolean;
  redirectAllowlist: string;
  tokenRefresh: boolean;
  revocationHandling: boolean;
  recordConfigChanges: boolean;
  recordAuthEvents: boolean;
  recordPublishAttempts: boolean;
  redactLogs: boolean;
  hideSensitiveDefault: boolean;
  confirmClearCredentials: boolean;
  autoClearSecretsMinutes: number;
};

export type EnvironmentSettings = {
  mode: AppEnvironmentMode;
  webUrl: string;
  apiUrl: string;
  mediaUrl: string;
  label: string;
  debugUi: boolean;
  demoToggle: boolean;
};

export type FullSettings = {
  general: GeneralSettings;
  developer: DeveloperSettings;
  tiktok: TikTokSettings;
  meta: MetaSettings;
  youtube: YouTubeSettings;
  shopee: ShopeeSettings;
  endpoints: EndpointSettings;
  workers: AllWorkerSettings;
  storage: StorageSettings;
  proxy: ProxySettings;
  security: SecuritySettings;
  environment: EnvironmentSettings;
};

export type ValidationSeverity = "required" | "warning" | "backend-required" | "complete-locally";
export type ValidationItem = {
  id: string;
  section: SettingsSection;
  platform?: PlatformTab;
  severity: ValidationSeverity;
  label: string;
  message: string;
};

export type FieldError = string | undefined;
