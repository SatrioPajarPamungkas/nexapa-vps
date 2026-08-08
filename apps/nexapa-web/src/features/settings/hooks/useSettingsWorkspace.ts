import { useCallback, useMemo, useState } from "react";
import type { FullSettings, SettingsSection, PlatformTab, ValidationItem } from "../settings.types";
import { getDefaultSettings, cloneSettings, isDirty, validateAllSettings, buildSafeExport } from "../settings.utils";

export function useSettingsWorkspace() {
  const [current, setCurrent] = useState<FullSettings>(() => getDefaultSettings());
  const [applied, setApplied] = useState<FullSettings>(() => getDefaultSettings());
  const [activeSection, setActiveSection] = useState<SettingsSection>("general");
  const [activePlatform, setActivePlatform] = useState<PlatformTab>("meta");
  const [showValidation, setShowValidation] = useState(false);
  const [liveMsg, setLiveMsg] = useState("");
  const [clipboardError, setClipboardError] = useState("");

  const dirty = useMemo(() => isDirty(current, applied), [current, applied]);

  const validationItems: ValidationItem[] = useMemo(() => {
    if (!showValidation) {
      // still compute for active section badge but not full? compute all anyway for tab statuses
      return validateAllSettings(current);
    }
    return validateAllSettings(current);
  }, [current, showValidation]);

  const announce = useCallback((msg: string) => {
    setLiveMsg(msg);
    window.setTimeout(() => setLiveMsg(""), 3500);
  }, []);

  const update = useCallback(<K extends keyof FullSettings>(section: K, patch: Partial<FullSettings[K]>) => {
    setCurrent((prev) => ({
      ...prev,
      [section]: { ...prev[section], ...patch },
    }));
  }, []);

  const updateNested = useCallback(
    <K extends keyof FullSettings, N extends keyof FullSettings[K]>(section: K, nestedKey: N, patch: Partial<FullSettings[K][N]>) => {
      setCurrent((prev) => {
        const sec = prev[section] as Record<string, unknown>;
        const nested = sec[nestedKey as string] as Record<string, unknown>;
        return {
          ...prev,
          [section]: {
            ...sec,
            [nestedKey]: { ...nested, ...patch },
          },
        } as FullSettings;
      });
    },
    [],
  );

  const applyLocally = useCallback(() => {
    setApplied(cloneSettings(current));
    announce("Configuration applied to the current browser session only.");
  }, [current, announce]);

  const discard = useCallback(() => {
    setCurrent(cloneSettings(applied));
    announce("Changes discarded – restored last applied local state.");
  }, [applied, announce]);

  const resetSection = useCallback(
    (section: SettingsSection) => {
      const defaults = getDefaultSettings();
      if (section === "platforms") {
        // reset all platform tabs
        setCurrent((prev) => ({
          ...prev,
          meta: defaults.meta,
          youtube: defaults.youtube,
          shopee: defaults.shopee,
        }));
      } else {
        setCurrent((prev) => ({
          ...prev,
          [section]: defaults[section as keyof FullSettings],
        }));
      }
      announce(`${section} settings reset to defaults (local only). Secrets cleared.`);
    },
    [announce],
  );

  const resetAll = useCallback(() => {
    const defaults = getDefaultSettings();
    setCurrent(defaults);
    setApplied(defaults);
    announce("All settings reset to defaults. Secrets cleared. Memory only.");
  }, [announce]);

  const copySafe = useCallback(async () => {
    const safe = buildSafeExport(current);
    const text = JSON.stringify(safe, null, 2);
    setClipboardError("");
    try {
      if (!navigator.clipboard?.writeText) throw new Error("no clipboard");
      await navigator.clipboard.writeText(text);
      announce("Safe configuration copied — Sensitive values were excluded.");
      return true;
    } catch {
      setClipboardError("Clipboard access failed — copy manually. Sensitive values were excluded.");
      window.setTimeout(() => setClipboardError(""), 4000);
      return false;
    }
  }, [current, announce]);

  const validateNow = useCallback(() => {
    setShowValidation(true);
    announce("Validation completed – check actionable items below. Secrets not included in messages.");
  }, [announce]);

  return {
    current,
    applied,
    activeSection,
    setActiveSection,
    activePlatform,
    setActivePlatform,
    dirty,
    showValidation,
    setShowValidation,
    validationItems,
    liveMsg,
    clipboardError,
    update,
    updateNested,
    setCurrent,
    applyLocally,
    discard,
    resetSection,
    resetAll,
    copySafe,
    validateNow,
    announce,
  };
}
