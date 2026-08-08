const STORAGE_KEY = "nexapa_media_library_selection";

export type MediaLibraryTransferState = {
  source: "media_library";
  action: "publish_now" | "schedule";
  platform: "facebook" | "tiktok" | "youtube" | "shopee";
  mediaAssetIds: string[];
  timestamp: number;
};

export type MediaLibraryTransferHydrationResult = {
  success: boolean;
  hydratedMediaAssetIds?: string[];
  failedMediaAssetIds?: string[];
  error?: string;
};

const MAX_AGE_MS = 5 * 60 * 1000;

export function saveMediaLibrarySelection(state: MediaLibraryTransferState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
  }
}

export function readMediaLibrarySelection(): MediaLibraryTransferState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const state: MediaLibraryTransferState = JSON.parse(raw);
    
    if (Date.now() - state.timestamp > MAX_AGE_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return state;
  } catch {
    return null;
  }
}

export function clearMediaLibrarySelection(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
  }
}

export function clearMediaLibrarySelectionIfMatches(expected: MediaLibraryTransferState): boolean {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return false;

    const current: MediaLibraryTransferState = JSON.parse(raw);
    
    if (
      current.source === expected.source &&
      current.action === expected.action &&
      current.platform === expected.platform &&
      current.timestamp === expected.timestamp &&
      current.mediaAssetIds.length === expected.mediaAssetIds.length &&
      current.mediaAssetIds.every((id, i) => id === expected.mediaAssetIds[i])
    ) {
      sessionStorage.removeItem(STORAGE_KEY);
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

export function createMediaLibraryTransferState(
  action: "publish_now" | "schedule",
  platform: "facebook" | "tiktok" | "youtube" | "shopee",
  mediaAssetIds: string[],
): MediaLibraryTransferState {
  return {
    source: "media_library",
    action,
    platform,
    mediaAssetIds,
    timestamp: Date.now(),
  };
}
