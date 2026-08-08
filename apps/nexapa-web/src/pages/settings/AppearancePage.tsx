import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { useAppearance } from "@/features/appearance/AppearanceContext";
import { useAuth } from "@/features/auth/AuthContext";
import {
  BUILTIN_PRESETS,
  ANIMATED_PRESETS,
  PRESET_MAP,
} from "@/features/appearance/appearance.presets";
import type {
  AppearanceThemeData,
  AppearanceThemeListItem,
} from "@/features/appearance/appearance.types";
import { DEFAULT_APPEARANCE } from "@/features/appearance/appearance.types";
import * as appearanceApi from "@/lib/api/appearance";
import { cn } from "@/lib/cn";
import {
  Check,
  Upload,
  Trash2,
  Image as ImageIcon,
  Sparkles,
  Monitor,
  Loader2,
  Eye,
  EyeOff,
  X,
  AlertTriangle,
  Building2,
} from "lucide-react";

type TabType = "profile" | "appearance";

type DraftTheme = AppearanceThemeData;

function cloneTheme(t: AppearanceThemeData): DraftTheme {
  return { ...t };
}

function buildCreatePayloadFromDraft(d: DraftTheme) {
  return {
    name: d.name,
    background_type: d.background_type,
    preset_key: d.preset_key,
    background_position: d.background_position,
    background_size: d.background_size,
    background_attachment: d.background_attachment ?? "fixed",
    card_opacity: d.card_opacity,
    card_blur: d.card_blur,
    sidebar_opacity: d.sidebar_opacity,
    topbar_opacity: d.topbar_opacity,
    overlay_opacity: d.overlay_opacity,
    animation_speed: d.animation_speed,
    motion_intensity: d.motion_intensity,
  };
}

