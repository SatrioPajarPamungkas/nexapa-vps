import type {
  FullSettings,
  AppEnvironmentMode,
  SettingsSection,
  PlatformTab,
  Language,
  TimezoneOption,
  DateFormat,
  TimeFormat,
  LandingPage,
  AppCategory,
  AppType,
  TikTokEnvironment,
  TikTokPostingMode,
  MetaEnvironment,
  YouTubeEnvironment,
  ShopeeEnvironment,
  ShopeeDirection,
  StorageProvider,
  ProxyMode,
  ProxyProtocol,
  ProxyRotation,
  BrowserEngine,
  WorkerEnabledMap,
} from "./settings.types";

export const SETTINGS_SECTIONS: Array<{ id: SettingsSection; label: string; description: string }> = [
  { id: "general", label: "General", description: "App identity and localization" },
  { id: "developer", label: "Developer Application", description: "Submission preparation" },
  { id: "platforms", label: "Platform Integrations", description: "Meta / YouTube / Shopee" },
  { id: "endpoints", label: "Endpoints", description: "API, auth, webhooks" },
  { id: "workers", label: "Workers", description: "Download, scheduler, publishing" },
  { id: "storage", label: "Storage", description: "Media persistence" },
  { id: "proxy", label: "Proxy", description: "Optional proxy routing" },
  { id: "security", label: "Security", description: "Secrets, sessions, audit" },
  { id: "environment", label: "Environment", description: "Mode and frontend detection" },
];

export const PLATFORM_TABS: Array<{ id: PlatformTab; label: string }> = [
  { id: "tiktok", label: "TikTok" },
  { id: "meta", label: "Meta" },
  { id: "youtube", label: "YouTube" },
  { id: "shopee", label: "Shopee" },
];

export const LANGUAGES: Language[] = ["Indonesian", "English"];
export const TIMEZONES: TimezoneOption[] = [
  "Asia/Jakarta",
  "Asia/Makassar",
  "Asia/Jayapura",
  "UTC",
  "Browser",
];
export const DATE_FORMATS: DateFormat[] = ["DD/MM/YYYY", "YYYY-MM-DD", "MM/DD/YYYY"];
export const TIME_FORMATS: TimeFormat[] = ["24-hour", "12-hour"];
export const LANDING_PAGES: LandingPage[] = ["Dashboard", "Downloader", "Publisher", "Scheduler"];
export const APP_CATEGORIES: AppCategory[] = [
  "Content management",
  "Social media publishing",
  "Media workflow",
  "Creator tools",
];
export const APP_TYPES: AppType[] = ["Web application", "Desktop application", "Web and desktop"];

export const TIKTOK_ENVIRONMENTS: TikTokEnvironment[] = ["sandbox", "production"];
export const TIKTOK_POSTING_MODES: TikTokPostingMode[] = ["direct_post", "upload_as_draft", "both_when_authorized"];
export const TIKTOK_PRODUCTS = ["Login Kit", "Content Posting API", "Share Kit"] as const;
export const TIKTOK_SCOPES = ["user.info.basic", "video.publish", "video.upload"] as const;

export const META_ENVIRONMENTS: MetaEnvironment[] = ["Development", "Live"];
export const META_PRODUCTS = ["Facebook Login", "Pages API", "Instagram Graph API", "Webhooks"] as const;
export const META_PERMISSIONS = [
  "public_profile",
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
] as const;

export const YOUTUBE_ENVIRONMENTS: YouTubeEnvironment[] = ["Testing", "Production"];
export const YOUTUBE_SCOPES = [
  "openid",
  "profile",
  "email",
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
] as const;

export const SHOPEE_ENVIRONMENTS: ShopeeEnvironment[] = ["Test", "Production"];
export const SHOPEE_DIRECTIONS: ShopeeDirection[] = [
  "Affiliate workflow",
  "Product link management",
  "Commerce synchronization",
  "Future approved publishing workflow",
];

export const STORAGE_PROVIDERS: StorageProvider[] = [
  "Not configured",
  "S3 compatible",
  "Cloudflare R2",
  "MinIO",
  "Local server storage",
];

export const PROXY_MODES: ProxyMode[] = ["Disabled", "Global proxy", "Per-platform proxy pool", "Per-account proxy assignment"];
export const PROXY_PROTOCOLS: ProxyProtocol[] = ["HTTP", "HTTPS", "SOCKS5"];
export const PROXY_ROTATIONS: ProxyRotation[] = ["None", "Per job", "Per account", "Timed rotation"];

export const BROWSER_ENGINES: BrowserEngine[] = ["Chrome", "Chromium"];
export const APP_ENVIRONMENTS: AppEnvironmentMode[] = ["Development", "Staging", "Production"];

