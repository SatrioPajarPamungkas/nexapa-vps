import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Upload, Library, FilterX, Trash2, Download, RefreshCw } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useMediaLibrary } from "@/features/media-library/hooks/useMediaLibrary";
import { MediaDropzone } from "@/features/media-library/components/MediaDropzone";
import { MediaLibraryToolbar } from "@/features/media-library/components/MediaLibraryToolbar";
import { MediaCollectionNav } from "@/features/media-library/components/MediaCollectionNav";
import { StickySelectionBar } from "@/features/media-library/components/StickySelectionBar";
import { MediaAssetGrid } from "@/features/media-library/components/MediaAssetGrid";
import { MediaAssetList } from "@/features/media-library/components/MediaAssetList";
import { MediaDetailsDrawer } from "@/features/media-library/components/MediaDetailsDrawer";
import { BulkUploadModal } from "@/features/media-library/components/BulkUploadModal";
import { PlatformChooserModal } from "@/features/media-library/components/PlatformChooserModal";
import { DeleteConfirmationModal } from "@/features/media-library/components/DeleteConfirmationModal";
import { MediaDetailsModal } from "@/features/media-library/components/MediaDetailsModal";
import {
  saveMediaLibrarySelection,
  createMediaLibraryTransferState,
} from "@/lib/media-library-transfer";
import {
  bulkDeleteMediaAssets,
  listMediaAssets,
  type BulkDeleteMediaAssetsFilters,
  type BulkDeleteMediaAssetsPayload,
} from "@/lib/api/media-assets";
import type { MediaFilter, MediaSort, MediaViewMode } from "@/features/media-library/media-library.types";
import { filterAssets, sortAssets, buildMetadataCopy, formatFileSize } from "@/features/media-library/media-library.utils";
import { EMPTY_FILTERED, EMPTY_PRIMARY, EMPTY_COLLECTION, BUILTIN_COLLECTIONS } from "@/features/media-library/media-library.constants";

