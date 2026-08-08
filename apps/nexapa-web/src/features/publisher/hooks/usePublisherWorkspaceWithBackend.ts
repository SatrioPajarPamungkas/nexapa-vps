import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  DestinationAccount,
  LocalMediaAsset,
  PlatformSettings,
  PublishDraft,
  PublishPlatform,
  PublisherPlatform,
  PublisherMediaKind,
  ValidationItem,
  ValidationSeverity,
} from "../publisher.types";
import { DEMO_ACCOUNTS } from "../publisher.constants";
import { generateId, isSupportedMime, getMediaKind, getImageMeta, getVideoMeta, createEmptyMediaMeta, analyzeCaption } from "../publisher.utils";
import { usePublisherDestinations } from "./usePublisherDestinations";
import { uploadMediaFile, type MediaAsset, type MediaUploadProgress } from "@/lib/api/media-upload";
import type { ApiMediaAsset } from "@/lib/api/response.types";
import { createPublisherPost, getPublisherPost, getCreatorInfo, type CreatePostPayload } from "@/lib/api/publisher";
import { ApiError } from "@/lib/api/errors";
import { PRIVACY_LEVEL_MAP } from "../publisher.types";

function defaultPlatformSettings(): PlatformSettings {
  return {
    tiktok: {
      privacy: "only_me",
      interaction: { allowComments: true, allowDuet: false, allowStitch: false },
      disclosure: { brandedContent: false, promotionalContent: false },
      rightsConfirmed: false,
      captionOverrideEnabled: false,
      captionOverride: "",
      creatorInfo: null,
      isLoadingCreatorInfo: false,
    },
    facebook: {
      postType: "text" as const,
      destination: "page_timeline" as const,
      visibility: "published" as const,
      allowComments: true,
      includeLinkPreview: true,
      captionOverrideEnabled: false,
      captionOverride: "",
    },
    instagram: {
      mode: "reel",
      shareToFeed: true,
      disableComments: false,
      addFirstCommentHashtags: false,
      captionOverrideEnabled: false,
      captionOverride: "",
    },
    youtube: {
      title: "",
      description: "",
      visibility: "private",
      category: "People & Blogs",
      madeForKids: "no",
      tags: "",
      captionOverrideEnabled: false,
      captionOverride: "",
    },
  };
}

export type MediaUploadState = "idle" | "uploading" | "stored" | "failed";

export type PublishAction = "draft" | "publish_now" | "schedule";

export type PublishingState = "idle" | "submitting" | "queued" | "uploading" | "processing" | "completed" | "failed";

