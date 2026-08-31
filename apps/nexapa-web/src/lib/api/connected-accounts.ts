// Minimal API client for Connected Accounts
// Does not expose tokens, secrets, or sensitive data

import { apiFetch, initCsrf } from "@/lib/api/client";

export type AccountPlatform = "tiktok" | "facebook" | "shopee";

export type AccountStatus = "connected" | "expired" | "error" | "disconnected";

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
  is_publishable: boolean;
  last_validated_at: string | null;
  metadata: Record<string, unknown> | null;
  scopes: string[] | null;
  created_at: string;
  updated_at: string;
};

export type ApiConnectedAccountsResponse = {
  success: boolean;
  message: string;
  data: ConnectedAccount[];
};

export type PaginationMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
};

export type ApiConnectedAccountsPaginatedResponse = {
  success: boolean;
  message: string;
  data: ConnectedAccount[];
  pagination: PaginationMeta;
};

export type GetConnectedAccountsParams = {
  platform?: string;
  account_type?: string;
  status?: string;
  is_publishable?: boolean;
  parent_connected_account_id?: string;
  search?: string;
  page?: number;
  per_page?: number;
  signal?: AbortSignal;
};

export type ApiConnectAccountRequest = {
  platform: AccountPlatform;
  redirect_uri?: string;
};

export type ApiConnectAccountResponse = {
  success: boolean;
  message: string;
  data: {
    authorization_url?: string;
    requires_browser_session?: boolean;
    account?: ConnectedAccount;
  };
};

export type ApiRefreshAccountResponse = {
  success: boolean;
  message: string;
  data: ConnectedAccount;
};

export type ApiSetDefaultRequest = {
  platform: AccountPlatform;
};

export type ApiSetDefaultResponse = {
  success: boolean;
  message: string;
  data: ConnectedAccount;
};

export async function getConnectedAccounts(signal?: AbortSignal): Promise<ConnectedAccount[]> {
  const resp = await apiFetch<ApiConnectedAccountsResponse>("/connected-accounts", {
    method: "GET",
    signal,
  });
  return resp.data ?? [];
}

export async function getConnectedAccountsPaginated(
  params: GetConnectedAccountsParams,
): Promise<ApiConnectedAccountsPaginatedResponse> {
  const queryParams = new URLSearchParams();
  
  if (params.platform) queryParams.set("platform", params.platform);
  if (params.account_type) queryParams.set("account_type", params.account_type);
  if (params.status) queryParams.set("status", params.status);
  if (params.is_publishable !== undefined) queryParams.set("is_publishable", String(params.is_publishable));
  if (params.parent_connected_account_id) queryParams.set("parent_connected_account_id", params.parent_connected_account_id);
  if (params.search) queryParams.set("search", params.search);
  if (params.page) queryParams.set("page", String(params.page));
  if (params.per_page) queryParams.set("per_page", String(params.per_page));

  const queryString = queryParams.toString();
  const path = `/connected-accounts${queryString ? `?${queryString}` : ""}`;

  return apiFetch<ApiConnectedAccountsPaginatedResponse>(path, {
    method: "GET",
    signal: params.signal,
  });
}

export async function connectAccount(
  platform: AccountPlatform,
  redirectUri?: string,
  signal?: AbortSignal,
): Promise<ApiConnectAccountResponse["data"]> {
  await initCsrf();
  const payload: ApiConnectAccountRequest = { platform };
  if (redirectUri) payload.redirect_uri = redirectUri;

  const resp = await apiFetch<ApiConnectAccountResponse>(
    `/connected-accounts/${platform}/connect`,
    {
      method: "POST",
      body: payload,
      signal,
    },
  );
  return resp.data;
}

export async function refreshAccount(
  accountId: string,
  signal?: AbortSignal,
): Promise<ConnectedAccount> {
  const resp = await apiFetch<ApiRefreshAccountResponse>(
    `/connected-accounts/${accountId}/refresh`,
    {
      method: "POST",
      signal,
    },
  );
  return resp.data;
}

export async function setAccountDefault(
  accountId: string,
  platform: AccountPlatform,
  signal?: AbortSignal,
): Promise<ConnectedAccount> {
  const payload: ApiSetDefaultRequest = { platform };

  const resp = await apiFetch<ApiSetDefaultResponse>(
    `/connected-accounts/${accountId}/default`,
    {
      method: "PATCH",
      body: payload,
      signal,
    },
  );
  return resp.data;
}

export async function removeAccount(
  accountId: string,
  signal?: AbortSignal,
): Promise<void> {
  await apiFetch<void>(`/connected-accounts/${accountId}`, {
    method: "DELETE",
    signal,
  });
}

export async function reconnectAccount(
  accountId: string,
  returnTo?: string,
  signal?: AbortSignal,
): Promise<ApiConnectAccountResponse["data"]> {
  await initCsrf();
  const payload: { return_to?: string } = {};
  if (returnTo) payload.return_to = returnTo;

  const resp = await apiFetch<ApiConnectAccountResponse>(
    `/connected-accounts/${accountId}/reconnect`,
    {
      method: "POST",
      body: payload,
      signal,
    },
  );
  return resp.data;
}

export type FacebookInsightPoint = {
  date: string;
  views: number;
  engagements: number;
  followers: number;
};

export type FacebookPageInsights = {
  page: {
    id: string;
    external_account_id: string;
    display_name: string;
    username: string | null;
    avatar_url: string | null;
    status: AccountStatus;
  };
  period: {
    days: 7 | 28 | 90;
    since: string;
    until: string;
  };
  summary: {
    views: number;
    engagements: number;
    followers: number;
    posts: number;
  };
  series: FacebookInsightPoint[];
  warnings: Array<{
    metric: string;
    message: string;
  }>;
};

type FacebookPageInsightsResponse = {
  success: boolean;
  message: string;
  data: FacebookPageInsights;
};

export async function getFacebookPageInsights(
  accountId: string,
  days: 7 | 28 | 90,
  signal?: AbortSignal,
): Promise<FacebookPageInsights> {
  const response = await apiFetch<FacebookPageInsightsResponse>(
    `/connected-accounts/${accountId}/facebook-insights?days=${days}`,
    {
      method: "GET",
      signal,
    },
  );

  return response.data;
}