export function MediaLibraryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<MediaFilter>({ search: "", type: "all", status: "all" });
  const [sort, setSort] = useState<MediaSort>("recent");
  const [view, setView] = useState<MediaViewMode>("grid");
  const [detailsKey, setDetailsKey] = useState<string | null>(null);
  const [pendingUploadFiles, setPendingUploadFiles] = useState<File[]>([]);
  const activeCollection = searchParams.get("collection") || "__all__";
  const isBuiltInCollection = useMemo(() =>
    BUILTIN_COLLECTIONS.some((collection) => collection.id === activeCollection),
    [activeCollection]
  );

  const apiFilters = useMemo(() => ({
    search: filter.search.trim(),
    mediaType: filter.type === "all" ? null : filter.type,
    status: activeCollection === "__archive__" ? "archived" : "pending,available",
    collectionId: !isBuiltInCollection && activeCollection !== "__all__"
      ? activeCollection
      : undefined,
  }), [activeCollection, filter.search, filter.type, isBuiltInCollection]);
  const lib = useMediaLibrary(apiFilters);
  const navigate = useNavigate();
  const lastTriggerRef = useRef<HTMLElement | null>(null);

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [platformModalOpen, setPlatformModalOpen] = useState(false);
  const [platformAction, setPlatformAction] = useState<"publish_now" | "schedule">("publish_now");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsModalKey, setDetailsModalKey] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [selectAllMatching, setSelectAllMatching] = useState(false);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(() => new Set());
  const [filtersSnapshot, setFiltersSnapshot] = useState<BulkDeleteMediaAssetsFilters | null>(null);
  const [matchingTotal, setMatchingTotal] = useState(0);
  const [pendingTransferIds, setPendingTransferIds] = useState<string[]>([]);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), type === "error" ? 4000 : 3000);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectAllMatching(false);
    setExcludedIds(new Set());
    setFiltersSnapshot(null);
    setMatchingTotal(0);
    lib.clearSelection();
  }, [lib.clearSelection]);

  useEffect(() => {
    clearSelection();
  }, [
    activeCollection,
    clearSelection,
    filter.search,
    filter.status,
    filter.type,
  ]);

  const filtered = useMemo(() => {
    // For real UUID collections, we rely on backend filtering via API
    // so we don't apply collection filtering again in the frontend
    if (!isBuiltInCollection && activeCollection !== "__all__") {
      // For real collections, the lib.assets already come filtered from the API
      // We still apply search, type, and status filters
      const f = filterAssets(lib.assets, filter.search, filter.type, filter.status, undefined, false);
      return sortAssets(f, sort);
    }

    // For built-in collections, we apply the existing filtering logic
    if (activeCollection === "__all__") {
      const f = filterAssets(lib.assets, filter.search, filter.type, filter.status, undefined, false);
      return sortAssets(f, sort);
    }
    if (activeCollection === "__archive__") {
      const f = filterAssets(lib.assets, filter.search, filter.type, filter.status, "__archive__", true);
      return sortAssets(f, sort);
    }
    if (activeCollection === "__ready__") {
      const f = filterAssets(lib.assets, filter.search, "all", "ready-to-publish", undefined, false);
      return sortAssets(f, sort);
    }
    if (activeCollection === "__published__") {
      return [];
    }
    const f = filterAssets(lib.assets, filter.search, filter.type, filter.status, activeCollection, false);
    return sortAssets(f, sort);
  }, [lib.assets, filter, sort, activeCollection, isBuiltInCollection]);

  const isAssetSelected = useCallback((apiId: string | null) => {
    if (!apiId) return false;
    return selectAllMatching ? !excludedIds.has(apiId) : selectedIds.has(apiId);
  }, [excludedIds, selectAllMatching, selectedIds]);

  const renderedFiltered = useMemo(() => filtered.map((asset) => ({
    ...asset,
    selected: isAssetSelected(asset.apiId),
  })), [filtered, isAssetSelected]);

  const selectedVisible = useMemo(
    () => renderedFiltered.filter((asset) => asset.selected),
    [renderedFiltered],
  );

  const selectedCount = selectAllMatching
    ? Math.max(0, matchingTotal - excludedIds.size)
    : selectedIds.size;

  const handleToggleSelection = useCallback((key: string) => {
    const asset = lib.assets.find((item) => item.key === key);
    if (!asset?.apiId) return;

    if (selectAllMatching) {
      setExcludedIds((current) => {
        const next = new Set(current);
        if (next.has(asset.apiId!)) next.delete(asset.apiId!);
        else next.add(asset.apiId!);
        return next;
      });
      return;
    }

    const willSelect = !selectedIds.has(asset.apiId);
    lib.setSelectedBatch([key], willSelect);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (willSelect) next.add(asset.apiId!);
      else next.delete(asset.apiId!);
      return next;
    });
  }, [lib.assets, lib.setSelectedBatch, selectAllMatching, selectedIds]);

  const handleSelectAllMatching = useCallback(async () => {
    const snapshot: BulkDeleteMediaAssetsFilters = {
      search: filter.search.trim(),
      media_type: filter.type === "all" ? null : filter.type,
    };

    try {
      // Get first page to determine total count
      const firstPage = await listMediaAssets({
        page: 1,
        per_page: 1,
        search: snapshot.search || undefined,
        media_type: snapshot.media_type ?? undefined,
        library_only: true,
        collection_id: !isBuiltInCollection && activeCollection !== "__all__"
          ? activeCollection
          : undefined,
      });

      const totalCount = firstPage.meta.total;

      // Sequentially fetch all pages with 100 items per page
      const allApiIds = new Set<string>();
      const totalPages = Math.ceil(totalCount / 100);

      for (let page = 1; page <= totalPages; page++) {
        const pageResult = await listMediaAssets({
          page,
          per_page: 100,
          search: snapshot.search || undefined,
          media_type: snapshot.media_type ?? undefined,
          library_only: true,
          collection_id: !isBuiltInCollection && activeCollection !== "__all__"
            ? activeCollection
            : undefined,
        });

        // Add API IDs to the set (automatically deduplicates)
        pageResult.data.forEach(asset => {
          if (asset.id) {
            allApiIds.add(asset.id);
          }
        });
      }

      // Convert Set to Array for state
      setSelectedIds(allApiIds);
      setExcludedIds(new Set());
      setFiltersSnapshot(snapshot);
      setMatchingTotal(totalCount);
      setSelectAllMatching(true);
      lib.clearSelection();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to select matching media.", "error");
    }
  }, [filter.search, filter.type, activeCollection, isBuiltInCollection, lib.clearSelection, showToast]);

  const handleOpenDetails = useCallback((key: string) => {
    lastTriggerRef.current = document.activeElement as HTMLElement | null;
    setDetailsKey(key);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setDetailsKey(null);
    window.setTimeout(() => {
      lastTriggerRef.current?.focus();
    }, 0);
  }, []);

  const detailsAsset = useMemo(() => {
    if (!detailsKey) return null;
    return lib.assets.find((a) => a.key === detailsKey) ?? null;
  }, [detailsKey, lib.assets]);

  const handleCopyNames = useCallback(async () => {
    const names = selectedVisible.map((a) => a.originalName).join("\n");
    if (!names) return false;
    return lib.copyText(names);
  }, [selectedVisible, lib]);

  const handleCopyMetadata = useCallback(async () => {
    const texts = selectedVisible.map(buildMetadataCopy).join("\n\n");
    if (!texts) return false;
    return lib.copyText(texts);
  }, [selectedVisible, lib]);



  const handleUploadVideosClick = () => {
    setPendingUploadFiles([]); // Clear pending files
    setUploadModalOpen(true);
  };

  const handleDropzoneFilesSelected = (files: File[]) => {
    // Filter only video files
    const videoFiles = files.filter(file => file.type.startsWith('video/'));
    // Limit to 50 files
    const limitedFiles = videoFiles.slice(0, 50);
    // Store in pending upload files
    setPendingUploadFiles(limitedFiles);
    // Open the modal
    setUploadModalOpen(true);
  };

  const handleUploadComplete = useCallback((uploadedCount: number) => {
    lib.loadApiAssets();
    if (uploadedCount > 0) {
      setUploadModalOpen(false);
      setPendingUploadFiles([]); // Clear pending files on successful upload
    }
  }, [lib]);

  const handlePublishNow = useCallback(() => {
    if (selectedVisible.length !== 1) return;
    const asset = selectedVisible[0];
    if (!asset.apiId) return;

    setPendingTransferIds([asset.apiId]);
    setPlatformAction("publish_now");
    setPlatformModalOpen(true);
  }, [selectedVisible]);

  const handleSchedule = useCallback(async () => {
    let apiIds: string[] = [];

    if (selectAllMatching) {
      try {
        // Request only the first API page with 50 videos
        const firstPage = await listMediaAssets({
          page: 1,
          per_page: 50,
          search: filter.search.trim() || undefined,
          media_type: "video",
          library_only: true,
          sort: "-created_at",
          status: activeCollection === "__archive__" ? "archived" : "pending,available",
          collection_id: !isBuiltInCollection && activeCollection !== "__all__"
            ? activeCollection
            : undefined,
        });

        // Map response data IDs and filter for videos only
        apiIds = firstPage.data
          .filter((asset) => asset.media_type === "video" && asset.id)
          .map((asset) => asset.id!);

        // Deduplicate IDs (though API should already return unique)
        apiIds = [...new Set(apiIds)];

        if (apiIds.length === 0) {
          showToast("No videos are available for bulk publishing.", "error");
          return;
        }
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Failed to fetch videos for bulk publishing.", "error");
        return;
      }
    } else {
      // Derive selected API assets from lib.assets using selectedIds
      const selectedAssets = lib.assets.filter((asset) =>
        asset.apiId && selectedIds.has(asset.apiId) && asset.mediaType === "video"
      );

      // Keep only assets with apiId and mediaType === "video"
      apiIds = selectedAssets
        .map((asset) => asset.apiId!)
        .slice(0, 50); // Automatically slice to the first 50 IDs

      if (apiIds.length === 0) {
        showToast("Select at least one video for bulk publishing.", "error");
        return;
      }
    }

    // Set pendingTransferIds to those IDs
    setPendingTransferIds(apiIds);
    setPlatformAction("schedule");
    setPlatformModalOpen(true);
  }, [selectAllMatching, selectedVisible, selectedIds, lib.assets, filter.search, filter.type, activeCollection, isBuiltInCollection, showToast]);

  const handlePlatformSelect = useCallback((platform: "facebook" | "tiktok" | "youtube" | "shopee") => {
    if (pendingTransferIds.length === 0) return;

    const state = createMediaLibraryTransferState(platformAction, platform, pendingTransferIds);
    saveMediaLibrarySelection(state);

    setPlatformModalOpen(false);
    // Note: pendingTransferIds will be cleared after navigation completes
    navigate("/publisher", { state: { fromMediaLibrary: true } });
  }, [pendingTransferIds, platformAction, navigate]);

  const handleDelete = useCallback(() => {
    if (selectedCount === 0) return;
    setDeleteModalOpen(true);
  }, [selectedCount]);

  const handleConfirmDelete = useCallback(async () => {
    if (deleting) return;

    const payload: BulkDeleteMediaAssetsPayload = selectAllMatching
      ? {
          selection_mode: "all_matching",
          filters: filtersSnapshot ?? {
            search: filter.search.trim(),
            media_type: filter.type === "all" ? null : filter.type,
          },
          excluded_ids: Array.from(excludedIds),
        }
      : {
          selection_mode: "ids",
          ids: Array.from(selectedIds),
        };

    setDeleting(true);
    try {
      const result = await bulkDeleteMediaAssets(payload);
      await lib.reloadApiAssetsAfterDelete();
      clearSelection();
      setDeleteModalOpen(false);
      showToast(
        result.skipped > 0
          ? `${result.deleted} media deleted, ${result.skipped} skipped because they are in use`
          : `${result.deleted} media deleted`,
        "success",
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to delete selected media.", "error");
    } finally {
      setDeleting(false);
    }
  }, [
    clearSelection,
    deleting,
    excludedIds,
    filter.search,
    filter.type,
    filtersSnapshot,
    lib.reloadApiAssetsAfterDelete,
    selectAllMatching,
    selectedIds,
    showToast,
  ]);



  const handleCloseDetailsModal = useCallback(() => {
    setDetailsModalOpen(false);
    setDetailsModalKey(null);
  }, []);

  const detailsModalAsset = useMemo(() => {
    if (!detailsModalKey) return null;
    return lib.assets.find((a) => a.key === detailsModalKey) ?? null;
  }, [detailsModalKey, lib.assets]);

  const collectionEmptyText = EMPTY_COLLECTION[
    BUILTIN_COLLECTIONS.find((c) => c.id === activeCollection)?.key as string
  ];

  return (
    <div className="min-w-0">
      <PageHeader
        eyebrow="Workspace"
        title="Media Library"
        description="Curated media assets"
        actions={
          <>
            <StatusBadge
              label={lib.apiLoading ? "Loading API..." : `${lib.assets.length} assets`}
              tone="blue"
            />
            <button
              type="button"
              onClick={() => lib.loadApiAssets()}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/20 bg-white/12 px-4 text-[13px] font-medium text-slate-800 shadow-sm backdrop-blur-xl transition hover:bg-white/22 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleUploadVideosClick}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 text-[13px] font-medium text-white shadow-[0_8px_22px_rgba(37,99,235,0.28)] transition hover:from-blue-700 hover:to-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              Upload Videos
            </button>
            <Link
              to="/downloader"
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/20 bg-white/12 px-4 text-[13px] font-medium text-slate-800 shadow-sm backdrop-blur-xl transition hover:bg-white/22 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Open Downloader
            </Link>
          </>
        }
      />

      <div className="mx-auto max-w-[1440px] space-y-5 bg-transparent px-4 py-6 sm:px-6 lg:px-8">
        <MediaDropzone
          accept="video/mp4,video/quicktime,video/webm"
          onFilesSelected={handleDropzoneFilesSelected}
          totalCount={lib.assets.length}
        />

        <MediaCollectionNav
          activeCollection={activeCollection}
          onSelect={(collectionId) => {
            if (collectionId === "__all__") {
              setSearchParams({}, { replace: true });
            } else {
              setSearchParams({ collection: collectionId }, { replace: true });
            }
          }}
          collections={lib.collections}
          collectionCounts={lib.counts.byCollection}
          totalCount={lib.counts.total}
          archivedCount={lib.counts.archived}
          onCreateCollection={lib.createCollection}
          onRenameCollection={lib.renameCollection}
          onDeleteCollection={async (collectionId) => {
            const deleted = await lib.deleteCollection(collectionId);

            if (deleted && activeCollection === collectionId) {
              setSearchParams({}, { replace: true });
            }

            return deleted;
          }}
        />

        <MediaLibraryToolbar
          filter={filter}
          sort={sort}
          view={view}
          resultCount={filtered.length}
          totalCount={lib.assets.length}
          selectedCount={selectedCount}
          selectAllMatching={selectAllMatching}
          onSearch={(v) => setFilter((f) => ({ ...f, search: v }))}
          onTypeChange={(t) => setFilter((f) => ({ ...f, type: t }))}
          onStatusChange={(s) => setFilter((f) => ({ ...f, status: s }))}
          onSortChange={setSort}
          onViewChange={setView}
          onSelectAllMatching={() => void handleSelectAllMatching()}
          onClearSelection={clearSelection}
          onClearFilters={() => setFilter({ search: "", type: "all", status: "all" })}
        />

        {lib.assets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/20 bg-white/10 px-6 py-10 text-center backdrop-blur-2xl shadow-[0_18px_55px_rgba(2,6,23,0.12)]">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/20 backdrop-blur-xl">
              <Library className="h-5 w-5 text-slate-700" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-[15px] font-semibold text-slate-950">{EMPTY_PRIMARY.title}</h3>
            <p className="mx-auto mt-1.5 max-w-[460px] text-[13px] leading-6 text-slate-700">{EMPTY_PRIMARY.description}</p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleUploadVideosClick}
                className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 text-[13px] font-medium text-white shadow-[0_8px_22px_rgba(37,99,235,0.28)] hover:from-blue-700 hover:to-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <Upload className="mr-1.5 h-4 w-4" aria-hidden="true" /> Upload Videos
              </button>
              <Link
                to="/downloader"
                className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-white/20 bg-white/12 px-4 py-2 text-[13px] font-medium text-slate-800 shadow-sm backdrop-blur-xl transition hover:bg-white/22 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <Download className="mr-1.5 h-4 w-4" aria-hidden="true" /> Open Downloader
              </Link>
            </div>
            <div className="mt-5 flex items-center justify-center gap-3 text-[11px] text-slate-600">
              {EMPTY_PRIMARY.facts.map((f) => (
                <span key={f} className="flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-white/40" aria-hidden="true" />
                  {f}
                </span>
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/20 bg-white/10 px-6 py-10 text-center backdrop-blur-2xl shadow-[0_18px_55px_rgba(2,6,23,0.12)]">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/20 backdrop-blur-xl">
              <FilterX className="h-5 w-5 text-slate-700" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-[15px] font-semibold text-slate-950">
              {collectionEmptyText?.title ?? EMPTY_FILTERED.title}
            </h3>
            <p className="mx-auto mt-1.5 max-w-[460px] text-[13px] leading-6 text-slate-700">
              {collectionEmptyText?.description ?? EMPTY_FILTERED.description}
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => { setFilter({ search: "", type: "all", status: "all" }); setSearchParams({}, { replace: true }); }}
                className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-slate-950/80 px-4 py-2 text-[13px] font-medium text-white shadow-sm backdrop-blur-xl hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                Clear Filters
              </button>

            </div>
          </div>
        ) : view === "grid" ? (
          <MediaAssetGrid assets={renderedFiltered} onToggle={handleToggleSelection} onRemove={lib.removeAsset} onOpen={handleOpenDetails} />
        ) : (
          <MediaAssetList assets={renderedFiltered} onToggle={handleToggleSelection} onRemove={lib.removeAsset} onOpen={handleOpenDetails} />
        )}

        {lib.assets.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={lib.clearAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/12 px-3 py-1.5 text-[11px] font-medium text-slate-700 backdrop-blur-xl transition hover:bg-rose-500/12 hover:text-rose-700"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Clear library ({formatFileSize(lib.counts.totalSize)})
            </button>
            <span className="text-[10px] text-slate-600">
              {lib.counts.images} images {"\u2022"} {lib.counts.videos} videos {"\u2022"} {lib.counts.audio} audio
            </span>
            {lib.apiAssets.length > 0 && (
              <span className="text-[10px] text-slate-600">
                {"\u2022"} {lib.apiAssets.length} from API
              </span>
            )}
            {lib.localAssets.length > 0 && (
              <span className="text-[10px] text-slate-600">
                {"\u2022"} {lib.localAssets.length} local
              </span>
            )}
          </div>
        )}
      </div>

      {lib.assets.length > 0 && selectedCount > 0 && (
        <StickySelectionBar
          selectedCount={selectedCount}
          isAllMatchingSelected={selectAllMatching}
          onClearAllSelection={clearSelection}
          onRemoveSelected={lib.removeSelected}
          onArchiveSelected={() => {
            lib.archiveSelected();
            clearSelection();
          }}
          onRestoreSelected={() => {
            lib.restoreSelected();
            clearSelection();
          }}
          onCopyNames={handleCopyNames}
          onCopyMetadata={handleCopyMetadata}
          clipboardMsg={lib.clipboardMsg}
          collections={lib.collections}
          onMoveSelectedToCollection={lib.moveSelectedToCollection}
          onAddTagToSelected={lib.addTagToSelected}
          onPublishNow={handlePublishNow}
          onSchedule={handleSchedule}
          onDelete={handleDelete}
        />
      )}

      <MediaDetailsDrawer
        asset={detailsAsset}
        open={!!detailsKey && !!detailsAsset}
        onClose={handleCloseDetails}
        onRemove={lib.removeAsset}
        onUpdateDisplayName={lib.updateDisplayName}
        onCopy={lib.copyText}
        onAddTag={lib.addTag}
        onRemoveTag={lib.removeTag}
        collections={lib.collections}
        onMoveToCollection={lib.moveToCollection}
        onRemoveFromCollection={lib.removeFromCollection}
        onArchive={lib.archiveAsset}
        onRestore={lib.restoreAsset}
        onSetReadyToPublish={lib.setReadyToPublish}
      />

      <BulkUploadModal
        open={uploadModalOpen}
        onClose={() => {
          setUploadModalOpen(false);
          setPendingUploadFiles([]); // Clear pending files on close
        }}
        onUploadComplete={handleUploadComplete}
        initialFiles={pendingUploadFiles}
      />

      <PlatformChooserModal
        open={platformModalOpen}
        onClose={() => {
          setPlatformModalOpen(false);
          // Clear pendingTransferIds only when closing the modal without proceeding
          setPendingTransferIds([]);
        }}
        onSelectPlatform={handlePlatformSelect}
        action={platformAction}
        selectedCount={pendingTransferIds.length}
      />

      <DeleteConfirmationModal
        open={deleteModalOpen}
        onClose={() => {
          if (!deleting) setDeleteModalOpen(false);
        }}
        onConfirm={() => void handleConfirmDelete()}
        selectedCount={selectedCount}
        deleting={deleting}
      />

      <MediaDetailsModal
        asset={detailsModalAsset}
        open={detailsModalOpen}
        onClose={handleCloseDetailsModal}
      />

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {lib.clipboardMsg}
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-[60] max-w-[calc(100vw-3rem)] rounded-xl border px-4 py-3 text-[13px] font-medium text-white shadow-[0_20px_60px_rgba(2,6,23,0.35)] backdrop-blur-2xl ${
            toast.type === "error"
              ? "border-red-400/25 bg-red-950/90"
              : "border-white/10 bg-slate-950/90"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