export function usePublisherWorkspaceWithBackend(activePlatform: PublisherPlatform) {
  const { destinations: connectedDestinations, defaultAccountByPlatform, refetch: refetchDestinations, loading: destinationsLoading } = usePublisherDestinations(activePlatform);

  const [media, setMedia] = useState<LocalMediaAsset | null>(null);
  const [serverMedia, setServerMedia] = useState<MediaAsset | null>(null);
  const [uploadState, setUploadState] = useState<MediaUploadState>("idle");
  const [uploadProgress, setUploadProgress] = useState<MediaUploadProgress>({ loaded: 0, total: 0, percent: 0 });
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const hydrateExistingMediaAsset = useCallback((asset: ApiMediaAsset) => {
    const mapped: MediaAsset = {
      id: asset.id,
      original_filename: asset.original_name,
      mime_type: asset.mime_type,
      media_type: asset.media_type,
      size_bytes: asset.size_bytes,
      status: asset.status,
      width: asset.width,
      height: asset.height,
      duration_seconds: asset.duration_seconds,
      content_url: asset.content_url,
      created_at: asset.created_at,
    };
    setServerMedia(mapped);
    setUploadState("stored");
    setUploadProgress({ loaded: asset.size_bytes, total: asset.size_bytes, percent: 100 });
    setUploadError(null);
    setFeedback("Media loaded from Media Library");
    setTimeout(() => setFeedback(""), 3000);
  }, []);
  
  const [caption, setCaption] = useState<string>("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [destinations, setDestinations] = useState<DestinationAccount[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(() => defaultPlatformSettings());
  const [previewPlatform, setPreviewPlatform] = useState<PublishPlatform>("facebook");
  const [activeSettingsTab, setActiveSettingsTab] = useState<PublishPlatform>("facebook");
  const [drafts, setDrafts] = useState<PublishDraft[]>([]);
  const [feedback, setFeedback] = useState<string>("");
  const [showDemo, setShowDemo] = useState<boolean>(false);
  const [searchDestinations, setSearchDestinations] = useState<string>("");
  const [filterPlatform, setFilterPlatform] = useState<"all" | PublishPlatform>("all");
  
  const [publishingState, setPublishingState] = useState<PublishingState>("idle");
  const [currentPostId, setCurrentPostId] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishFieldErrors, setPublishFieldErrors] = useState<Record<string, string[]>>({});
  
  const urlsRef = useRef<Set<string>>(new Set());
  const uploadAbortRef = useRef<AbortController | null>(null);
  const submitInFlightRef = useRef(false);

  const revokeUrl = useCallback((url: string) => {
    try {
      if (urlsRef.current.has(url)) {
        URL.revokeObjectURL(url);
        urlsRef.current.delete(url);
      } else {
        URL.revokeObjectURL(url);
      }
    } catch {
      // ignore
    }
  }, []);

  const revokeAll = useCallback(() => {
    for (const u of urlsRef.current) {
      try {
        URL.revokeObjectURL(u);
      } catch {
        // ignore
      }
    }
    urlsRef.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      revokeAll();
      if (uploadAbortRef.current) {
        uploadAbortRef.current.abort();
      }
    };
  }, [revokeAll]);

  useEffect(() => {
    if (!currentPostId) return;

    const controller = new AbortController();
    let attempts = 0;
    let terminal = false;
    const poll = async () => {
      try {
        const response = await getPublisherPost(currentPostId, controller.signal);
        const status = response.data.status as PublishingState;
        if (["queued", "uploading", "processing", "completed", "failed"].includes(status)) {
          setPublishingState(status);
        }
        terminal = status === "completed" || status === "failed";
        if (status === "failed") {
          setPublishError(response.data.failure_message || "Publishing failed.");
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setPublishError(error instanceof ApiError ? error.message : "Could not refresh publishing status.");
        }
      }
    };

    void poll();
    const interval = window.setInterval(() => {
      attempts += 1;
      if (terminal || attempts >= 20) {
        window.clearInterval(interval);
        return;
      }
      void poll();
    }, 3000);

    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [currentPostId]);

  const handleMediaFiles = useCallback(
    async (files: FileList | File[], expectedMediaKind: PublisherMediaKind) => {
      const list = Array.from(files);
      if (list.length !== 1) return { added: false, reason: `Select exactly one ${expectedMediaKind} file.` };
      const file = list[0];
      if (!file) return { added: false, reason: "No file" };

      if (file.size === 0) {
        return { added: false, reason: "Empty file rejected" };
      }

      if (!isSupportedMime(file.type)) {
        return { added: false, reason: `Unsupported MIME ${file.type || "unknown"}` };
      }

      const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
      const allowedExtensions = expectedMediaKind === "image" ? [".jpg", ".jpeg", ".png", ".webp"] : [".mp4", ".mov", ".webm"];
      if (getMediaKind(file.type) !== expectedMediaKind || !allowedExtensions.includes(extension)) {
        return { added: false, reason: `Select exactly one supported ${expectedMediaKind} file.` };
      }

      if (media?.previewUrl) {
        revokeUrl(media.previewUrl);
      }

      const previewUrl = URL.createObjectURL(file);
      urlsRef.current.add(previewUrl);

      const kind = getMediaKind(file.type);

      const asset: LocalMediaAsset = {
        id: generateId("media"),
        file,
        kind,
        mimeType: file.type,
        fileName: file.name,
        fileSize: file.size,
        previewUrl,
        width: null,
        height: null,
        duration: null,
        addedAt: Date.now(),
      };

      setMedia(asset);
      setUploadState("uploading");
      setUploadProgress({ loaded: 0, total: file.size, percent: 0 });
      setUploadError(null);
      setServerMedia(null);

      if (uploadAbortRef.current) {
        uploadAbortRef.current.abort();
      }
      const controller = new AbortController();
      uploadAbortRef.current = controller;

      try {
        const asset = await uploadMediaFile(
          file,
          expectedMediaKind,
          (progress) => {
            setUploadProgress(progress);
          },
          controller.signal
        );

        if (uploadAbortRef.current !== controller) return { added: true };
        if (!asset.id) {
          throw new Error("Server returned an invalid media response.");
        }

        setServerMedia(asset);
        setUploadState("stored");
        setUploadProgress({ loaded: asset.size_bytes, total: asset.size_bytes, percent: 100 });
        setUploadError(null);
        setFeedback("Stored on server");
        setTimeout(() => setFeedback(""), 3000);
      } catch (error) {
        if (uploadAbortRef.current !== controller) return { added: true };
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setUploadState("failed");
          setUploadError(error instanceof Error ? error.message : "Upload failed");
          setFeedback("Upload failed");
          setTimeout(() => setFeedback(""), 3000);
        }
      } finally {
        if (uploadAbortRef.current === controller) {
          uploadAbortRef.current = null;
          setUploadState((state) => state === "uploading" ? "idle" : state);
        }
      }

      if (kind === "image") {
        try {
          const meta = await getImageMeta(previewUrl);
          setMedia((prev) => (prev && prev.id === asset.id ? { ...prev, width: meta.width, height: meta.height } : prev));
        } catch {
          // keep without meta
        }
      } else if (kind === "video") {
        try {
          const meta = await getVideoMeta(previewUrl);
          setMedia((prev) => (prev && prev.id === asset.id ? { ...prev, width: meta.width, height: meta.height, duration: meta.duration } : prev));
        } catch {
          // keep
        }
      }

      return { added: true };
    },
    [media, revokeUrl],
  );

  const clearMedia = useCallback(() => {
    if (media?.previewUrl) revokeUrl(media.previewUrl);
    if (uploadAbortRef.current) {
      uploadAbortRef.current.abort();
    }
    setMedia(null);
    setServerMedia(null);
    setUploadState("idle");
    setUploadProgress({ loaded: 0, total: 0, percent: 0 });
    setUploadError(null);
  }, [media, revokeUrl]);

  const retryUpload = useCallback(async () => {
    if (!media?.file || uploadState !== "failed") return;

    setUploadState("uploading");
    setUploadError(null);
    const controller = new AbortController();
    uploadAbortRef.current = controller;

    try {
      const asset = await uploadMediaFile(
        media.file,
        media.kind === "image" ? "image" : "video",
        (progress) => {
          setUploadProgress(progress);
        },
        controller.signal
      );

      if (uploadAbortRef.current !== controller) return;
      if (!asset.id) {
        throw new Error("Server returned an invalid media response.");
      }

      setServerMedia(asset);
      setUploadState("stored");
      setUploadProgress({ loaded: asset.size_bytes, total: asset.size_bytes, percent: 100 });
      setUploadError(null);
      setFeedback("Stored on server");
      setTimeout(() => setFeedback(""), 3000);
    } catch (error) {
      if (uploadAbortRef.current === controller && !(error instanceof DOMException && error.name === "AbortError")) {
        setUploadState("failed");
        setUploadError(error instanceof Error ? error.message : "Upload failed");
        setFeedback("Upload failed");
        setTimeout(() => setFeedback(""), 3000);
      }
    } finally {
      if (uploadAbortRef.current === controller) {
        uploadAbortRef.current = null;
        setUploadState((state) => state === "uploading" ? "idle" : state);
      }
    }
  }, [media, uploadState]);

  const loadDemoDestinations = useCallback(() => {
    if (showDemo) return;
    const demoAccounts: DestinationAccount[] = DEMO_ACCOUNTS.map((d, idx) => ({
      id: generateId(`demo_${d.platform}`),
      platform: d.platform,
      label: d.label + (idx > 3 ? ` ${idx - 3}` : ""),
      identifier: d.identifier,
      avatarUrl: null,
      status: "demo" as const,
      isDefault: idx === 0,
      isDemo: true,
    }));
    setDestinations((prev) => [...prev, ...demoAccounts]);
    setShowDemo(true);
    setFeedback("Demo destinations loaded — all marked DEMO");
    window.setTimeout(() => setFeedback(""), 3000);
  }, [showDemo]);

  const clearDemo = useCallback(() => {
    setDestinations((prev) => prev.filter((d) => !d.isDemo));
    setSelectedIds((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        const acc = destinations.find((d) => d.id === id);
        if (acc && !acc.isDemo) next.add(id);
      }
      return next;
    });
    setShowDemo(false);
    setFeedback("Demo destinations cleared");
    window.setTimeout(() => setFeedback(""), 2500);
  }, [destinations]);

  useEffect(() => {
    if (!showDemo) setDestinations(connectedDestinations);
  }, [connectedDestinations, showDemo]);

  useEffect(() => {
    if (showDemo) return;
    const validIds = new Set(destinations.map((destination) => destination.id));
    const currentIsValid = selectedIds.size > 0 && Array.from(selectedIds).every((id) => validIds.has(id));
    if (currentIsValid) return;

    const defaultAccount = activePlatform === "shopee" ? undefined : defaultAccountByPlatform.get(activePlatform as PublishPlatform);
    const fallback = defaultAccount ?? destinations[0];
    if (!fallback && selectedIds.size === 0) return;
    setSelectedIds(fallback ? new Set([fallback.id]) : new Set());
  }, [activePlatform, defaultAccountByPlatform, showDemo, destinations, selectedIds]);

  const toggleDestination = useCallback((id: string) => {
    setSelectedIds((prev) => {
      if (activePlatform === "facebook") return prev.has(id) ? new Set() : new Set([id]);
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, [activePlatform]);

  const selectAllVisible = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedDestinations = useMemo(() => {
    return destinations.filter((d) => selectedIds.has(d.id));
  }, [destinations, selectedIds]);

  const selectedPlatforms = useMemo(() => {
    const set = new Set<PublishPlatform>();
    for (const d of selectedDestinations) set.add(d.platform);
    return Array.from(set);
  }, [selectedDestinations]);

  const filteredDestinations = useMemo(() => {
    let list = [...destinations];
    const term = searchDestinations.trim().toLowerCase();
    if (term) {
      list = list.filter((d) => `${d.label} ${d.identifier}`.toLowerCase().includes(term));
    }
    if (filterPlatform !== "all") {
      list = list.filter((d) => d.platform === filterPlatform);
    }
    return list;
  }, [destinations, searchDestinations, filterPlatform]);

  const captionAnalysis = useMemo(() => analyzeCaption(caption), [caption]);

  const validationItems = useMemo((): ValidationItem[] => {
    const items: ValidationItem[] = [];

    const push = (id: string, platform: ValidationItem["platform"], label: string, severity: ValidationSeverity, message: string) => {
      items.push({ id, platform, label, severity, message });
    };

    const facebookTextPost = activePlatform === "facebook" && platformSettings.facebook.postType === "text";
    if (!media && !facebookTextPost) {
      push("media-missing", "global", "Media selected", "action-required", "Select an image or video file locally.");
    } else if (media) {
      push("media-present", "global", "Media selected", "ready", `Local preview ready: ${media.fileName}`);
    }

    if (uploadState === "uploading") {
      push("upload-progress", "global", "Server upload", "action-required", `Uploading to server… ${uploadProgress.percent}%`);
    } else if (uploadState === "failed") {
      push("upload-failed", "global", "Server upload", "action-required", "Upload failed. Retry or select another file.");
    } else if (uploadState === "stored") {
      push("upload-stored", "global", "Server upload", "ready", "Stored on server");
    }

    const effectiveCaption = caption.trim();
    if (!effectiveCaption && (!selectedPlatforms.includes("youtube") || !platformSettings.youtube.title.trim())) {
      push("caption-missing", "global", "Caption prepared", "action-required", "Write a caption or provide YouTube title.");
    } else {
      push("caption-ready", "global", "Caption prepared", "ready", `Caption ${captionAnalysis.trimmedLength} chars, ${captionAnalysis.hashtagCount} hashtags`);
    }

    if (selectedDestinations.length === 0) {
      push("dest-missing", "global", "Destination selected", "action-required", "Select at least one destination account.");
    } else {
      push("dest-present", "global", "Destination selected", "ready", `${selectedDestinations.length} destination(s) selected`);
    }

    if (selectedPlatforms.includes("tiktok")) {
      if (!media || media.kind !== "video") {
        push("tiktok-video", "tiktok", "TikTok video", "action-required", "TikTok publishing requires video.");
      } else {
        push("tiktok-video-ok", "tiktok", "TikTok video", "ready", "Video selected");
      }
      if (!platformSettings.tiktok.rightsConfirmed) {
        push("tiktok-rights", "tiktok", "Music rights confirmation", "action-required", "Confirm you have rights to use the selected media and audio.");
      } else {
        push("tiktok-rights-ok", "tiktok", "Music rights confirmation", "ready", "Rights confirmation checked");
      }
    }

    if (selectedPlatforms.includes("facebook")) {
      const fbPostType = platformSettings.facebook.postType;
      
      if (fbPostType === "text") {
        if (!caption.trim()) {
          push("fb-text-missing", "facebook", "Facebook message", "action-required", "Text post requires a message/caption.");
        } else {
          push("fb-text-ok", "facebook", "Facebook message", "ready", "Message ready");
        }
      } else if (fbPostType === "image") {
        if (!media || media.kind !== "image") {
          push("fb-image-missing", "facebook", "Facebook image", "action-required", "Image post requires an image.");
        } else {
          push("fb-image-ok", "facebook", "Facebook image", "ready", "Image ready");
        }
      } else if (fbPostType === "video") {
        if (!media || media.kind !== "video") {
          push("fb-video-missing", "facebook", "Facebook video", "action-required", "Video post requires a video.");
        } else {
          push("fb-video-ok", "facebook", "Facebook video", "ready", "Video ready");
        }
      }
    }

    if (selectedPlatforms.includes("youtube")) {
      if (!media || media.kind !== "video") {
        push("yt-video", "youtube", "YouTube video required", "action-required", "YouTube requires video.");
      }
      if (!platformSettings.youtube.title.trim()) {
        push("yt-title", "youtube", "YouTube title", "action-required", "Provide a video title for YouTube.");
      }
    }

    return items;
  }, [activePlatform, media, uploadState, uploadProgress, caption, captionAnalysis, selectedDestinations, selectedPlatforms, platformSettings]);

  const canPublish = useMemo(() => {
    const hasTikTok = selectedPlatforms.includes("tiktok");
    const hasFacebook = selectedPlatforms.includes("facebook");
    
    const hasTikTokIssues = hasTikTok && validationItems.some((v) => v.severity === "action-required" && v.platform === "tiktok");
    const hasFacebookIssues = hasFacebook && validationItems.some((v) => v.severity === "action-required" && v.platform === "facebook");
    
    const facebookTextPost = activePlatform === "facebook" && platformSettings.facebook.postType === "text";
    const mediaReady = facebookTextPost
      ? !media && uploadState !== "uploading"
      : uploadState === "stored" && Boolean(serverMedia?.id);
    const accountMatchesPlatform = selectedDestinations.length === 1 && selectedDestinations[0].platform === activePlatform;
    return (
      mediaReady &&
      accountMatchesPlatform &&
      selectedDestinations.length > 0 &&
      !hasTikTokIssues &&
      !hasFacebookIssues
    );
  }, [activePlatform, uploadState, serverMedia, media, selectedDestinations, selectedPlatforms, validationItems, platformSettings.facebook.postType]);

  const canSchedule = useMemo(() => {
    return canPublish;
  }, [canPublish]);

  const fetchCreatorInfo = useCallback(
    async (accountId: string) => {
      setPlatformSettings((prev: PlatformSettings) => ({
        ...prev,
        tiktok: { ...prev.tiktok, isLoadingCreatorInfo: true },
      }));
      
      try {
        const response = await getCreatorInfo(accountId);
        const creatorInfo = response.data;
        
        setPlatformSettings((prev: PlatformSettings) => ({
          ...prev,
          tiktok: {
            ...prev.tiktok,
            creatorInfo,
            isLoadingCreatorInfo: false,
          },
        }));
        
        return creatorInfo;
      } catch (error) {
        setPlatformSettings((prev: PlatformSettings) => ({
          ...prev,
          tiktok: { ...prev.tiktok, isLoadingCreatorInfo: false },
        }));
        setFeedback("Failed to load TikTok Creator Info");
        setTimeout(() => setFeedback(""), 3000);
        return null;
      }
    },
    [],
  );

  const resetComposerAfterSuccess = useCallback(() => {
    if (media?.previewUrl) revokeUrl(media.previewUrl);
    if (uploadAbortRef.current) {
      uploadAbortRef.current.abort();
    }
    setMedia(null);
    setServerMedia(null);
    setUploadState("idle");
    setUploadProgress({ loaded: 0, total: 0, percent: 0 });
    setUploadError(null);
    setCaption("");
    setHashtags([]);
    setSelectedIds(new Set());
    setPlatformSettings(defaultPlatformSettings());
    setPublishingState("idle");
    setCurrentPostId(null);
    setPublishError(null);
    setPublishFieldErrors({});
  }, [media, revokeUrl]);

  const submitPublish = useCallback(
    async (action: PublishAction, scheduledAt?: string, providerMode?: "direct_post" | "upload_as_draft") => {
      if (submitInFlightRef.current) return null;

      if (!canPublish) {
        setFeedback("Cannot publish - requirements not met");
        return null;
      }

      const selectedAccount = selectedDestinations[0];
      if (!selectedAccount) {
        setFeedback("No destination account selected");
        return null;
      }

      const platform = activePlatform;
      if (platform === "facebook" && (selectedAccount.platform !== "facebook" || selectedAccount.accountType !== "facebook_page")) {
        setFeedback("Select a connected Facebook Page before publishing");
        return null;
      }
      if (platform === "tiktok" && selectedAccount.platform !== "tiktok") {
        setFeedback("Select a connected TikTok account before publishing");
        return null;
      }

      submitInFlightRef.current = true;
      setPublishingState("submitting");
      setPublishError(null);
      setPublishFieldErrors({});

      try {
        let submitAction: "draft" | "publish_now" | "schedule" = action;
        let providerModeValue: "direct_post" | "upload_as_draft" | undefined = undefined;
        let privacyLevel: string | undefined = undefined;
        let disableComment = false;
        let disableDuet = false;
        let disableStitch = false;
        let brandContentToggle = false;
        let brandOrganicToggle = false;

        if (platform === "tiktok") {
          const tiktokSettings = platformSettings.tiktok;
          const isTikTokDraft = action === "publish_now" && providerMode === "upload_as_draft";
          const isInternalDraft = action === "draft";
          const isDirectPost = action === "publish_now" && providerMode === "direct_post";
          const isSchedule = action === "schedule";
          
          if (isTikTokDraft) {
            submitAction = "publish_now";
            providerModeValue = "upload_as_draft";
          } else if (isInternalDraft) {
            submitAction = "draft";
            providerModeValue = undefined;
          } else if (isDirectPost) {
            submitAction = "publish_now";
            providerModeValue = "direct_post";
            privacyLevel = PRIVACY_LEVEL_MAP[tiktokSettings.privacy] || "SELF_ONLY";
          } else if (isSchedule) {
            submitAction = "schedule";
            providerModeValue = "direct_post";
            privacyLevel = PRIVACY_LEVEL_MAP[tiktokSettings.privacy] || "SELF_ONLY";
          }

          if (providerModeValue === "direct_post") {
            disableComment = !tiktokSettings.interaction.allowComments;
            disableDuet = !tiktokSettings.interaction.allowDuet;
            disableStitch = !tiktokSettings.interaction.allowStitch;
            brandContentToggle = tiktokSettings.disclosure.brandedContent;
            brandOrganicToggle = tiktokSettings.disclosure.promotionalContent;
          }
        } else if (platform === "facebook") {
          const fbSettings = platformSettings.facebook;
          submitAction = action === "draft" ? "draft" : "publish_now";
          providerModeValue = action === "draft" ? undefined : "direct_post";
          
          if (providerModeValue === "direct_post") {
            privacyLevel = fbSettings.visibility === "published" ? "PUBLISHED" : "UNPUBLISHED";
            disableComment = !fbSettings.allowComments;
          }

          if (fbSettings.postType === "text" && !caption.trim()) {
            setFeedback("Text post requires a message");
            setPublishingState("idle");
            submitInFlightRef.current = false;
            return null;
          }

          if (fbSettings.postType === "image" && (!media || media.kind !== "image")) {
            setFeedback("Image post requires an image");
            setPublishingState("idle");
            submitInFlightRef.current = false;
            return null;
          }

          if (fbSettings.postType === "video" && (!media || media.kind !== "video")) {
            setFeedback("Video post requires a video");
            setPublishingState("idle");
            submitInFlightRef.current = false;
            return null;
          }
        }
        
        const payload: CreatePostPayload = {
          platform:
            platform === "facebook" || platform === "tiktok"
              ? platform
              : undefined,
          connected_account_id: selectedAccount.id,
          media_asset_id: serverMedia?.id,
          post_type: platform === "facebook" ? platformSettings.facebook.postType : undefined,
          caption: caption.trim() || undefined,
          platform_settings: platform === "facebook" ? { post_type: platformSettings.facebook.postType } : undefined,
          action: submitAction,
          provider_mode: providerModeValue,
          privacy_level: privacyLevel,
          disable_comment: disableComment,
          disable_duet: disableDuet,
          disable_stitch: disableStitch,
          brand_content_toggle: brandContentToggle,
          brand_organic_toggle: brandOrganicToggle,
          scheduled_at: submitAction === "publish_now" ? null : scheduledAt ?? null,
        };

        const response = await createPublisherPost(payload);
        setCurrentPostId(response.data.id);
        setPublishingState(action === "publish_now" ? "queued" : action === "schedule" ? "uploading" : "idle");
        
        let message = "";
        if (platform === "tiktok") {
          message = action === "draft"
            ? "Uploaded to TikTok drafts. Open TikTok inbox to continue editing and post."
            : action === "publish_now"
            ? "Queued for publishing to TikTok."
            : action === "schedule"
            ? `Scheduled for publishing`
            : "Draft saved.";
        } else if (platform === "facebook") {
          message = action === "draft"
            ? "Draft saved."
            : action === "schedule"
            ? `Scheduled for publishing`
            : "Queued for publishing to Facebook.";
        }
        
        setFeedback(message);
        setTimeout(() => setFeedback(""), 4000);
        
        if (action === "publish_now" || action === "schedule") {
          resetComposerAfterSuccess();
        }
        
        return response.data;
      } catch (error) {
        let errorMessage = "Failed to create post";
        if (error instanceof ApiError) {
          if (error.code === "tiktok_reconnect_required") {
            errorMessage = "Reconnect TikTok to grant publishing permission.";
          } else if (error.code === "facebook_reconnect_required") {
            errorMessage = "Reconnect Facebook to grant publishing permission.";
          } else if (error.errors) {
            errorMessage = Object.values(error.errors).flat()[0] || error.message || errorMessage;
          } else {
            errorMessage = error.message || errorMessage;
          }
          setPublishFieldErrors(error.errors ?? {});
        }
        setPublishError(errorMessage);
        setPublishingState("failed");
        setFeedback(errorMessage);
        setTimeout(() => setFeedback(""), 5000);
        return null;
      } finally {
        submitInFlightRef.current = false;
      }
    },
    [activePlatform, canPublish, serverMedia, selectedDestinations, caption, platformSettings, media, resetComposerAfterSuccess],
  );

  const saveLocalDraft = useCallback(
    (name: string) => {
      if (drafts.length >= 20) {
        setFeedback("Maximum 20 local drafts reached");
        window.setTimeout(() => setFeedback(""), 3000);
        return null;
      }
      const trimmedName = name.trim();
      if (!trimmedName) {
        setFeedback("Draft name required");
        window.setTimeout(() => setFeedback(""), 2500);
        return null;
      }
      if (trimmedName.length > 80) {
        setFeedback("Draft name max 80 characters");
        window.setTimeout(() => setFeedback(""), 2500);
        return null;
      }

      let finalName = trimmedName;
      const existingNames = new Set(drafts.map((d) => d.name.toLowerCase()));
      if (existingNames.has(finalName.toLowerCase())) {
        let suffix = 2;
        while (existingNames.has(`${finalName} ${suffix}`.toLowerCase())) suffix += 1;
        finalName = `${finalName} ${suffix}`;
      }

      const now = Date.now();
      const draft: PublishDraft = {
        id: generateId("draft"),
        name: finalName,
        platform: activePlatform,
        mediaMeta: createEmptyMediaMeta(media),
        mediaFileRef: media?.file ?? null,
        caption,
        hashtags: [...hashtags],
        selectedDestinationIds: Array.from(selectedIds),
        platformSettings,
        createdAt: now,
        updatedAt: now,
      };

      setDrafts((prev) => [...prev, draft]);
      setFeedback(`Local draft "${finalName}" saved in memory`);
      window.setTimeout(() => setFeedback(""), 3000);
      return draft;
    },
    [activePlatform, drafts, media, caption, hashtags, selectedIds, platformSettings],
  );

  const loadDraft = useCallback(
    (id: string) => {
      const draft = drafts.find((d) => d.id === id);
      if (!draft) return;

      setCaption(draft.caption);
      setHashtags(draft.hashtags);
      setPlatformSettings(draft.platformSettings);
      setSelectedIds(new Set(draft.selectedDestinationIds));

      if (draft.mediaFileRef && !media) {
        const file = draft.mediaFileRef;
        const previewUrl = URL.createObjectURL(file);
        urlsRef.current.add(previewUrl);
        const kind = getMediaKind(file.type) as never;
        const asset: LocalMediaAsset = {
          id: generateId("media"),
          file,
          kind,
          mimeType: file.type,
          fileName: file.name,
          fileSize: file.size,
          previewUrl,
          width: draft.mediaMeta?.width ?? null,
          height: draft.mediaMeta?.height ?? null,
          duration: draft.mediaMeta?.duration ?? null,
          addedAt: Date.now(),
        };
        setMedia(asset);
      }

      setFeedback(`Draft "${draft.name}" loaded`);
      window.setTimeout(() => setFeedback(""), 3000);
      return draft;
    },
    [drafts, media],
  );

  const duplicateDraft = useCallback(
    (id: string) => {
      const draft = drafts.find((d) => d.id === id);
      if (!draft) return;
      const now = Date.now();
      const copy: PublishDraft = {
        ...draft,
        id: generateId("draft"),
        name: `${draft.name} Copy`,
        createdAt: now,
        updatedAt: now,
      };
      if (drafts.length >= 20) {
        setFeedback("Maximum 20 drafts reached");
        window.setTimeout(() => setFeedback(""), 2500);
        return;
      }
      setDrafts((prev) => [...prev, copy]);
      setFeedback(`Draft duplicated: ${copy.name}`);
      window.setTimeout(() => setFeedback(""), 2500);
    },
    [drafts],
  );

  const deleteDraft = useCallback((id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    setFeedback("Local draft deleted");
    window.setTimeout(() => setFeedback(""), 2500);
  }, []);

  const resetComposer = useCallback(
    (confirmIfContent: boolean) => {
      if (confirmIfContent) {
        const hasContent = !!media || !!caption.trim() || selectedIds.size > 0;
        if (hasContent) {
          const ok = window.confirm("Reset composer? This will clear media, caption, and destination selection.");
          if (!ok) return;
        }
      }
      resetComposerAfterSuccess();
      setFeedback("Composer reset");
      window.setTimeout(() => setFeedback(""), 2500);
    },
    [media, caption, selectedIds, resetComposerAfterSuccess],
  );

  const resetForPlatform = useCallback(() => {
    clearMedia();
    setHashtags([]);
    setSelectedIds(new Set());
    setPlatformSettings(defaultPlatformSettings());
    setSearchDestinations("");
    setPublishingState("idle");
    setCurrentPostId(null);
    setPublishError(null);
    setPublishFieldErrors({});
  }, [clearMedia]);

  const updateHashtagsFromCaption = useCallback(() => {
    const analysis = analyzeCaption(caption);
    setHashtags(analysis.hashtags);
  }, [caption]);

  return {
    media,
    serverMedia,
    uploadState,
    uploadProgress,
    uploadError,
    hydrateExistingMediaAsset,
    caption,
    setCaption,
    hashtags,
    setHashtags,
    destinations,
    defaultAccountByPlatform,
    refetchDestinations,
    loading: destinationsLoading,
    selectedIds,
    selectedDestinations,
    selectedPlatforms,
    filteredDestinations,
    platformSettings,
    setPlatformSettings,
    previewPlatform,
    setPreviewPlatform,
    activeSettingsTab,
    setActiveSettingsTab,
    drafts,
    feedback,
    searchDestinations,
    setSearchDestinations,
    filterPlatform,
    setFilterPlatform,
    showDemo,
    validationItems,
    canPublish,
    canSchedule,
    publishingState,
    publishError,
    publishFieldErrors,
    currentPostId,
    handleMediaFiles,
    clearMedia,
    retryUpload,
    loadDemoDestinations,
    clearDemo,
    toggleDestination,
    selectAllVisible,
    clearSelection,
    saveLocalDraft,
    loadDraft,
    duplicateDraft,
    deleteDraft,
    resetComposer,
    resetForPlatform,
    updateHashtagsFromCaption,
    submitPublish,
    fetchCreatorInfo,
    revokeUrl,
  };
}
