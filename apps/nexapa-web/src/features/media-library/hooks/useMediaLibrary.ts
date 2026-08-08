import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UnifiedMediaAsset, ImportResult, MediaCollection, MediaOrigin } from "../media-library.types";
import { MAX_ASSETS, ALL_SUPPORTED_MIMES, MAX_TAGS_PER_ASSET, MAX_TAG_LENGTH } from "../media-library.types";
import {
  generateMediaId,
  getMediaTypeFromMime,
  isSupportedMime,
  makeDuplicateKey,
  extractImageMetadata,
  extractVideoMetadata,
  extractAudioMetadata,
  normalizeTag,
  mapApiMediaAssetToUnified,
} from "../media-library.utils";
import { listMediaAssets } from "@/lib/api/media-assets";
import { 
  listMediaCollections, 
  deleteMediaCollection, 
  createMediaCollection, 
  updateMediaCollection, 
  addMediaAssetsToCollection, 
  removeMediaAssetsFromCollection 
} from "@/lib/api/media-collections";
import type { PaginationMeta } from "@/lib/api/response.types";
import { isApiConfigured } from "@/lib/api/client";

type MediaLibraryApiFilters = {
  search: string;
  mediaType: string | null;
  status: string;
  collectionId?: string | null;
};

const INITIAL_API_META: PaginationMeta = {
  current_page: 1,
  last_page: 1,
  per_page: 100,
  total: 0,
};

