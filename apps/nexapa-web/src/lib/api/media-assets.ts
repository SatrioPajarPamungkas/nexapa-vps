import { apiDelete, apiGet, apiPost } from "./client";
import type {
  ApiCollection,
  ApiEnvelope,
  ApiPaginatedEnvelope,
  ApiMediaAsset,
} from "./response.types";

export async function listMediaAssets(
  params?: {
    page?: number;
    per_page?: number;
    search?: string;
    media_type?: string;
    source_platform?: string;
    status?: string;
    download_job_id?: string;
    library_only?: boolean;
    collection_id?: string;
    sort?: string;
  },
  signal?: AbortSignal,
): Promise<{ data: ApiMediaAsset[]; meta: ApiPaginatedEnvelope<ApiMediaAsset>["meta"] }> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.per_page) searchParams.set("per_page", String(params.per_page));
  if (params?.search) searchParams.set("search", params.search);
  if (params?.media_type) searchParams.set("media_type", params.media_type);
  if (params?.source_platform) searchParams.set("source_platform", params.source_platform);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.download_job_id) searchParams.set("download_job_id", params.download_job_id);
  if (params?.library_only) searchParams.set("library_only", "1");
  if (params?.collection_id) searchParams.set("collection_id", params.collection_id);
  if (params?.sort) searchParams.set("sort", params.sort);

  const query = searchParams.toString();
  const path = `/media-assets${query ? `?${query}` : ""}`;

  const response = await apiGet<ApiPaginatedEnvelope<ApiMediaAsset>>(path, signal);
  return { data: response.data, meta: response.meta };
}

export type BulkDeleteMediaAssetsFilters = {
  search: string;
  media_type: string | null;
};

export type BulkDeleteMediaAssetsPayload =
  | {
      selection_mode: "ids";
      ids: string[];
    }
  | {
      selection_mode: "all_matching";
      filters: BulkDeleteMediaAssetsFilters;
      excluded_ids: string[];
    };

export type BulkDeleteMediaAssetSkippedItem = {
  id: string;
  usage_count: number;
  reason?: string;
};

export type BulkDeleteMediaAssetsResponse = {
  requested: number;
  deleted: number;
  skipped: number;
  skipped_items: BulkDeleteMediaAssetSkippedItem[];
};

export async function bulkDeleteMediaAssets(
  payload: BulkDeleteMediaAssetsPayload,
  signal?: AbortSignal,
): Promise<BulkDeleteMediaAssetsResponse> {
  const response = await apiPost<ApiEnvelope<BulkDeleteMediaAssetsResponse>>(
    "/media-assets/bulk-delete",
    payload,
    signal,
  );
  return response.data;
}

export async function getMediaAsset(
  id: string,
  signal?: AbortSignal,
): Promise<ApiMediaAsset> {
  const response = await apiGet<ApiEnvelope<ApiMediaAsset>>(
    `/media-assets/${id}`,
    signal,
  );
  return response.data;
}

// Collection APIs
export async function listCollections(
  signal?: AbortSignal,
): Promise<ApiCollection[]> {
  const response = await apiGet<ApiPaginatedEnvelope<ApiCollection>>(
    "/collections",
    signal,
  );
  return response.data;
}

export async function getCollection(
  id: string,
  signal?: AbortSignal,
): Promise<ApiCollection> {
  const response = await apiGet<ApiEnvelope<ApiCollection>>(
    `/collections/${id}`,
    signal,
  );
  return response.data;
}

export async function deleteCollection(
  id: string,
  signal?: AbortSignal,
): Promise<void> {
  await apiDelete<ApiEnvelope<void>>(`/collections/${id}`, signal);
}
