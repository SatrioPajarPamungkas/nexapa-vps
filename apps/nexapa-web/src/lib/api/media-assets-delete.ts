import { apiDelete } from "./client";
import type { ApiEnvelope } from "./response.types";

export type DeleteMediaAssetResponse = {
  success: boolean;
  message: string;
};

export type DeleteMediaAssetError = {
  success: false;
  message: string;
  error: "media_has_usage" | string;
};

export async function deleteMediaAsset(
  id: string,
  signal?: AbortSignal,
): Promise<DeleteMediaAssetResponse> {
  const response = await apiDelete<ApiEnvelope<DeleteMediaAssetResponse>>(
    `/media-assets/${id}`,
    signal,
  );
  return response.data;
}
