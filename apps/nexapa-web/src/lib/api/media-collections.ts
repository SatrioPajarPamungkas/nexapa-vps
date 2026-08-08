import { apiGet, apiPost, apiDelete, apiFetch } from './client';
import type { ApiEnvelope, ApiPaginatedEnvelope } from './response.types';

import type { ApiCollection } from './response.types';

export type MediaCollection = ApiCollection;

interface ListMediaCollectionsParams {
  source_type?: string;
  download_job_id?: string;
}

export async function listMediaCollections(
  params?: ListMediaCollectionsParams
): Promise<ApiCollection[]> {
  const searchParams = new URLSearchParams();
  if (params?.source_type) searchParams.set("source_type", params.source_type);
  if (params?.download_job_id) searchParams.set("download_job_id", params.download_job_id);
  
  const query = searchParams.toString();
  const path = `/collections${query ? `?${query}` : ""}`;
  
  const response = await apiGet<ApiPaginatedEnvelope<ApiCollection>>(path);
  return response.data;
}

export async function getMediaCollection(
  id: string
): Promise<ApiCollection> {
  const response = await apiGet<ApiEnvelope<ApiCollection>>(`/collections/${id}`);
  return response.data;
}

export async function createMediaCollection(
  name: string
): Promise<ApiCollection> {
  const response = await apiPost<ApiEnvelope<ApiCollection>>(`/collections`, { name });
  return response.data;
}

export async function updateMediaCollection(
  id: string,
  name: string
): Promise<ApiCollection> {
  const response = await apiFetch<ApiEnvelope<ApiCollection>>(
    `/collections/${id}`,
    {
      method: "PATCH",
      body: { name },
    }
  );
  return response.data;
}

export async function deleteMediaCollection(
  id: string
): Promise<void> {
  await apiDelete<ApiEnvelope<void>>(`/collections/${id}`);
}

export async function addMediaAssetsToCollection(
  collectionId: string,
  mediaAssetIds: string[]
): Promise<void> {
  await apiPost<ApiEnvelope<void>>(`/collections/${collectionId}/media-assets`, { media_asset_ids: mediaAssetIds });
}

export async function removeMediaAssetsFromCollection(
  collectionId: string,
  mediaAssetIds: string[]
): Promise<void> {
  await apiFetch<ApiEnvelope<void>>(
    `/collections/${collectionId}/media-assets`,
    {
      method: "DELETE",
      body: { media_asset_ids: mediaAssetIds },
    }
  );
}