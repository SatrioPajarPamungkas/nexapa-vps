import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DestinationAccount, PublishPlatform, PublisherPlatform } from "../publisher.types";
import { getConnectedAccountsPaginated } from "@/lib/api/connected-accounts";
import { ApiError } from "@/lib/api/errors";

type LoadingState = {
  fetching: boolean;
};

export function usePublisherDestinations(activePlatform: PublisherPlatform) {
  const [destinations, setDestinations] = useState<DestinationAccount[]>([]);
  const [loading, setLoading] = useState<LoadingState>({
    fetching: true,
  });
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const fetchDestinations = useCallback(async (signal?: AbortSignal) => {
    setLoading((prev) => ({ ...prev, fetching: true }));
    setError(null);
    try {
      let accounts: Awaited<ReturnType<typeof getConnectedAccountsPaginated>>["data"];

      if (activePlatform === "facebook") {
        const firstResponse =
          await getConnectedAccountsPaginated({
            platform: "facebook",
            account_type: "facebook_page",
            status: "connected",
            page: 1,
            per_page: 100,
            signal,
          });

        accounts = [...(firstResponse.data ?? [])];

        const lastPage =
          firstResponse.pagination?.last_page ?? 1;

        for (
          let currentPage = 2;
          currentPage <= lastPage;
          currentPage++
        ) {
          const nextResponse =
            await getConnectedAccountsPaginated({
              platform: "facebook",
              account_type: "facebook_page",
              status: "connected",
              page: currentPage,
              per_page: 100,
              signal,
            });

          accounts.push(...(nextResponse.data ?? []));
        }
      } else {
        const response = await getConnectedAccountsPaginated({
          platform: activePlatform,
          status: "connected",
          page: 1,
          per_page: 100,
          signal,
        });
        accounts = response.data;
      }
      
      const mapped: DestinationAccount[] = accounts.map((acc) => {
        const hasVideoUploadScope = acc.platform === "tiktok" 
          ? (acc.scopes?.includes("video.upload") ?? false)
          : true;
        
        let status: DestinationAccount["status"] = "backend-required";
        if (acc.platform === "tiktok" && !hasVideoUploadScope) {
          status = "authorization-required";
        } else if (acc.status === "connected") {
          status = "ready";
        }

        return {
          id: acc.id,
          platform: acc.platform as PublishPlatform,
          accountType: acc.account_type,
          parentConnectedAccountId: acc.parent_connected_account_id,
          label: acc.display_name,
          identifier: acc.username ?? acc.external_account_id ?? acc.id,
          avatarUrl: acc.avatar_url ?? null,
          status,
          isDefault: acc.is_default,
          isDemo: false,
          isPublishable: acc.is_publishable !== false,
        };
      });

      setDestinations(mapped);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setDestinations([]);
      } else if (err instanceof ApiError) {
        setError(`Failed to load destinations: ${err.message}`);
      } else {
        setError("Failed to load connected accounts");
      }
    } finally {
      setLoading((prev) => ({ ...prev, fetching: false }));
    }
  }, [activePlatform]);

  const refetch = useCallback(async (signal?: AbortSignal) => {
    await fetchDestinations(signal);
  }, [fetchDestinations]);

  useEffect(() => {
    setDestinations([]);
    abortRef.current = new AbortController();
    fetchDestinations(abortRef.current.signal);

    return () => {
      abortRef.current?.abort();
    };
  }, [fetchDestinations]);

  const defaultAccountByPlatform = useMemo(() => {
    const map = new Map<PublishPlatform, DestinationAccount | undefined>();
    for (const d of destinations) {
      if (d.isDefault && !map.has(d.platform)) {
        map.set(d.platform, d);
      }
    }
    return map;
  }, [destinations]);

  return {
    destinations,
    defaultAccountByPlatform,
    loading,
    error,
    refetch,
  };
}