export function AppearancePage() {
  const { theme: activeTheme, refresh, setThemeData } = useAppearance();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("appearance");

  // Scope: 'user' or 'company'
  const isAdmin = user?.role === "admin" || user?.is_admin === true || (user as any)?.is_admin === 1;
  const [activeScope, setActiveScope] = useState<"user" | "company">("user");

  // Theme library
  const [themes, setThemes] = useState<AppearanceThemeListItem[]>([]);
  const [loadingThemes, setLoadingThemes] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Company theme state
  const [companyThemes, setCompanyThemes] = useState<AppearanceThemeListItem[]>([]);
  const [companyActiveTheme, setCompanyActiveTheme] = useState<AppearanceThemeData | null>(null);
  const [loadingCompanyThemes, setLoadingCompanyThemes] = useState(false);

  // Draft
  const [draft, setDraft] = useState<DraftTheme>(() =>
    cloneTheme(activeTheme)
  );
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [selectedUploadId, setSelectedUploadId] = useState<number | null>(null);

  // Actions
  const [applying, setApplying] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    name: string;
    size: string;
    resolution?: string;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [pausedAnimation, setPausedAnimation] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const previewUrl = useMemo(() => {
    if (draft.background_url) return draft.background_url;
    if (draft.preset_key) {
      const p = PRESET_MAP[draft.preset_key];
      if (p?.fullAsset) return p.fullAsset;
    }
    return null;
  }, [draft.background_url, draft.preset_key]);

  const isPresetSelected = (key: string) => draft.preset_key === key;

  const fetchThemes = useCallback(async () => {
    if (activeScope === "company") {
      setLoadingCompanyThemes(true);
      setLoadError(null);
      try {
        const data = await appearanceApi.getAppearanceThemes("company");
        setCompanyThemes(data.themes as AppearanceThemeListItem[]);
        setCompanyActiveTheme(data.active_theme);
      } catch (e: any) {
        setLoadError(e?.message ?? "Failed to load company themes");
      } finally {
        setLoadingCompanyThemes(false);
      }
      return;
    }

    setLoadingThemes(true);
    setLoadError(null);
    try {
      const data = await appearanceApi.getAppearanceThemes();
      setThemes(data.themes as AppearanceThemeListItem[]);
    } catch (e: any) {
      setLoadError(e?.message ?? "Failed to load themes");
    } finally {
      setLoadingThemes(false);
    }
  }, [activeScope]);

  useEffect(() => {
    fetchThemes();
  }, [fetchThemes]);

  useEffect(() => {
    setDraft(cloneTheme(activeTheme));
    setHasUnsaved(false);
  }, [activeTheme.id, activeTheme.preset_key, activeTheme.background_url]);

  // Reset draft when scope changes
  useEffect(() => {
    if (activeScope === "company") {
      if (companyActiveTheme) {
        setDraft(cloneTheme(companyActiveTheme));
      } else {
        setDraft(cloneTheme(DEFAULT_APPEARANCE));
      }
      setHasUnsaved(false);
      setSelectedUploadId(null);
    } else {
      setDraft(cloneTheme(activeTheme));
      setHasUnsaved(false);
      setSelectedUploadId(null);
    }
  }, [activeScope]);

  const updateDraft = (patch: Partial<DraftTheme>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      return next;
    });
    setHasUnsaved(true);
  };

  const handlePreviewPreset = (presetKey: string) => {
    const preset = PRESET_MAP[presetKey];
    if (!preset) return;
    setDraft((prev) => ({
      ...prev,
      preset_key: preset.key,
      background_type: preset.backgroundType,
      background_url: null,
      name: preset.label,
    }));
    setHasUnsaved(true);
    setSelectedUploadId(null);
  };

  const handleSelectUpload = (t: AppearanceThemeListItem) => {
    setSelectedUploadId(t.id);
    setDraft({
      ...cloneTheme(t as AppearanceThemeData),
      background_url: t.background_url,
    });
    setHasUnsaved(true);
  };

  const handleUpload = async (file: File) => {
    setUploadError(null);
    setUploading(true);
    setUploadProgress({
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
    });

    try {
      const img = await new Promise<{ w: number; h: number }>((res, rej) => {
        const url = URL.createObjectURL(file);
        const i = new Image();
        i.onload = () => {
          res({ w: i.naturalWidth, h: i.naturalHeight });
          URL.revokeObjectURL(url);
        };
        i.onerror = () => {
          URL.revokeObjectURL(url);
          rej(new Error("Invalid image"));
        };
        i.src = url;
      });
      setUploadProgress((p) =>
        p ? { ...p, resolution: `${img.w}×${img.h}` } : p
      );

      const scope = activeScope === "company" ? "company" : undefined;
      const data = await appearanceApi.uploadWallpaper(file, scope);
      if (activeScope === "company") {
        setCompanyThemes((prev) => [data.theme as AppearanceThemeListItem, ...prev]);
      } else {
        setThemes((prev) => [data.theme as AppearanceThemeListItem, ...prev]);
      }
      setSelectedUploadId(data.theme.id);
      setDraft({
        ...(data.theme as unknown as AppearanceThemeData),
      });
      setHasUnsaved(true);
      setToast("Wallpaper uploaded");
      setTimeout(() => setToast(null), 2500);
    } catch (e: any) {
      setUploadError(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleApply = async () => {
    if (applying) return;
    setApplying(true);
    try {
      if (activeScope === "company") {
        // Company scope apply
        if (selectedUploadId !== null) {
          await appearanceApi.activateAppearanceTheme(selectedUploadId);

          if (hasUnsaved) {
            await appearanceApi.updateAppearanceTheme(selectedUploadId, {
              background_position: draft.background_position,
              background_size: draft.background_size,
              card_opacity: draft.card_opacity,
              card_blur: draft.card_blur,
              topbar_opacity: draft.topbar_opacity,
              overlay_opacity: draft.overlay_opacity,
              animation_speed: draft.animation_speed,
              motion_intensity: draft.motion_intensity,
              name: draft.name,
            });
          }
        } else {
          const preset = draft.preset_key ? PRESET_MAP[draft.preset_key] : undefined;
          const payload = buildCreatePayloadFromDraft({
            ...draft,
            background_type: preset ? preset.backgroundType : draft.background_type,
          });

          const created = await appearanceApi.createAppearanceTheme({
            ...payload,
            scope_type: "company",
            sidebar_opacity: draft.sidebar_opacity,
          });
          if (created.theme.id == null) {
            throw new Error("Failed to create theme: missing id");
          }
          await appearanceApi.activateAppearanceTheme(created.theme.id);
        }

        await fetchThemes();
        setHasUnsaved(false);
        setToast("Company theme applied");
        setTimeout(() => setToast(null), 2500);
        return;
      }

      // User scope apply (existing logic)
      if (selectedUploadId !== null) {
        await appearanceApi.activateAppearanceTheme(selectedUploadId);

        if (hasUnsaved) {
          await appearanceApi.updateAppearanceTheme(selectedUploadId, {
            background_position: draft.background_position,
            background_size: draft.background_size,
            card_opacity: draft.card_opacity,
            card_blur: draft.card_blur,
            sidebar_opacity: draft.sidebar_opacity,
            topbar_opacity: draft.topbar_opacity,
            overlay_opacity: draft.overlay_opacity,
            animation_speed: draft.animation_speed,
            motion_intensity: draft.motion_intensity,
            name: draft.name,
          });
        }

        const active = await appearanceApi.getActiveAppearance();
        setThemeData(active.theme);
        setHasUnsaved(false);
        setToast("Theme applied");
      } else {
        const preset = draft.preset_key ? PRESET_MAP[draft.preset_key] : undefined;
        const payload = buildCreatePayloadFromDraft({
          ...draft,
          background_type: preset
            ? preset.backgroundType
            : draft.background_type,
        });

        const created = await appearanceApi.createAppearanceTheme(payload);
        if (created.theme.id == null) {
          throw new Error("Failed to create theme: missing id");
        }
        await appearanceApi.activateAppearanceTheme(created.theme.id);

        const active = await appearanceApi.getActiveAppearance();
        setThemeData(active.theme);
        setHasUnsaved(false);
        await fetchThemes();
        setToast("Preset applied");
      }

      setTimeout(() => setToast(null), 2500);
    } catch (e: any) {
      setToast(e?.message ?? "Apply failed");
      setTimeout(() => setToast(null), 3500);
    } finally {
      setApplying(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      if (activeScope === "company") {
        await appearanceApi.resetAppearance("company");
        setCompanyActiveTheme(null);
        setDraft(cloneTheme(DEFAULT_APPEARANCE));
        setHasUnsaved(false);
        setSelectedUploadId(null);
        setShowResetConfirm(false);
        await fetchThemes();
        setToast("Company theme reset to default");
        setTimeout(() => setToast(null), 2500);
        setResetting(false);
        return;
      }

      const data = await appearanceApi.resetAppearance();
      setThemeData({ ...data.theme, is_default: true } as AppearanceThemeData);
      setDraft(cloneTheme(DEFAULT_APPEARANCE));
      setHasUnsaved(false);
      setSelectedUploadId(null);
      setShowResetConfirm(false);
      await fetchThemes();
      await refresh();
      setToast("Reset to default");
      setTimeout(() => setToast(null), 2500);
    } catch (e: any) {
      setToast(e?.message ?? "Reset failed");
      setTimeout(() => setToast(null), 3000);
    } finally {
      setResetting(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await appearanceApi.deleteAppearanceTheme(id);
      if (activeScope === "company") {
        setCompanyThemes((prev) => prev.filter((t) => t.id !== id));
      } else {
        setThemes((prev) => prev.filter((t) => t.id !== id));
      }
      if (selectedUploadId === id) {
        setSelectedUploadId(null);
        setDraft(cloneTheme(activeScope === "company" ? DEFAULT_APPEARANCE : activeTheme));
        setHasUnsaved(false);
      }
      setShowDeleteConfirm(null);
      setToast("Wallpaper deleted");
      setTimeout(() => setToast(null), 2500);
    } catch (e: any) {
      setToast(e?.message ?? "Delete failed");
      setTimeout(() => setToast(null), 3000);
    } finally {
      setDeletingId(null);
    }
  };

  const activeIsDefault = activeTheme.id === null;

  return (
    <div className="min-w-0 bg-transparent">
      <PageHeader
        eyebrow="Settings"
        title="Appearance"
        description="Manage wallpapers, glass effects, and theme preview. Theme applies per user across app.nexapa.me."
      />

      {/* Settings Tabs */}
      <div className="mt-6 flex gap-2">
        <button
          onClick={() => {
            setActiveTab("profile");
            window.location.href = "/settings";
          }}
          className={cn(
            "rounded-xl border px-4 py-2 text-[13px] font-medium backdrop-blur-xl transition",
            activeTab === "profile"
              ? "border-white/20 bg-white/15 text-slate-900"
              : "border-white/10 bg-white/5 text-slate-600 hover:bg-white/10"
          )}
        >
          Profile
        </button>
        <button
          onClick={() => setActiveTab("appearance")}
          className={cn(
            "rounded-xl border px-4 py-2 text-[13px] font-medium backdrop-blur-xl transition",
            activeTab === "appearance"
              ? "border-blue-400/30 bg-blue-500/15 text-blue-900"
              : "border-white/10 bg-white/5 text-slate-600 hover:bg-white/10"
          )}
        >
          Appearance
        </button>
      </div>

      {/* Scope Selector - admin only */}
      {isAdmin && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setActiveScope("user")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-[13px] font-medium backdrop-blur-xl transition",
              activeScope === "user"
                ? "border-blue-400/30 bg-blue-500/15 text-blue-900"
                : "border-white/10 bg-white/5 text-slate-600 hover:bg-white/10"
            )}
          >
            <Monitor className="h-4 w-4" />
            My App
          </button>
          <button
            onClick={() => setActiveScope("company")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-[13px] font-medium backdrop-blur-xl transition",
              activeScope === "company"
                ? "border-violet-400/30 bg-violet-500/15 text-violet-900"
                : "border-white/10 bg-white/5 text-slate-600 hover:bg-white/10"
            )}
          >
            <Building2 className="h-4 w-4" />
            Company Website
          </button>
        </div>
      )}

      {activeScope === "company" && (
        <div className="mt-3 rounded-xl border border-violet-400/25 bg-violet-500/10 px-4 py-3 text-[12px] leading-5 text-violet-900 backdrop-blur-xl">
          Company Website theme applies to <b>nexapa.me</b> (public landing page). Changes are visible to all visitors. Only administrators can modify.
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr]">
        {/* Left: Library */}
        <div className="space-y-5">
          {/* Upload Card */}
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-[0_18px_55px_rgba(2,6,23,0.12)] backdrop-blur-2xl">
            <h3 className="flex items-center gap-2 text-[13px] font-semibold text-slate-900">
              <Upload className="h-4 w-4" />
              {activeScope === "company" ? "Company Wallpapers" : "My Wallpapers"}
            </h3>
            <p className="mt-1 text-[11px] leading-4 text-slate-600">
              Landscape recommended, 4K ideal. Max 15 MB. Video theme available on Phase 2.
            </p>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={cn(
                "mt-3 flex min-h-[110px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center backdrop-blur-xl transition",
                uploading
                  ? "border-blue-400/40 bg-blue-500/10"
                  : "border-white/20 bg-white/8 hover:border-blue-400/40 hover:bg-white/12"
              )}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <p className="mt-2 text-[12px] font-medium text-slate-700">
                    Uploading {uploadProgress?.name}
                  </p>
                  {uploadProgress?.resolution && (
                    <p className="mt-1 text-[11px] text-slate-500">
                      {uploadProgress.resolution} • {uploadProgress.size}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <ImageIcon className="h-7 w-7 text-slate-500" />
                  <p className="mt-2 text-[13px] font-medium text-slate-700">
                    Click to upload or drag & drop
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    JPG, PNG, WebP, AVIF
                  </p>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.currentTarget.value = "";
              }}
            />

            {uploadError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-[12px] text-red-800 backdrop-blur-xl">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {uploadError}
              </div>
            )}

            {loadingThemes || loadingCompanyThemes ? (
              <div className="mt-4 flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {(activeScope === "company" ? companyThemes : themes)
                  .filter((t) => t.background_type === "static_image")
                  .map((t) => {
                    const isActive =
                      (activeScope === "company"
                        ? companyActiveTheme?.id
                        : activeTheme.id) === t.id ||
                      selectedUploadId === t.id;
                    return (
                      <div
                        key={t.id}
                        className={cn(
                          "group relative overflow-hidden rounded-xl border bg-white/8 p-1.5 backdrop-blur-xl transition",
                          isActive
                            ? "border-blue-400/60 ring-2 ring-blue-400/20"
                            : "border-white/15 hover:border-white/25"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectUpload(t)}
                          className="block w-full overflow-hidden rounded-lg"
                        >
                          <div className="aspect-[16/10] w-full overflow-hidden rounded-lg bg-slate-100">
                            {t.background_url ? (
                              <img
                                src={t.background_url}
                                alt={t.name}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-400">
                                <ImageIcon className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                        </button>
                        <div className="mt-1.5 flex items-center justify-between gap-1">
                          <p className="truncate text-[11px] font-medium text-slate-800">
                            {t.name}
                          </p>
                          {activeTheme.id === t.id && (
                            <span className="inline-flex items-center rounded-full border border-emerald-400/25 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 flex gap-1">
                          <button
                            onClick={() => handleSelectUpload(t)}
                            className="flex-1 rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-[11px] font-medium text-slate-700 backdrop-blur-xl hover:bg-white/15"
                          >
                            Preview
                          </button>
                          <button
                            onClick={() => {
                            if (t.id !== null) setShowDeleteConfirm(t.id);
                          }}
                            disabled={activeTheme.id === t.id}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-slate-500 backdrop-blur-xl hover:bg-red-500/10 hover:text-red-600 disabled:opacity-40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {themes.filter((t) => t.background_type === "static_image").length === 0 &&
              !loadingThemes && (
                <p className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center text-[11px] text-slate-500 backdrop-blur-xl">
                  No custom wallpapers yet
                </p>
              )}
          </div>

          {/* Built-in presets */}
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-[0_18px_55px_rgba(2,6,23,0.12)] backdrop-blur-2xl">
            <h3 className="flex items-center gap-2 text-[13px] font-semibold text-slate-900">
              <Monitor className="h-4 w-4" />
              Built-in Presets
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {BUILTIN_PRESETS.map((preset) => {
                const selected = isPresetSelected(preset.key);
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => handlePreviewPreset(preset.key)}
                    className={cn(
                      "group relative flex flex-col overflow-hidden rounded-xl border bg-white/8 text-left backdrop-blur-xl transition-all duration-200",
                      selected
                        ? "border-blue-400/60 ring-2 ring-blue-400/20"
                        : "border-white/15 hover:border-white/25 hover:bg-white/12"
                    )}
                  >
                    <div className="aspect-[16/10] w-full overflow-hidden bg-slate-100">
                      <img
                        src={preset.previewAsset}
                        alt={preset.label}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-2">
                      <p className="truncate text-[11px] font-semibold text-slate-900">
                        {preset.label}
                      </p>
                      <div className="mt-1 flex items-center gap-1">
                        <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-medium text-blue-800">
                          Built-in
                        </span>
                        {activeTheme.preset_key === preset.key &&
                          activeIsDefault && (
                            <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-800">
                              Active
                            </span>
                          )}
                        {selected && (
                          <Check className="ml-auto h-3 w-3 text-blue-600" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Animated presets */}
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-[0_18px_55px_rgba(2,6,23,0.12)] backdrop-blur-2xl">
            <h3 className="flex items-center gap-2 text-[13px] font-semibold text-slate-900">
              <Sparkles className="h-4 w-4" />
              Animated Gradient
            </h3>
            <p className="mt-1 text-[11px] text-slate-500">
              CSS-only, respects reduced motion, pauses when tab inactive.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2.5">
              {ANIMATED_PRESETS.map((preset) => {
                const selected = isPresetSelected(preset.key);
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => handlePreviewPreset(preset.key)}
                    className={cn(
                      "group relative flex items-center gap-3 overflow-hidden rounded-xl border p-2.5 text-left backdrop-blur-xl transition",
                      selected
                        ? "border-blue-400/60 bg-blue-500/10 ring-2 ring-blue-400/20"
                        : "border-white/15 bg-white/8 hover:bg-white/12"
                    )}
                  >
                    <div
                      className="h-14 w-20 shrink-0 rounded-lg"
                      style={{
                        background: preset.gradientCss,
                        backgroundSize: "200% 200%",
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-slate-900">
                        {preset.label}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-4 text-slate-600">
                        {preset.description}
                      </p>
                    </div>
                    {selected && (
                      <Check className="h-4 w-4 shrink-0 text-blue-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Preview + Controls */}
        <div className="space-y-5">
          {/* Live Preview */}
          <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-[0_18px_55px_rgba(2,6,23,0.16)] backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
              <h3 className="text-[13px] font-semibold text-slate-900">
                Live Preview
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPausedAnimation((p) => !p)}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-slate-700 backdrop-blur-xl hover:bg-white/15"
                >
                  {pausedAnimation ? (
                    <>
                      <Eye className="h-3.5 w-3.5" /> Resume
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-3.5 w-3.5" /> Pause Animation
                    </>
                  )}
                </button>
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    hasUnsaved ? "text-amber-700" : "text-slate-500"
                  )}
                >
                  {hasUnsaved ? "Unsaved changes" : "Synced"}
                </span>
              </div>
            </div>

            <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-950">
              {draft.preset_key &&
              PRESET_MAP[draft.preset_key]?.backgroundType ===
                "animated_gradient" ? (
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      PRESET_MAP[draft.preset_key]?.gradientCss ?? "",
                    backgroundSize: "200% 200%",
                    animation: pausedAnimation
                      ? "none"
                      : `nexapa-gradient-drift ${18 / draft.animation_speed}s ease-in-out infinite`,
                  }}
                />
              ) : (
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: previewUrl
                      ? `url(${previewUrl})`
                      : "none",
                    backgroundSize: draft.background_size,
                    backgroundPosition: draft.background_position,
                    backgroundRepeat: "no-repeat",
                  }}
                />
              )}

              <div
                className="absolute inset-0"
                style={{
                  backgroundColor: `rgba(2,6,23,${draft.overlay_opacity / 100})`,
                }}
              />

              {/* Mini shell */}
              <div className="absolute inset-0 flex">
                {activeScope === "company" ? (
                  /* Company preview: landing page style */
                  <div className="flex min-w-0 flex-1 flex-col">
                    {/* Navbar */}
                    <div
                      className="flex h-10 items-center justify-between border-b border-white/10 px-4 backdrop-blur-2xl"
                      style={{
                        backgroundColor: `rgba(255,255,255,${draft.topbar_opacity / 100})`,
                      }}
                    >
                      <div className="h-3 w-20 rounded bg-slate-800/30" />
                      <div className="flex gap-2">
                        <div className="h-2.5 w-10 rounded bg-slate-800/20" />
                        <div className="h-2.5 w-10 rounded bg-slate-800/20" />
                        <div className="h-2.5 w-10 rounded bg-slate-800/20" />
                      </div>
                      <div className="h-6 w-14 rounded-full bg-blue-600" />
                    </div>
                    {/* Hero */}
                    <div className="flex flex-1 items-center justify-center p-4">
                      <div
                        className="w-full max-w-md rounded-2xl border border-white/20 p-5 text-center shadow-lg"
                        style={{
                          backgroundColor: `rgba(255,255,255,${draft.card_opacity / 100})`,
                          backdropFilter: `blur(${draft.card_blur}px)`,
                        }}
                      >
                        <div className="mx-auto mb-3 h-4 w-32 rounded bg-slate-900/20" />
                        <div className="mx-auto mb-2 h-6 w-48 rounded bg-slate-900/30" />
                        <div className="mx-auto mb-4 h-3 w-40 rounded bg-slate-900/15" />
                        <div className="flex justify-center gap-2">
                          <div className="h-8 w-24 rounded-full bg-blue-600" />
                          <div className="h-8 w-24 rounded-full border border-white/20 bg-white/20" />
                        </div>
                      </div>
                    </div>
                    {/* Footer */}
                    <div
                      className="border-t border-white/10 px-4 py-3 backdrop-blur-2xl"
                      style={{
                        backgroundColor: `rgba(2,6,23,0.55)`,
                      }}
                    >
                      <div className="flex justify-between">
                        <div className="h-2.5 w-24 rounded bg-white/15" />
                        <div className="flex gap-3">
                          <div className="h-2.5 w-12 rounded bg-white/10" />
                          <div className="h-2.5 w-12 rounded bg-white/10" />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* User preview: app shell */
                  <>
                <div
                  className="hidden w-[28%] shrink-0 border-r border-white/10 backdrop-blur-2xl sm:flex"
                  style={{
                    backgroundColor: `rgba(2,6,23,${draft.sidebar_opacity / 100})`,
                  }}
                >
                  <div className="w-full p-2">
                    <div className="h-6 w-16 rounded bg-white/20" />
                    <div className="mt-4 space-y-2">
                      <div className="h-3 w-full rounded bg-white/10" />
                      <div className="h-3 w-3/4 rounded bg-white/10" />
                      <div className="h-3 w-5/6 rounded bg-white/10" />
                    </div>
                  </div>
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div
                    className="flex h-8 items-center border-b border-white/10 px-3 backdrop-blur-2xl"
                    style={{
                      backgroundColor: `rgba(255,255,255,${draft.topbar_opacity / 100})`,
                    }}
                  >
                    <div className="h-3 w-24 rounded bg-slate-800/20" />
                  </div>
                  <div className="flex-1 p-3">
                    <div
                      className="rounded-xl border border-white/20 p-3 shadow-sm"
                      style={{
                        backgroundColor: `rgba(255,255,255,${draft.card_opacity / 100})`,
                        backdropFilter: `blur(${draft.card_blur}px)`,
                      }}
                    >
                      <div className="h-3 w-24 rounded bg-slate-900/20" />
                      <div className="mt-2 h-2 w-full rounded bg-slate-900/10" />
                      <div className="mt-1.5 h-2 w-3/4 rounded bg-slate-900/10" />
                    </div>
                    <div
                      className="mt-3 rounded-xl border border-white/20 p-3 shadow-sm"
                      style={{
                        backgroundColor: `rgba(255,255,255,${draft.card_opacity / 100})`,
                        backdropFilter: `blur(${draft.card_blur}px)`,
                      }}
                    >
                      <div className="h-3 w-20 rounded bg-slate-900/20" />
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <div className="h-10 rounded bg-slate-900/10" />
                        <div className="h-10 rounded bg-slate-900/10" />
                        <div className="h-10 rounded bg-slate-900/10" />
                      </div>
                    </div>
                  </div>
                </div>
                </>
                )}
              </div>

              <div className="pointer-events-none absolute bottom-2 left-2 rounded-full border border-white/15 bg-black/30 px-2 py-0.5 text-[10px] font-medium text-white/80 backdrop-blur-xl">
                {previewUrl ? "Preview" : "Default"} • {draft.background_position} •{" "}
                {draft.background_size}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-[0_18px_55px_rgba(2,6,23,0.12)] backdrop-blur-2xl">
            <h3 className="text-[13px] font-semibold text-slate-900">
              Theme Controls
            </h3>

            <div className="mt-4 grid grid-cols-1 gap-5">
              <RangeControl
                label="Card Transparency"
                value={draft.card_opacity}
                min={5}
                max={60}
                suffix="%"
                onChange={(v) => updateDraft({ card_opacity: v })}
              />
              <RangeControl
                label="Card Blur"
                value={draft.card_blur}
                min={0}
                max={40}
                suffix="px"
                onChange={(v) => updateDraft({ card_blur: v })}
              />
              {activeScope !== "company" && (
                <RangeControl
                  label="Sidebar Opacity"
                  value={draft.sidebar_opacity}
                  min={30}
                  max={95}
                  suffix="%"
                  onChange={(v) => updateDraft({ sidebar_opacity: v })}
                />
              )}
              <RangeControl
                label={activeScope === "company" ? "Navbar Opacity" : "Topbar Opacity"}
                value={draft.topbar_opacity}
                min={0}
                max={80}
                suffix="%"
                onChange={(v) => updateDraft({ topbar_opacity: v })}
              />
              <RangeControl
                label="Overlay Strength"
                value={draft.overlay_opacity}
                min={0}
                max={50}
                suffix="%"
                onChange={(v) => updateDraft({ overlay_opacity: v })}
              />
              <RangeControl
                label="Background Motion Speed"
                value={draft.animation_speed}
                min={0.25}
                max={2}
                step={0.25}
                suffix="x"
                onChange={(v) => updateDraft({ animation_speed: v })}
              />
              <RangeControl
                label="Motion Intensity"
                value={draft.motion_intensity}
                min={0}
                max={100}
                suffix="%"
                onChange={(v) => updateDraft({ motion_intensity: v })}
              />

              <div className="grid grid-cols-2 gap-4">
                <SelectControl
                  label="Wallpaper Position"
                  value={draft.background_position}
                  options={[
                    { value: "center", label: "Center" },
                    { value: "top", label: "Top" },
                    { value: "bottom", label: "Bottom" },
                    { value: "left", label: "Left" },
                    { value: "right", label: "Right" },
                  ]}
                  onChange={(v) =>
                    updateDraft({ background_position: v as any })
                  }
                />
                <SelectControl
                  label="Wallpaper Size"
                  value={draft.background_size}
                  options={[
                    { value: "cover", label: "Cover" },
                    { value: "contain", label: "Contain" },
                  ]}
                  onChange={(v) =>
                    updateDraft({ background_size: v as any })
                  }
                />
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
                <p className="text-[11px] font-medium text-slate-700">
                  Preview does not change live app until Apply
                </p>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">
                  All values are validated: no raw CSS allowed, only allowlisted
                  presets. Wallpaper URL is resolved from backend or asset.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={handleApply}
                disabled={applying || (!hasUnsaved && selectedUploadId === null && activeTheme.preset_key === draft.preset_key)}
                className="inline-flex h-10 min-w-[120px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {applying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {applying ? "Applying..." : "Apply Theme"}
              </button>

              <button
                onClick={() => setShowResetConfirm(true)}
                disabled={resetting}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-4 text-[13px] font-medium text-slate-700 backdrop-blur-xl transition hover:bg-white/15 disabled:opacity-50"
              >
                Reset to Default
              </button>

              {hasUnsaved && (
                <button
                  onClick={() => {
                    setDraft(cloneTheme(activeTheme));
                    setHasUnsaved(false);
                    setSelectedUploadId(null);
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 text-[13px] font-medium text-slate-600 backdrop-blur-xl hover:bg-white/10"
                >
                  Discard
                </button>
              )}
            </div>

            {loadError && (
              <p className="mt-3 text-[12px] text-red-700">{loadError}</p>
            )}

            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-[11px] leading-4 text-slate-600 backdrop-blur-xl">
              {activeScope === "company" ? (
                <>Company Website scope: theme applies to <b>nexapa.me</b>. One active company theme. Sidebar opacity is ignored for company scope.</>
              ) : (
                <>Phase 1 scope: <b>My App Appearance</b>. Only user scope. One active theme per user. Transaction ensured.
                Animated gradient uses CSS only, no canvas/WebGL. Video wallpaper will be enabled in Phase 2.</>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 z-[100] -translate-x-1/2 rounded-xl border border-white/20 bg-slate-900/85 px-4 py-2.5 text-[13px] font-medium text-white shadow-[0_18px_55px_rgba(2,6,23,0.35)] backdrop-blur-2xl">
          {toast}
        </div>
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm !== null && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-950/80 p-5 text-white shadow-[0_25px_80px_rgba(2,6,23,0.42)] backdrop-blur-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-[14px] font-semibold">Delete wallpaper?</h4>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-[12px] leading-5 text-white/70">
              This wallpaper will be removed from your library. File will be deleted if not used elsewhere. Active theme cannot be deleted.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-[12px] text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={deletingId === showDeleteConfirm}
                className="rounded-xl bg-red-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deletingId === showDeleteConfirm ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirm */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-950/80 p-5 text-white shadow-[0_25px_80px_rgba(2,6,23,0.42)] backdrop-blur-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-[14px] font-semibold">Reset to Default?</h4>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-[12px] leading-5 text-white/70">
              Your active custom theme will be deactivated and you will return to Windows Glass Default. Uploaded wallpapers will not be deleted.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-[12px] text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="rounded-xl bg-blue-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {resetting ? "Resetting..." : "Reset"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes nexapa-gradient-drift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}

function RangeControl({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-[12px] font-medium text-slate-800">{label}</label>
        <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[11px] font-medium text-slate-700 backdrop-blur-xl">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step ?? 1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-2 w-full accent-blue-600"
      />
      <div className="mt-1 flex justify-between text-[10px] text-slate-500">
        <span>{min}{suffix}</span>
        <span>{max}{suffix}</span>
      </div>
    </div>
  );
}

function SelectControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-slate-800">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 h-10 w-full rounded-xl border border-white/20 bg-white/12 px-3 text-[13px] text-slate-800 backdrop-blur-xl focus:border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
