import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import * as appearanceApi from "@/lib/api/appearance";
import {
  DEFAULT_APPEARANCE,
  type AppearanceThemeData,
} from "./appearance.types";
import { PRESET_MAP, DEFAULT_PRESET_KEY } from "./appearance.presets";

type CSSVarMap = Record<string, string>;

interface AppearanceContextProps {
  theme: AppearanceThemeData;
  isDefault: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  applyThemeLocally: (t: AppearanceThemeData) => void;
  setThemeData: (t: AppearanceThemeData) => void;
  resetLocal: () => void;
}

const AppearanceContext = createContext<AppearanceContextProps | undefined>(
  undefined
);

function computeCssVars(t: AppearanceThemeData): CSSVarMap {
  const cardAlpha = Math.min(1, Math.max(0, t.card_opacity / 100));
  const sidebarAlpha = Math.min(0.95, Math.max(0, t.sidebar_opacity / 100));
  const topbarAlpha = Math.min(0.8, Math.max(0, t.topbar_opacity / 100));
  const overlayAlpha = Math.min(0.5, Math.max(0, t.overlay_opacity / 100));

  return {
    "--nexapa-card-alpha": cardAlpha.toString(),
    "--nexapa-card-blur": `${t.card_blur}px`,
    "--nexapa-sidebar-alpha": sidebarAlpha.toString(),
    "--nexapa-topbar-alpha": topbarAlpha.toString(),
    "--nexapa-overlay-alpha": overlayAlpha.toString(),
    "--nexapa-wallpaper-position": t.background_position,
    "--nexapa-wallpaper-size": t.background_size,
    "--nexapa-motion-speed": `${t.animation_speed}`,
    "--nexapa-motion-intensity": `${t.motion_intensity}`,
  };
}

function applyVars(vars: CSSVarMap) {
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => {
    root.style.setProperty(k, v);
  });
}

function getWallpaperUrlForTheme(t: AppearanceThemeData): string | null {
  if (t.background_url) return t.background_url;

  if (t.preset_key) {
    const preset = PRESET_MAP[t.preset_key];
    if (preset?.fullAsset) return preset.fullAsset;
  }

  return null;
}

function applyWallpaper(t: AppearanceThemeData) {
  const root = document.documentElement;
  const presetKey = t.preset_key ?? DEFAULT_PRESET_KEY;
  const preset = PRESET_MAP[presetKey];
  const url = getWallpaperUrlForTheme(t);

  const wallpaperUrlVar = url ? `url(${JSON.stringify(url)})` : "none";

  root.style.setProperty("--nexapa-wallpaper-url", wallpaperUrlVar);
  root.style.setProperty(
    "--nexapa-wallpaper-position",
    t.background_position
  );
  root.style.setProperty("--nexapa-wallpaper-size", t.background_size);
  root.style.setProperty(
    "--nexapa-wallpaper-attachment",
    t.background_attachment ?? "fixed"
  );

  if (preset && preset.backgroundType === "animated_gradient") {
    root.dataset.nexapaAnimated = preset.key;
  } else {
    delete root.dataset.nexapaAnimated;
  }

  if (preset?.gradientCss) {
    root.style.setProperty("--nexapa-gradient-css", preset.gradientCss);
  } else {
    root.style.removeProperty("--nexapa-gradient-css");
  }
}

function clearAppearanceVars() {
  const root = document.documentElement;
  const vars = [
    "--nexapa-card-alpha",
    "--nexapa-card-blur",
    "--nexapa-sidebar-alpha",
    "--nexapa-topbar-alpha",
    "--nexapa-overlay-alpha",
    "--nexapa-wallpaper-url",
    "--nexapa-wallpaper-position",
    "--nexapa-wallpaper-size",
    "--nexapa-wallpaper-attachment",
    "--nexapa-motion-speed",
    "--nexapa-motion-intensity",
    "--nexapa-gradient-css",
  ];
  vars.forEach((k) => root.style.removeProperty(k));
  delete root.dataset.nexapaAnimated;
}

