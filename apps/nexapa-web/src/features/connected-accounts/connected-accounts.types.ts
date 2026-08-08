export type AccountPlatform = "tiktok" | "facebook";

export type UiPlatform = AccountPlatform | "instagram" | "youtube" | "pinterest" | "shopee";

export type AccountStatus = "connected" | "expired" | "error" | "disconnected";

export type AccountConnectionStatus =
  | "local-draft"
  | "authorization-required"
  | "backend-required"
  | "needs-reconnect"
  | "session-expired"
  | "inactive";

export type AccountCapability = "publishing" | "scheduling" | "affiliate" | "media-access";

export type AccountViewMode = "cards" | "list";

export type AccountSort =
  | "recent-updated"
  | "recent-created"
  | "name-asc"
  | "name-desc"
  | "platform"
  | "status";

export type AccountFilter = {
  search: string;
  platform: AccountPlatform | "all";
  status: AccountConnectionStatus | "all";
  defaultFilter: "all" | "default" | "non-default";
  capability: AccountCapability | "all";
};

export type ConnectedAccount = {
  id: string;
  platform: AccountPlatform;
  account_type: 'facebook_admin' | 'facebook_page' | null;
  parent_connected_account_id: string | null;
  external_account_id: string | null;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  status: AccountStatus;
  connection_method: string;
  is_default: boolean;
  last_validated_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type ConnectedAccountDraft = {
  id: string;
  platform: UiPlatform;
  accountLabel: string;
  accountIdentifier: string | null;
  connectionMethod: string;
  status: AccountConnectionStatus;
  capabilities: AccountCapability[];
  isDefault: boolean;
  selected: boolean;
  notes: string | null;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DraftForm = {
  platform: UiPlatform;
  accountLabel: string;
  accountIdentifier: string;
  notes: string;
  isDefault: boolean;
  status: AccountConnectionStatus;
};

export type AccountAction = "refresh" | "remove" | "set_default";

export const STATUS_LABEL: Record<AccountStatus | AccountConnectionStatus, string> = {
  connected: "Connected",
  expired: "Expired",
  error: "Error",
  disconnected: "Disconnected",
  "local-draft": "Local Draft",
  "authorization-required": "Authorization Required",
  "backend-required": "Backend Required",
  "needs-reconnect": "Needs Reconnect",
  "session-expired": "Session Expired",
  inactive: "Inactive",
};

export const STATUS_TONE: Record<AccountStatus, string> = {
  connected: "bg-emerald-400/15 border-emerald-400/25 text-emerald-800 backdrop-blur-xl",
  expired: "bg-amber-400/12 border-amber-400/25 text-amber-800 backdrop-blur-xl",
  error: "bg-red-400/12 border-red-400/25 text-red-800 backdrop-blur-xl",
  disconnected: "bg-white/8 border-white/15 text-slate-600 backdrop-blur-xl",
};

export const PLATFORM_DISPLAY: Record<UiPlatform, string> = {
  tiktok: "TikTok",
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  pinterest: "Pinterest",
  shopee: "Shopee",
};

export const PLATFORM_COLOR: Record<AccountPlatform, string> = {
  tiktok: "bg-slate-900 text-white",
  facebook: "bg-blue-600 text-white",
};

export const PLATFORM_CONNECT_LABEL: Record<AccountPlatform, string> = {
  tiktok: "Connect TikTok",
  facebook: "Connect Facebook",
};