export function useMediaLibrary(apiFilters: MediaLibraryApiFilters) {
  const [localAssets, setLocalAssets] = useState<UnifiedMediaAsset[]>([]);
  const [apiAssets, setApiAssets] = useState<UnifiedMediaAsset[]>([]);
  const [collections, setCollections] = useState<MediaCollection[]>([]);
  const [lastImport, setLastImport] = useState<ImportResult | null>(null);
  const [clipboardMsg, setClipboardMsg] = useState<string>("");
  const [apiLoading, setApiLoading] = useState(false);
  const [apiMeta, setApiMeta] = useState<PaginationMeta>(INITIAL_API_META);
  const apiPageRef = useRef(1);
  const urlsRef = useRef<Set<string>>(new Set());

  const assets = useMemo(() => {
    const apiKeys = new Set(apiAssets.map((a) => a.key));
    const uniqueLocal = localAssets.filter((a) => !apiKeys.has(a.key));
    return [...apiAssets, ...uniqueLocal];
  }, [apiAssets, localAssets]);

  // Load API collections
  const loadApiCollections = useCallback(async () => {
    if (!isApiConfigured()) return;

    try {
      const result = await listMediaCollections({ source_type: 'manual' });
      const manualCols = result.map((c) => ({
        id: c.id,
        name: c.name,
        createdAt: new Date(c.created_at).getTime(),
        createdAtIso: c.created_at,
        sourceType: c.source_type ?? undefined,
        downloadJobId: c.download_job_id ?? undefined,
        profileUrl: c.profile_url ?? undefined,
        sourcePlatform: c.source_platform ?? undefined,
        mediaCount: c.media_count ?? undefined,
      }));
      setCollections(manualCols);
    } catch {
      // Ignore errors
    }
  }, []);

  useEffect(() => {
    void loadApiCollections();
  }, [loadApiCollections]);

  const duplicateKeySet = useMemo(() => {
    const s = new Set<string>();
    for (const a of localAssets) {
      if (a.file) {
        s.add(makeDuplicateKey(a.file));
      }
    }
    return s;
  }, [localAssets]);

  const revokeUrl = useCallback((url: string) => {
    try {
      if (urlsRef.current.has(url)) {
        URL.revokeObjectURL(url);
        urlsRef.current.delete(url);
      }
    } catch {
      // ignore
    }
  }, []);

  const revokeAll = useCallback(() => {
    for (const url of urlsRef.current) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    }
    urlsRef.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      revokeAll();
    };
  }, [revokeAll]);

  // Load API assets
  const loadApiAssets = useCallback(async (page = apiPageRef.current) => {
    if (!isApiConfigured()) return null;

    setApiLoading(true);
    try {
      const result = await listMediaAssets({
        page,
        per_page: 100,
        search: apiFilters.search || undefined,
        media_type: apiFilters.mediaType ?? undefined,
        sort: "-created_at",
        status: apiFilters.status,
        library_only: true,
        collection_id: apiFilters.collectionId ?? undefined,
      });
      const mapped = result.data.map(mapApiMediaAssetToUnified);
      setApiAssets(mapped);
      setApiMeta(result.meta);
      apiPageRef.current = result.meta.current_page;
      return result;
    } catch {
      // API unavailable, keep existing assets
      return null;
    } finally {
      setApiLoading(false);
    }
  }, [apiFilters.mediaType, apiFilters.search, apiFilters.status, apiFilters.collectionId]);

  useEffect(() => {
    void loadApiAssets(1);
  }, [loadApiAssets]);

  const reloadApiAssetsAfterDelete = useCallback(async () => {
    const activePage = apiPageRef.current;
    const result = await loadApiAssets(activePage);

    if (result && result.data.length === 0 && activePage > 1) {
      return loadApiAssets(activePage - 1);
    }

    return result;
  }, [loadApiAssets]);

  const importFiles = useCallback(async (files: FileList | File[]): Promise<ImportResult> => {
    const list = Array.from(files as FileList);
    const result: ImportResult = {
      added: [],
      unsupported: [],
      zeroByte: [],
      duplicates: [],
      overLimit: 0,
    };

    const seenInBatch = new Set<string>();
    const pending: Array<{ file: File; previewUrl: string }> = [];

    for (const file of list) {
      if (file.size === 0) {
        result.zeroByte.push(file.name);
        continue;
      }

      if (!isSupportedMime(file.type)) {
        result.unsupported.push({ name: file.name, reason: `Unsupported type ${file.type || "unknown"}` });
        continue;
      }

      const dupKey = makeDuplicateKey(file);
      if (duplicateKeySet.has(dupKey) || seenInBatch.has(dupKey)) {
        result.duplicates.push(file.name);
        continue;
      }

      if (localAssets.length + apiAssets.length + pending.length >= MAX_ASSETS) {
        result.overLimit += 1;
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      urlsRef.current.add(previewUrl);
      seenInBatch.add(dupKey);
      pending.push({ file, previewUrl });
    }

    const created: UnifiedMediaAsset[] = pending.map(({ file, previewUrl }) => {
      const mediaType = getMediaTypeFromMime(file.type);
      const now = Date.now();
      return {
        key: `local-${generateMediaId()}`,
        origin: "local" as MediaOrigin,
        apiId: null,
        file,
        originalName: file.name,
        displayName: file.name,
        mediaType: mediaType ?? "image",
        mimeType: file.type,
        size: file.size,
        width: null,
        height: null,
        duration: null,
        previewUrl,
        downloadUrl: null,
        thumbnailUrl: null,
        sourcePlatform: null,
        sourceUrl: null,
        createdAt: new Date(now).toISOString(),
        createdAtMs: now,
        status: "local-preview",
        collectionIds: [],
        tags: [],
        isInUse: false,
        usageCount: 0,
        selected: false,
        archived: false,
        isDemo: false,
      };
    });

    if (created.length > 0) {
      setLocalAssets((prev) => [...prev, ...created]);
      result.added = created;

      for (const asset of created) {
        if (asset.mediaType === "image") {
          extractImageMetadata(asset.previewUrl)
            .then((meta) => {
              setLocalAssets((prev) =>
                prev.map((p) =>
                  p.key === asset.key
                    ? { ...p, width: meta.width, height: meta.height, status: "metadata-ready" as const }
                    : p,
                ),
              );
            })
            .catch(() => {
              setLocalAssets((prev) =>
                prev.map((p) =>
                  p.key === asset.key ? { ...p, status: "limited-metadata" as const } : p,
                ),
              );
            });
        } else if (asset.mediaType === "video") {
          extractVideoMetadata(asset.previewUrl)
            .then((meta) => {
              setLocalAssets((prev) =>
                prev.map((p) =>
                  p.key === asset.key
                    ? {
                        ...p,
                        width: meta.width,
                        height: meta.height,
                        duration: meta.duration,
                        status: meta.width || meta.height || meta.duration ? ("metadata-ready" as const) : ("limited-metadata" as const),
                      }
                    : p,
                ),
              );
            })
            .catch(() => {
              setLocalAssets((prev) =>
                prev.map((p) =>
                  p.key === asset.key ? { ...p, status: "limited-metadata" as const } : p,
                ),
              );
            });
        } else if (asset.mediaType === "audio") {
          extractAudioMetadata(asset.previewUrl)
            .then((meta) => {
              setLocalAssets((prev) =>
                prev.map((p) =>
                  p.key === asset.key
                    ? {
                        ...p,
                        duration: meta.duration,
                        status: meta.duration ? ("metadata-ready" as const) : ("limited-metadata" as const),
                      }
                    : p,
                ),
              );
            })
            .catch(() => {
              setLocalAssets((prev) =>
                prev.map((p) =>
                  p.key === asset.key ? { ...p, status: "limited-metadata" as const } : p,
                ),
              );
            });
        }
      }
    }

    setLastImport(result);
    return result;
  }, [localAssets.length, apiAssets.length, duplicateKeySet]);

  const removeAsset = useCallback((key: string) => {
    setLocalAssets((prev) => {
      const target = prev.find((a) => a.key === key);
      if (target) {
        revokeUrl(target.previewUrl);
      }
      return prev.filter((a) => a.key !== key);
    });
    setApiAssets((prev) => prev.filter((a) => a.key !== key));
  }, [revokeUrl]);

  const clearAll = useCallback(() => {
    revokeAll();
    setLocalAssets([]);
    setApiAssets([]);
    setCollections([]);
    setLastImport(null);
  }, [revokeAll]);

  const toggleSelect = useCallback((key: string) => {
    setLocalAssets((prev) => prev.map((a) => (a.key === key ? { ...a, selected: !a.selected } : a)));
    setApiAssets((prev) => prev.map((a) => (a.key === key ? { ...a, selected: !a.selected } : a)));
  }, []);

  const setSelectedBatch = useCallback((keys: string[], selected: boolean) => {
    const set = new Set(keys);
    setLocalAssets((prev) => prev.map((a) => (set.has(a.key) ? { ...a, selected } : a)));
    setApiAssets((prev) => prev.map((a) => (set.has(a.key) ? { ...a, selected } : a)));
  }, []);

  const clearSelection = useCallback(() => {
    setLocalAssets((prev) => prev.map((a) => ({ ...a, selected: false })));
    setApiAssets((prev) => prev.map((a) => ({ ...a, selected: false })));
  }, []);

  const removeSelected = useCallback(() => {
    setLocalAssets((prev) => {
      const toRemove = prev.filter((a) => a.selected);
      for (const r of toRemove) revokeUrl(r.previewUrl);
      return prev.filter((a) => !a.selected);
    });
    setApiAssets((prev) => prev.filter((a) => !a.selected));
  }, [revokeUrl]);

  const updateDisplayName = useCallback((key: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return false;
    if (trimmed.length > 120) return false;
    setLocalAssets((prev) => prev.map((a) => (a.key === key ? { ...a, displayName: trimmed } : a)));
    setApiAssets((prev) => prev.map((a) => (a.key === key ? { ...a, displayName: trimmed } : a)));
    return true;
  }, []);

  // Tags
  const addTag = useCallback((assetKey: string, tag: string) => {
    const normalized = normalizeTag(tag);
    if (!normalized) return false;
    if (normalized.length > MAX_TAG_LENGTH) return false;
    const updater = (prev: UnifiedMediaAsset[]) =>
      prev.map((a) => {
        if (a.key !== assetKey) return a;
        if (a.tags.length >= MAX_TAGS_PER_ASSET) return a;
        if (a.tags.some((t) => normalizeTag(t) === normalized)) return a;
        return { ...a, tags: [...a.tags, normalized] };
      });
    setLocalAssets(updater);
    setApiAssets(updater);
    return true;
  }, []);

  const removeTag = useCallback((assetKey: string, tag: string) => {
    const normalized = normalizeTag(tag);
    const updater = (prev: UnifiedMediaAsset[]) =>
      prev.map((a) => {
        if (a.key !== assetKey) return a;
        return { ...a, tags: a.tags.filter((t) => normalizeTag(t) !== normalized) };
      });
    setLocalAssets(updater);
    setApiAssets(updater);
  }, []);

  const addTagToSelected = useCallback((tag: string) => {
    const normalized = normalizeTag(tag);
    if (!normalized) return;
    const updater = (prev: UnifiedMediaAsset[]) =>
      prev.map((a) => {
        if (!a.selected) return a;
        if (a.tags.length >= MAX_TAGS_PER_ASSET) return a;
        if (a.tags.some((t) => normalizeTag(t) === normalized)) return a;
        return { ...a, tags: [...a.tags, normalized] };
      });
    setLocalAssets(updater);
    setApiAssets(updater);
  }, []);

  // Collections
  const createCollection = useCallback(async (name: string): Promise<MediaCollection | null> => {
    if (!isApiConfigured()) return null;

    try {
      const result = await createMediaCollection(name);
      const collection: MediaCollection = {
        id: result.id,
        name: result.name,
        createdAt: new Date(result.created_at).getTime(),
        createdAtIso: result.created_at,
        sourceType: result.source_type ?? undefined,
        downloadJobId: result.download_job_id ?? undefined,
        profileUrl: result.profile_url ?? undefined,
        sourcePlatform: result.source_platform ?? undefined,
        mediaCount: result.media_count ?? 0,
      };
      
      // Reload collections to ensure consistency
      await loadApiCollections();
      
      return collection;
    } catch {
      return null;
    }
  }, [loadApiCollections]);

  const renameCollection = useCallback(async (id: string, newName: string): Promise<boolean> => {
    if (!isApiConfigured()) return false;

    try {
      await updateMediaCollection(id, newName);
      
      // Reload collections to ensure consistency
      await loadApiCollections();
      
      return true;
    } catch {
      return false;
    }
  }, [loadApiCollections]);

  const deleteCollection = useCallback(async (id: string): Promise<boolean> => {
    if (!isApiConfigured()) return false;

    try {
      await deleteMediaCollection(id);
      
      // Reload collections to ensure consistency
      await loadApiCollections();
      
      return true;
    } catch {
      return false;
    }
  }, [loadApiCollections]);

  const moveToCollection = useCallback(async (assetKey: string, collectionId: string): Promise<boolean> => {
    if (!isApiConfigured()) return false;

    const asset = [...localAssets, ...apiAssets].find(a => a.key === assetKey);
    
    // Only process API-backed assets with valid IDs
    if (!asset || !asset.apiId) {
      return false;
    }

    try {
      await addMediaAssetsToCollection(collectionId, [asset.apiId]);
      
      // Reload collections and assets to ensure consistency
      await loadApiCollections();
      await loadApiAssets();
      
      return true;
    } catch {
      return false;
    }
  }, [apiAssets, localAssets, loadApiAssets, loadApiCollections]);

  const removeFromCollection = useCallback(async (assetKey: string, collectionId: string): Promise<boolean> => {
    if (!isApiConfigured()) return false;

    const asset = [...localAssets, ...apiAssets].find(a => a.key === assetKey);
    
    // Only process API-backed assets with valid IDs
    if (!asset || !asset.apiId) {
      return false;
    }

    try {
      await removeMediaAssetsFromCollection(collectionId, [asset.apiId]);
      
      // Reload collections and assets to ensure consistency
      await loadApiCollections();
      await loadApiAssets();
      
      return true;
    } catch {
      return false;
    }
  }, [apiAssets, localAssets, loadApiAssets, loadApiCollections]);

  const moveSelectedToCollection = useCallback(async (collectionId: string): Promise<boolean> => {
    if (!isApiConfigured()) return false;

    // Get all selected assets that have valid API IDs
    const selectedAssets = [...localAssets, ...apiAssets].filter(a => a.selected && a.apiId);
    const assetIds = selectedAssets.map(a => a.apiId!).filter(id => id !== null);

    if (assetIds.length === 0) {
      return false;
    }

    try {
      await addMediaAssetsToCollection(collectionId, assetIds);
      
      // Reload collections and assets to ensure consistency
      await loadApiCollections();
      await loadApiAssets();
      
      // Clear selection after successful move
      clearSelection();
      
      return true;
    } catch {
      return false;
    }
  }, [apiAssets, localAssets, clearSelection, loadApiAssets, loadApiCollections]);

  const archiveSelected = useCallback(() => {
    const archiver = (prev: UnifiedMediaAsset[]) =>
      prev.map((a) => (a.selected ? { ...a, archived: true, selected: false } : a));
    setLocalAssets(archiver);
    setApiAssets(archiver);
  }, []);

  const restoreSelected = useCallback(() => {
    const restorer = (prev: UnifiedMediaAsset[]) =>
      prev.map((a) => (a.selected ? { ...a, archived: false, selected: false } : a));
    setLocalAssets(restorer);
    setApiAssets(restorer);
  }, []);

  const archiveAsset = useCallback((key: string) => {
    const archiver = (prev: UnifiedMediaAsset[]) =>
      prev.map((a) => (a.key === key ? { ...a, archived: true } : a));
    setLocalAssets(archiver);
    setApiAssets(archiver);
  }, []);

  const restoreAsset = useCallback((key: string) => {
    const restorer = (prev: UnifiedMediaAsset[]) =>
      prev.map((a) => (a.key === key ? { ...a, archived: false } : a));
    setLocalAssets(restorer);
    setApiAssets(restorer);
  }, []);

  const setReadyToPublish = useCallback((key: string) => {
    const updater = (prev: UnifiedMediaAsset[]) =>
      prev.map((a) => (a.key === key ? { ...a, status: "ready-to-publish" as const } : a));
    setLocalAssets(updater);
    setApiAssets(updater);
  }, []);

  const copyText = useCallback(async (text: string): Promise<boolean> => {
    setClipboardMsg("");
    try {
      if (!navigator.clipboard?.writeText) throw new Error("no clipboard");
      await navigator.clipboard.writeText(text);
      setClipboardMsg("Copied to clipboard");
      window.setTimeout(() => setClipboardMsg(""), 2500);
      return true;
    } catch {
      setClipboardMsg("Clipboard access failed");
      window.setTimeout(() => setClipboardMsg(""), 3000);
      return false;
    }
  }, []);

  const counts = useMemo(() => {
    let images = 0;
    let videos = 0;
    let audio = 0;
    let totalSize = 0;
    let metadataReady = 0;
    let selected = 0;
    let archived = 0;
    const bySource: Record<string, number> = {};
    const byCollection: Record<string, number> = {};
    for (const a of assets) {
      if (a.mediaType === "image") images += 1;
      else if (a.mediaType === "video") videos += 1;
      else audio += 1;
      totalSize += a.size;
      if (a.status === "metadata-ready") metadataReady += 1;
      if (a.selected) selected += 1;
      if (a.archived) archived += 1;
      const sourceKey = a.origin === "local" ? "local-import" : "downloader";
      bySource[sourceKey] = (bySource[sourceKey] ?? 0) + 1;
      for (const cid of a.collectionIds) {
        byCollection[cid] = (byCollection[cid] ?? 0) + 1;
      }
    }
    return { total: assets.length, images, videos, audio, totalSize, metadataReady, selected, archived, bySource, byCollection };
  }, [assets]);

  const acceptAttr = useMemo(() => ALL_SUPPORTED_MIMES.join(","), []);

  return {
    assets,
    localAssets,
    apiAssets,
    collections,
    lastImport,
    clipboardMsg,
    counts,
    acceptAttr,
    apiLoading,
    apiMeta,
    loadApiAssets,
    reloadApiAssetsAfterDelete,
    importFiles,
    removeAsset,
    clearAll,
    toggleSelect,
    setSelectedBatch,
    clearSelection,
    removeSelected,
    updateDisplayName,
    copyText,
    revokeUrl,
    // Tags
    addTag,
    removeTag,
    addTagToSelected,
    // Collections
    createCollection,
    renameCollection,
    deleteCollection,
    moveToCollection,
    removeFromCollection,
    moveSelectedToCollection,
    // Archive
    archiveSelected,
    restoreSelected,
    archiveAsset,
    restoreAsset,
    // Status
    setReadyToPublish,
    // Collections
    loadApiCollections,
  };
}
