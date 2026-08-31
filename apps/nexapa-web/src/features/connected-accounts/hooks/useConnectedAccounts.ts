import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import type { ConnectedAccount, AccountPlatform } from "../connected-accounts.types";
import {
  getConnectedAccounts,
  connectAccount,
  reconnectAccount,
  refreshAccount,
  setAccountDefault,
  removeAccount,
} from "@/lib/api/connected-accounts";
import { ApiError } from "@/lib/api/errors";

type LoadingState = {
  fetching: boolean;
  connecting: boolean;
  reconnectingId: string | null;
  refreshingId: string | null;
  settingDefaultId: string | null;
  removingId: string | null;
};

type FeedbackState = {
  type: "success" | "error" | "info";
  message: string;
};

export function useConnectedAccounts() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState<LoadingState>({
    fetching: true,
    connecting: false,
    reconnectingId: null,
    refreshingId: null,
    settingDefaultId: null,
    removingId: null,
  });
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const showFeedback = useCallback((type: FeedbackState["type"], message: string) => {
    setFeedback({ type, message });
    window.setTimeout(() => setFeedback(null), 4000);
  }, []);

  const fetchAccounts = useCallback(async (signal?: AbortSignal) => {
    setLoading((prev) => ({ ...prev, fetching: true }));
    try {
      const data = await getConnectedAccounts(signal);
      setAccounts(data);
      setFeedback(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        // Endpoint not available yet - use empty state
        setAccounts([]);
      } else if (err instanceof ApiError) {
        showFeedback("error", "Failed to load connected accounts");
      } else {
        showFeedback("error", "Failed to load connected accounts");
      }
    } finally {
      setLoading((prev) => ({ ...prev, fetching: false }));
    }
  }, [showFeedback]);

  const refetch = useCallback(async (signal?: AbortSignal) => {
    await fetchAccounts(signal);
  }, [fetchAccounts]);

  const handleConnect = useCallback(async (platform: AccountPlatform) => {
    setConnectDialogOpen(false);
    setLoading((prev) => ({ ...prev, connecting: true }));
    try {
      const result = await connectAccount(platform);
      
      const authorizationUrl = result.authorization_url ?? (result as any).data?.authorization_url;
      
      if (authorizationUrl) {
        window.location.assign(authorizationUrl);
        showFeedback("info", "Redirecting to authorization...");
      } else if (result.requires_browser_session ?? (result as any).data?.requires_browser_session) {
        showFeedback("info", "Browser session required. Check Settings for connection instructions.");
      } else if (result.account ?? (result as any).data?.account) {
        const account = result.account ?? (result as any).data?.account;
        setAccounts((prev) => [...prev, account]);
        showFeedback("success", `${platform === "tiktok" ? "TikTok" : "Facebook"} account connected`);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        showFeedback("error", `Connection failed: ${err.message}`);
      } else {
        showFeedback("error", `Failed to connect ${platform} account`);
      }
    } finally {
      setLoading((prev) => ({ ...prev, connecting: false }));
    }
  }, [showFeedback]);

  const handleConnectPlatform = useCallback(async (platform: AccountPlatform) => {
    setConnectDialogOpen(false);
    setLoading((prev) => ({ ...prev, connecting: true }));
    try {
      const result = await connectAccount(platform);
      
      const authorizationUrl = result.authorization_url ?? (result as any).data?.authorization_url;
      
      if (authorizationUrl) {
        window.location.assign(authorizationUrl);
      } else if (result.requires_browser_session ?? (result as any).data?.requires_browser_session) {
        showFeedback("info", "Browser session required. Check Settings for connection instructions.");
      } else if (result.account ?? (result as any).data?.account) {
        const account = result.account ?? (result as any).data?.account;
        setAccounts((prev) => [...prev, account]);
        showFeedback("success", `${platform === "tiktok" ? "TikTok" : "Facebook"} account connected`);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        showFeedback("error", `Connection failed: ${err.message}`);
      } else {
        showFeedback("error", `Failed to connect ${platform} account`);
      }
    } finally {
      setLoading((prev) => ({ ...prev, connecting: false }));
    }
  }, [showFeedback]);

  const handleReconnect = useCallback(async (accountId: string) => {
    setLoading((prev) => ({ ...prev, reconnectingId: accountId }));
    try {
      const result = await reconnectAccount(accountId, "/accounts");
      
      const authorizationUrl = result.authorization_url ?? (result as any).data?.authorization_url;
      
      if (authorizationUrl) {
        window.location.assign(authorizationUrl);
      } else {
        showFeedback("error", "Failed to initiate TikTok reconnection");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        showFeedback("error", `Reconnection failed: ${err.message}`);
      } else {
        showFeedback("error", "Failed to reconnect TikTok account");
      }
    } finally {
      setLoading((prev) => ({ ...prev, reconnectingId: null }));
    }
  }, [showFeedback]);

  const handleRefresh = useCallback(async (accountId: string) => {
    setLoading((prev) => ({ ...prev, refreshingId: accountId }));
    try {
      const updated = await refreshAccount(accountId);
      setAccounts((prev) =>
        prev.map((a) => (a.id === accountId ? updated : a))
      );
      showFeedback("success", "Account refreshed");
    } catch (err) {
      if (err instanceof ApiError) {
        showFeedback("error", `Refresh failed: ${err.message}`);
      } else {
        showFeedback("error", "Failed to refresh account");
      }
    } finally {
      setLoading((prev) => ({ ...prev, refreshingId: null }));
    }
  }, [showFeedback]);

  const handleSetDefault = useCallback(async (accountId: string) => {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return;

    setLoading((prev) => ({ ...prev, settingDefaultId: accountId }));
    try {
      const updated = await setAccountDefault(accountId, account.platform);
      setAccounts((prev) =>
        prev.map((a) => {
          // Clear default for same platform
          if (a.platform === account.platform && a.id !== accountId) {
            return { ...a, is_default: false };
          }
          // Set new default
          if (a.id === accountId) {
            return updated;
          }
          return a;
        })
      );
      showFeedback("success", "Default account updated");
    } catch (err) {
      if (err instanceof ApiError) {
        showFeedback("error", `Failed to set default: ${err.message}`);
      } else {
        showFeedback("error", "Failed to update default account");
      }
    } finally {
      setLoading((prev) => ({ ...prev, settingDefaultId: null }));
    }
  }, [accounts, showFeedback]);

  const handleRemove = useCallback(async (accountId: string) => {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return;

    // Confirmation
    const confirmed = window.confirm(
      `Remove ${account.display_name}? This will disconnect the account from Nexapa.`
    );
    if (!confirmed) return;

    setLoading((prev) => ({ ...prev, removingId: accountId }));
    try {
      await removeAccount(accountId);
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
      showFeedback("success", "Account removed");
    } catch (err) {
      if (err instanceof ApiError) {
        showFeedback("error", `Removal failed: ${err.message}`);
      } else {
        showFeedback("error", "Failed to remove account");
      }
    } finally {
      setLoading((prev) => ({ ...prev, removingId: null }));
    }
  }, [accounts, showFeedback]);

  useEffect(() => {
    abortRef.current = new AbortController();
    fetchAccounts(abortRef.current.signal);

    return () => {
      abortRef.current?.abort();
    };
  }, [fetchAccounts]);

  const tiktokAccounts = useMemo(
    () => accounts.filter((a) => a.platform === "tiktok"),
    [accounts]
  );

  const facebookAccounts = useMemo(
    () => accounts.filter((a) => a.platform === "facebook"),
    [accounts]
  );

  const shopeeAccounts = useMemo(
    () => accounts.filter((a) => a.platform === "shopee"),
    [accounts]
  );

  const counts = useMemo(() => ({
    tiktok: tiktokAccounts.length,
    facebook: facebookAccounts.length,
    shopee: shopeeAccounts.length,
    total: accounts.length,
    defaults: accounts.filter((a) => a.is_default).length,
  }), [tiktokAccounts, facebookAccounts, shopeeAccounts, accounts]);

  return {
    accounts,
    tiktokAccounts,
    facebookAccounts,
    shopeeAccounts,
    counts,
    loading,
    feedback,
    connectDialogOpen,
    openConnectDialog: () => setConnectDialogOpen(true),
    closeConnectDialog: () => setConnectDialogOpen(false),
    handleConnect,
    handleConnectPlatform,
    handleReconnect,
    handleRefresh,
    handleSetDefault,
    handleRemove,
    refetch,
    showFeedback,
  };
}
