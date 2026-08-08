import { apiGet, apiPost, apiDelete } from "./client";
import type {
  ApiEnvelope,
  ApiPaginatedEnvelope,
  ApiDownloadJob,
  ApiDownloadJobDetail,
  ApiDownloadResult,
  CreateJobRequest,
  CreateJobResponseData,
   SelectResultsRequest,
   DownloadBatchStatus,
 } from "./response.types";

export async function createDownloadJobs(
  request: CreateJobRequest,
  signal?: AbortSignal,
): Promise<CreateJobResponseData> {
  const response = await apiPost<ApiEnvelope<CreateJobResponseData>>(
    "/download-jobs",
    request,
    signal,
  );
  return response.data;
}

export async function listDownloadJobs(
  params?: {
    per_page?: number;
    page?: number;
    status?: string;
    sort?: string;
  },
  signal?: AbortSignal,
): Promise<{ data: ApiDownloadJob[]; meta: ApiPaginatedEnvelope<ApiDownloadJob>["meta"] }> {
  const searchParams = new URLSearchParams();
  if (params?.per_page) searchParams.set("per_page", String(params.per_page));
  if (params?.page !== undefined) {
    searchParams.set("page", String(params.page));
  }
  if (params?.status) searchParams.set("status", params.status);
  if (params?.sort) searchParams.set("sort", params.sort);

  const query = searchParams.toString();
  const path = `/download-jobs${query ? `?${query}` : ""}`;

  const response = await apiGet<ApiPaginatedEnvelope<ApiDownloadJob>>(path, signal);
  return { data: response.data, meta: response.meta };
}

export async function getDownloadJob(
  id: string,
  signal?: AbortSignal,
): Promise<ApiDownloadJobDetail> {
  const response = await apiGet<ApiEnvelope<ApiDownloadJobDetail>>(
    `/download-jobs/${id}`,
    signal,
  );
  return response.data;
}

export async function cancelDownloadJob(
  id: string,
  signal?: AbortSignal,
): Promise<ApiDownloadJob> {
  const response = await apiPost<ApiEnvelope<ApiDownloadJob>>(
    `/download-jobs/${id}/cancel`,
    undefined,
    signal,
  );
  return response.data;
}

export async function retryDownloadJob(
  id: string,
  signal?: AbortSignal,
): Promise<ApiDownloadJob> {
  const response = await apiPost<ApiEnvelope<ApiDownloadJob>>(
    `/download-jobs/${id}/retry`,
    undefined,
    signal,
  );
  return response.data;
}

export async function deleteDownloadJob(
  id: string,
  signal?: AbortSignal,
): Promise<void> {
  await apiDelete<ApiEnvelope<unknown>>(`/download-jobs/${id}`, signal);
}

export async function getDownloadJobResults(
  jobId: string,
  params?: { per_page?: number; page?: number; status?: string },
  signal?: AbortSignal,
): Promise<{
  data: ApiDownloadResult[];
  meta: ApiPaginatedEnvelope<ApiDownloadResult>["meta"];
}> {
  const searchParams = new URLSearchParams();

  if (params?.per_page) {
    searchParams.set("per_page", String(params.per_page));
  }

  if (params?.page !== undefined) {
    searchParams.set("page", String(params.page));
  }

  if (params?.status) {
    searchParams.set("status", params.status);
  }

  const query = searchParams.toString();
  const path = `/download-jobs/${jobId}/results${query ? `?${query}` : ""}`;

  const response = await apiGet<ApiPaginatedEnvelope<ApiDownloadResult>>(
    path,
    signal,
  );

  return {
    data: response.data,
    meta: response.meta,
  };
}
export async function selectDownloadJobResults(
  jobId: string,
  request: SelectResultsRequest,
  signal?: AbortSignal,
): Promise<{ selected_count: number; batch_id: string; total: number; created: number; existing: number }> {
  const response = await apiPost<ApiEnvelope<{ selected_count: number; batch_id: string; total: number; created: number; existing: number }>>(
    `/download-jobs/${jobId}/results/select`,
    request,
    signal,
  );
  return response.data;
}

// New batch API helpers
export async function getDownloadBatchStatus(
  batchId: string,
  signal?: AbortSignal,
): Promise<DownloadBatchStatus> {
  const response = await apiGet<ApiEnvelope<DownloadBatchStatus>>(
    `/download-batches/${batchId}`,
    signal,
  );
  return response.data;
}

export function getDownloadBatchArchiveUrl(batchId: string): string {
  const base = (import.meta.env.VITE_NEXAPA_API_BASE_URL ?? "").replace(/\/+$/, "");
  return `${base}/download-batches/${encodeURIComponent(batchId)}/archive`;
}

export async function cancelDownloadBatch(batchId: string, signal?: AbortSignal): Promise<void> {
  await apiPost<ApiEnvelope<unknown>>(
    `/download-batches/${encodeURIComponent(batchId)}/cancel`,
    undefined,
    signal,
  );
}

export async function retryFailedDownloadBatch(batchId: string, signal?: AbortSignal): Promise<number> {
  const response = await apiPost<ApiEnvelope<{ retried_count: number }>>(
    `/download-batches/${encodeURIComponent(batchId)}/retry-failed`,
    undefined,
    signal,
  );
  return response.data.retried_count;
}

export async function deleteDownloadBatch(batchId: string, signal?: AbortSignal): Promise<void> {
  await apiDelete<ApiEnvelope<unknown>>(
    `/download-batches/${encodeURIComponent(batchId)}`,
    signal,
  );
}






