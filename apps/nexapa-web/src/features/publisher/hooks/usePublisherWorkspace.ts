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
import { DEMO_ACCOUNTS, ADVISORY_LIMITS } from "../publisher.constants";
import { generateId, isSupportedMime, getMediaKind, getImageMeta, getVideoMeta, createEmptyMediaMeta, analyzeCaption } from "../publisher.utils";
import { usePublisherDestinations } from "./usePublisherDestinations";

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

export function usePublisherWorkspace(activePlatform: PublisherPlatform = "facebook") {
  const { destinations: connectedDestinations, defaultAccountByPlatform } = usePublisherDestinations(activePlatform);

  const [media, setMedia] = useState<LocalMediaAsset | null>(null);
  const [caption, setCaption] = useState<string>("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [destinations, setDestinations] = useState<DestinationAccount[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(() => defaultPlatformSettings());
  const [previewPlatform, setPreviewPlatform] = useState<PublishPlatform>("tiktok");
  const [activeSettingsTab, setActiveSettingsTab] = useState<PublishPlatform>("tiktok");
  const [drafts, setDrafts] = useState<PublishDraft[]>([]);
  const [feedback, setFeedback] = useState<string>("");
  const [showDemo, setShowDemo] = useState<boolean>(false);
  const [searchDestinations, setSearchDestinations] = useState<string>("");
  const [filterPlatform, setFilterPlatform] = useState<"all" | PublishPlatform>("all");
  const urlsRef = useRef<Set<string>>(new Set());

  const revokeUrl = useCallback((url: string) => {
    try {
      if (urlsRef.current.has(url)) {
        URL.revokeObjectURL(url);
        urlsRef.current.delete(url);
      } else {
        // also try even if not tracked (safety)
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
    };
  }, [revokeAll]);

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

      // revoke previous
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

      // async meta
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
    setMedia(null);
  }, [media, revokeUrl]);

  // destinations demo loader
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

  /* eslint-disable react-hooks/set-state-in-effect */
  // Sync connected accounts from API into local destinations state
  useEffect(() => {
    if (!showDemo) setDestinations(connectedDestinations);
  }, [connectedDestinations, showDemo]);

  // Auto-select default TikTok account or single account
  useEffect(() => {
    if (defaultAccountByPlatform.size > 0 && !showDemo && destinations.length > 0 && selectedIds.size === 0) {
      const defaultAccount = activePlatform === "shopee" ? undefined : defaultAccountByPlatform.get(activePlatform as PublishPlatform);
      if (defaultAccount) {
        setSelectedIds(new Set([defaultAccount.id]));
        setFeedback(`${activePlatform} account loaded from Connected Accounts`);
        window.setTimeout(() => setFeedback(""), 3000);
      } else if (destinations.length === 1) {
        setSelectedIds(new Set([destinations[0].id]));
        setFeedback("Destination account loaded from Connected Accounts");
        window.setTimeout(() => setFeedback(""), 3000);
      }
    }
  }, [activePlatform, defaultAccountByPlatform, showDemo, destinations, selectedIds.size]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggleDestination = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(
    (ids: string[]) => {
      setSelectedIds(new Set(ids));
    },
    [],
  );

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Derived
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

  // Caption analysis
  const captionAnalysis = useMemo(() => analyzeCaption(caption), [caption]);

  // Validation
  const validationItems = useMemo((): ValidationItem[] => {
    const items: ValidationItem[] = [];

    const push = (id: string, platform: ValidationItem["platform"], label: string, severity: ValidationSeverity, message: string) => {
      items.push({ id, platform, label, severity, message });
    };

    // Global
    if (!media) {
      push("media-missing", "global", "Media selected", "action-required", "Select an image or video file locally.");
    } else {
      push("media-present", "global", "Media selected", "ready", `Local preview ready: ${media.fileName}`);
    }

    const effectiveCaption = caption.trim();
    if (!effectiveCaption && (!selectedPlatforms.includes("youtube") || !platformSettings.youtube.title.trim())) {
      push("caption-missing", "global", "Caption prepared", "action-required", "Write a caption or provide YouTube title.");
    } else {
      push("caption-ready", "global", "Caption prepared", "ready", `Caption ${captionAnalysis.trimmedLength} chars, ${captionAnalysis.hashtagCount} hashtags`);
    }

    if (selectedDestinations.length === 0) {
      push("dest-missing", "global", "Destination selected", "action-required", "Select at least one destination account draft.");
    } else {
      push("dest-present", "global", "Destination selected", "ready", `${selectedDestinations.length} destination(s) selected`);
    }

    push("backend", "global", "Backend connection", "backend-required", "Publishing backend required – no publish request will be made in this phase.");

    // Per platform
    if (selectedPlatforms.includes("tiktok")) {
      if (!media || media.kind !== "video") {
        push("tiktok-video", "tiktok", "TikTok video", "action-required", "TikTok publishing recommends video. Advisory only.");
      } else {
        push("tiktok-video-ok", "tiktok", "TikTok video", "ready", "Video selected – platform policy may vary.");
      }
      if (!platformSettings.tiktok.rightsConfirmed) {
        push("tiktok-rights", "tiktok", "Music rights confirmation", "action-required", "Confirm you have rights to use the selected media and audio.");
      } else {
        push("tiktok-rights-ok", "tiktok", "Music rights confirmation", "ready", "Rights confirmation checked");
      }
      push("tiktok-auth", "tiktok", "TikTok authorization", "backend-required", "Authorization required – OAuth will be handled by Nexapa API");
      push("tiktok-privacy", "tiktok", "TikTok privacy", "ready", `Privacy: ${platformSettings.tiktok.privacy} – advisory, final options retrieved after authorization`);
    }

    if (selectedPlatforms.includes("facebook")) {
      if (!media) {
        push("fb-media", "facebook", "Facebook media", "action-required", "Select media for Facebook post – advisory");
      } else {
        push("fb-media-ok", "facebook", "Facebook media", "ready", "Media available for Facebook – final validation in backend");
      }
      push("fb-auth", "facebook", "Meta authorization", "backend-required", "Meta OAuth and Page permissions required – backend");
    }

    if (selectedPlatforms.includes("instagram")) {
      if (!media) {
        push("ig-media", "instagram", "Instagram media", "action-required", "Select image or video for Instagram – advisory");
      } else {
        push("ig-media-ok", "instagram", "Instagram media", "ready", `Instagram ${media.kind} selected – requires professional account`);
      }
      push("ig-auth", "instagram", "Professional account", "backend-required", "Supported professional Instagram account and Meta authorization required");
    }

    if (selectedPlatforms.includes("youtube")) {
      if (!media || media.kind !== "video") {
        push("yt-video", "youtube", "YouTube video required", "action-required", "YouTube requires video. Image not supported for YouTube upload.");
      } else {
        push("yt-video-ok", "youtube", "YouTube video", "ready", "Video selected for YouTube");
      }
      if (!platformSettings.youtube.title.trim()) {
        push("yt-title", "youtube", "YouTube title", "action-required", "Provide a video title for YouTube.");
      } else {
        push("yt-title-ok", "youtube", "YouTube title", "ready", `Title prepared – advisory limit ${ADVISORY_LIMITS.youtube_title} chars`);
      }
      push("yt-auth", "youtube", "Channel authorization", "backend-required", "Google OAuth and channel upload permissions required");
    }

    return items;
  }, [media, caption, captionAnalysis, selectedDestinations, selectedPlatforms, platformSettings]);

  const summary = useMemo(() => {
    return {
      media,
      captionLength: captionAnalysis.trimmedLength,
      hashtagCount: captionAnalysis.hashtagCount,
      selectedCount: selectedDestinations.length,
      platforms: selectedPlatforms,
      hasWarnings: validationItems.some((v) => v.severity === "warning" || v.severity === "action-required"),
      draftCount: drafts.length,
      backendState: "Not connected" as const,
    };
  }, [media, captionAnalysis, selectedDestinations.length, selectedPlatforms, validationItems, drafts.length]);

  // Local drafts
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

      // Check duplicate handling – auto suffix if duplicate
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
    [drafts, media, caption, hashtags, selectedIds, platformSettings],
  );

  const loadDraft = useCallback(
    (id: string) => {
      const draft = drafts.find((d) => d.id === id);
      if (!draft) return;

      // Restore caption, hashtags, destinations, settings
      // For media file ref, if still present in memory we could re-create preview? But we stored File ref only
      // We'll keep existing media if draft has file ref and current media null, else ask user to re-select? For simplicity, restore if file ref exists
      setCaption(draft.caption);
      setHashtags(draft.hashtags);
      setPlatformSettings(draft.platformSettings);
      setSelectedIds(new Set(draft.selectedDestinationIds));

      if (draft.mediaFileRef && !media) {
        // Recreate preview from stored File ref
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
      if (media?.previewUrl) revokeUrl(media.previewUrl);
      setMedia(null);
      setCaption("");
      setHashtags([]);
      setSelectedIds(new Set());
      setPlatformSettings(defaultPlatformSettings());
      setFeedback("Composer reset");
      window.setTimeout(() => setFeedback(""), 2500);
    },
    [media, caption, selectedIds, revokeUrl],
  );

  const updateHashtagsFromCaption = useCallback(() => {
    const analysis = analyzeCaption(caption);
    // Deduplicate already existing hashtags logic in helper? Keep analysis hashtags as source
    // Merge with existing custom additions? For simplicity, analysis provides hashtags
    setHashtags(analysis.hashtags);
  }, [caption]);

  return {
    media,
    caption,
    setCaption,
    hashtags,
    setHashtags,
    destinations,
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
    summary,
    captionAnalysis,
    handleMediaFiles,
    clearMedia,
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
    updateHashtagsFromCaption,
    revokeUrl,
  };
}