export const DEFAULTS: FullSettings = {
  general: {
    appName: "Nexapa",
    marketingDomain: "https://nexapa.app",
    appDomain: "https://nexapa.app",
    apiBaseUrl: "https://api.nexapa.app/api",
    language: "English" as Language,
    timezone: "Asia/Jakarta" as TimezoneOption,
    dateFormat: "DD/MM/YYYY" as DateFormat,
    timeFormat: "24-hour" as TimeFormat,
    landingPage: "Dashboard" as LandingPage,
  },
  developer: {
    productName: "Nexapa",
    companyName: "",
    category: "Media workflow" as AppCategory,
    appType: "Web application" as AppType,
    primaryWebsite: "https://nexapa.app",
    appUrl: "https://nexapa.app",
    privacyUrl: "https://nexapa.app/privacy",
    termsUrl: "https://nexapa.app/terms",
    supportUrl: "https://nexapa.app/contact",
    supportEmail: "",
    description:
      "Nexapa is a media workflow application that helps users prepare media, manage authorized social accounts, publish content, organize schedules, and track publishing activity from one workspace.",
    reviewNotes: "",
    demoVideoUrl: "",
    checklist: {
      nameFinalized: false,
      websiteAvailable: false,
      privacyAvailable: false,
      termsAvailable: false,
      descriptionPrepared: false,
      testAccountPrepared: false,
      demoVideoPrepared: false,
      redirectConfigured: false,
      scopesDocumented: false,
      reviewerInstructionsPrepared: false,
    },
  },
  tiktok: {
    clientKey: "",
    clientSecret: "",
    environment: "Sandbox" as TikTokEnvironment,
    redirectUri: "https://nexapa.app/auth/tiktok/callback",
    webhookUrl: "https://api.nexapa.app/webhooks/tiktok",
    termsUrl: "https://nexapa.app/terms",
    privacyUrl: "https://nexapa.app/privacy",
    postingMode: "Upload as draft" as TikTokPostingMode,
    products: ["Login Kit"] as string[],
    scopes: ["user.info.basic"] as string[],
    appDescription: "",
    productUsage: "",
    scopeUsage: "",
    reviewerSteps: "",
    demoAccountNotes: "",
    demoVideoUrl: "",
    productionNotes: "",
  },
  meta: {
    appId: "",
    appSecret: "",
    redirectUri: "https://nexapa.app/auth/meta/callback",
    webhookUrl: "https://api.nexapa.app/webhooks/meta",
    verifyToken: "",
    environment: "Development" as MetaEnvironment,
    products: ["Facebook Login"] as string[],
    permissions: ["public_profile"] as string[],
  },
  youtube: {
    clientId: "",
    clientSecret: "",
    redirectUri: "https://nexapa.app/auth/youtube/callback",
    projectId: "",
    environment: "Testing" as YouTubeEnvironment,
    scopes: ["openid", "profile", "email"] as string[],
  },
  shopee: {
    partnerId: "",
    partnerKey: "",
    shopId: "",
    redirectUrl: "https://nexapa.app/auth/shopee/callback",
    webhookUrl: "https://api.nexapa.app/webhooks/shopee",
    environment: "Test" as ShopeeEnvironment,
    direction: "Affiliate workflow" as ShopeeDirection,
  },
  endpoints: {
    apiBase: "https://api.nexapa.app/api",
    authBase: "https://nexapa.app/auth",
    webhookBase: "https://api.nexapa.app/webhooks",
    mediaBase: "https://media.nexapa.app",
    workerCallback: "https://api.nexapa.app/workers/callback",
    health: "https://api.nexapa.app/health",
  },
  workers: {
    enabled: {
      downloader: true,
      scheduler: true,
      publishing: true,
      browser: true,
      python: false,
    } as WorkerEnabledMap,
    downloader: {
      url: "https://api.nexapa.app/workers/downloader",
      concurrency: 2,
      delaySeconds: 2,
      maxBatch: 10,
      timeoutSeconds: 60,
      retryCount: 2,
    },
    scheduler: {
      url: "https://api.nexapa.app/workers/scheduler",
      pollingSeconds: 30,
      retryCount: 3,
      confirmationTimeoutSeconds: 120,
    },
    publishing: {
      url: "https://api.nexapa.app/workers/publishing",
      maxParallel: 3,
      retryCount: 2,
    },
    browser: {
      url: "https://api.nexapa.app/workers/browser",
      engine: "Chromium" as BrowserEngine,
      isolatedProfile: true,
      sessionValidationMinutes: 30,
    },
    python: {
      url: "https://api.nexapa.app/workers/python",
      healthPath: "/health",
    },
  },
  storage: {
    provider: "Not configured" as StorageProvider,
    endpoint: "",
    region: "",
    bucket: "",
    accessKey: "",
    secretKey: "",
    publicUrl: "",
    uploadLimitMb: 500,
    signedUrlMinutes: 60,
  },
  proxy: {
    mode: "Disabled" as ProxyMode,
    protocol: "HTTPS" as ProxyProtocol,
    host: "",
    port: "",
    username: "",
    password: "",
    rotation: "None" as ProxyRotation,
    regionLabel: "",
    notes: "",
  },
  security: {
    secretStorage: "Backend encrypted storage required",
    atRestStatus: "Not connected",
    accountIsolatedSessions: true,
    expirationDays: 30,
    revokeAfterPasswordChange: true,
    disconnectConfirmation: true,
    stateValidation: true,
    pkce: true,
    redirectAllowlist: "https://nexapa.app/*",
    tokenRefresh: true,
    revocationHandling: true,
    recordConfigChanges: true,
    recordAuthEvents: true,
    recordPublishAttempts: true,
    redactLogs: true,
    hideSensitiveDefault: true,
    confirmClearCredentials: true,
    autoClearSecretsMinutes: 15,
  },
  environment: {
    mode: "Development" as AppEnvironmentMode,
    webUrl: "https://nexapa.app",
    apiUrl: "https://api.nexapa.app/api",
    mediaUrl: "https://media.nexapa.app",
    label: "local",
    debugUi: true,
    demoToggle: true,
  },
};

export const SENSITIVE_KEYS = new Set([
  "clientSecret",
  "appSecret",
  "secretKey",
  "partnerKey",
  "accessKey",
  "verifyToken",
  "password",
]);

export const MAX_LENGTHS = {
  title: 80,
  url: 2048,
  email: 254,
  description: 1000,
  notes: 2000,
  company: 120,
  secret: 512,
  smallText: 200,
};
