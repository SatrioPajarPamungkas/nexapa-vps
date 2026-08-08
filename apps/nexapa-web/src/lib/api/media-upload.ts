import { initCsrf } from "./client";
import type { PublisherMediaKind } from "@/features/publisher/publisher.types";

export type MediaUploadProgress = {
  loaded: number;
  total: number;
  percent: number;
};

export type MediaAsset = {
  id: string;
  original_filename: string;
  mime_type: string;
  media_type: string;
  size_bytes: number;
  status: string;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  content_url: string | null;
  created_at: string;
};

export const MAX_UPLOAD_BYTES = 300 * 1024 * 1024;

type UploadErrorBody = {
  message?: string;
  error?: string;
  correlation_id?: string | null;
  errors?: Record<string, string[]>;
};

function uploadError(status: number, body?: UploadErrorBody): Error {
  if (status === 422) {
    return new Error(body?.errors?.file?.[0] || body?.message || "The selected file could not be validated.");
  }
  if (status === 413) {
    return new Error("Server upload limit rejected this file. Maximum allowed size is 300 MB.");
  }
  if (status === 419) {
    return new Error("Your session expired. Refresh the page and try the upload again.");
  }
  if (status >= 500) {
    const correlation = body?.correlation_id ? ` Reference: ${body.correlation_id}.` : "";
    return new Error(`${body?.message || "The server could not save the media upload."}${correlation}`);
  }
  return new Error(body?.message || body?.error || "Upload failed");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeMediaAsset(body: unknown): MediaAsset {
  const bodyData = isRecord(body) ? body.data : null;
  const nestedData = isRecord(bodyData) ? bodyData.data : null;
  const candidate = isRecord(bodyData) && bodyData.id
    ? bodyData
    : isRecord(nestedData) && nestedData.id
      ? nestedData
      : isRecord(body) && body.id
        ? body
        : null;

  if (!candidate) {
    throw new Error("Server returned an invalid media response.");
  }

  return candidate as MediaAsset;
}

export async function uploadMediaFile(
  file: File,
  expectedMediaKind: PublisherMediaKind,
  onProgress?: (progress: MediaUploadProgress) => void,
  signal?: AbortSignal
): Promise<MediaAsset> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Maximum media size is 300 MB.");
  }

  const formData = new FormData();
  formData.append("file", file, file.name);
  formData.append("expected_media_kind", expectedMediaKind);

  await initCsrf();

  const xsrfMatch = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  let xsrfToken = "";
  if (xsrfMatch) {
    try {
      xsrfToken = decodeURIComponent(xsrfMatch[1]);
    } catch {
      xsrfToken = xsrfMatch[1];
    }
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const baseUrl = (import.meta.env.VITE_NEXAPA_API_BASE_URL ?? "").replace(/\/$/, "");
    const uploadUrl = `${baseUrl}/media-assets/upload`;

    xhr.open("POST", uploadUrl, true);
    xhr.withCredentials = true;

    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("X-XSRF-TOKEN", xsrfToken);

    if (signal) {
      signal.addEventListener("abort", () => {
        xhr.abort();
        reject(new DOMException("Upload aborted", "AbortError"));
      });
    }

    xhr.upload.onprogress = (event) => {
      if (onProgress && event.lengthComputable) {
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percent: Math.round((event.loaded / event.total) * 100),
        });
      }
    };

    xhr.onload = () => {
      const contentType = xhr.getResponseHeader("content-type") ?? "";
      const succeeded = xhr.status >= 200 && xhr.status < 300;
      if (contentType.includes("application/json")) {
        try {
          const response: unknown = JSON.parse(xhr.responseText);
          if (succeeded) {
            resolve(normalizeMediaAsset(response));
          } else {
            reject(uploadError(xhr.status, response as UploadErrorBody));
          }
        } catch (error) {
          if (error instanceof Error && error.message === "Server returned an invalid media response.") {
            reject(error);
          } else {
            reject(succeeded ? new Error("Server returned an invalid media response.") : uploadError(xhr.status));
          }
        }
      } else {
        reject(succeeded ? new Error("Server returned an invalid media response.") : uploadError(xhr.status));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error during upload"));
    };

    xhr.ontimeout = () => {
      reject(new Error("Upload timeout"));
    };

    xhr.send(formData);
  });
}