function applyFullTheme(t: AppearanceThemeData) {
  const vars = computeCssVars(t);
  applyVars(vars);
  applyWallpaper(t);
}

function cacheTheme(userId: number, theme: AppearanceThemeData) {
  try {
    localStorage.setItem(
      `nexapa:appearance:${userId}`,
      JSON.stringify(theme)
    );
  } catch {
    // ignore
  }
}

function loadCachedTheme(userId: number): AppearanceThemeData | null {
  try {
    const raw = localStorage.getItem(`nexapa:appearance:${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppearanceThemeData;
    if (!parsed || typeof parsed.card_opacity !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function clearCachedTheme(userId: number) {
  try {
    localStorage.removeItem(`nexapa:appearance:${userId}`);
  } catch {
    // ignore
  }
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const { user, authenticated } = useAuth();
  const [theme, setTheme] = useState<AppearanceThemeData>(DEFAULT_APPEARANCE);
  const [isDefault, setIsDefault] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastUserIdRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    if (!authenticated || !user) {
      setTheme(DEFAULT_APPEARANCE);
      setIsDefault(true);
      applyFullTheme(DEFAULT_APPEARANCE);
      setLoading(false);
      return;
    }

    // Try cache first to avoid flash
    const cached = loadCachedTheme(user.id);
    if (cached) {
      setTheme(cached);
      applyFullTheme(cached);
    } else {
      applyFullTheme(DEFAULT_APPEARANCE);
    }

    setLoading(true);
    setError(null);
    try {
      const data = await appearanceApi.getActiveAppearance();
      let active = data.theme;

      // Resolve preset fallback
      if (!active.preset_key && active.background_type === "builtin") {
        active = { ...active, preset_key: DEFAULT_PRESET_KEY };
      }

      setTheme(active);
      setIsDefault(data.is_default);
      applyFullTheme(active);
      cacheTheme(user.id, active);
    } catch (e: any) {
      // Fallback to default on error, keep app usable
      if (!cached) {
        setTheme(DEFAULT_APPEARANCE);
        setIsDefault(true);
        applyFullTheme(DEFAULT_APPEARANCE);
      }
      setError(e?.message ?? "Failed to load appearance");
    } finally {
      setLoading(false);
    }
  }, [authenticated, user]);

  useEffect(() => {
    if (!authenticated || !user) {
      if (lastUserIdRef.current !== null) {
        clearAppearanceVars();
        applyFullTheme(DEFAULT_APPEARANCE);
        setTheme(DEFAULT_APPEARANCE);
        setIsDefault(true);
      }
      lastUserIdRef.current = null;
      return;
    }

    if (lastUserIdRef.current !== user.id) {
      lastUserIdRef.current = user.id;
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, user?.id]);

  const applyThemeLocally = useCallback((t: AppearanceThemeData) => {
    applyFullTheme(t);
  }, []);

  const setThemeData = useCallback(
    (t: AppearanceThemeData) => {
      setTheme(t);
      applyFullTheme(t);
      if (user) cacheTheme(user.id, t);
    },
    [user]
  );

  const resetLocal = useCallback(() => {
    if (user) clearCachedTheme(user.id);
    setTheme(DEFAULT_APPEARANCE);
    setIsDefault(true);
    applyFullTheme(DEFAULT_APPEARANCE);
  }, [user]);

  return (
    <AppearanceContext.Provider
      value={{
        theme,
        isDefault,
        loading,
        error,
        refresh,
        applyThemeLocally,
        setThemeData,
        resetLocal,
      }}
    >
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext);
  if (!ctx) {
    throw new Error("useAppearance must be used within AppearanceProvider");
  }
  return ctx;
}

export { computeCssVars, applyFullTheme, getWallpaperUrlForTheme, DEFAULT_PRESET_KEY };
