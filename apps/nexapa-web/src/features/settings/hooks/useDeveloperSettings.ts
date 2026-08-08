import { useCallback, useEffect, useState } from "react";
import {
  getTikTokSettings,
  saveTikTokSettings,
  getFacebookSettings,
  saveFacebookSettings,
  type SaveTikTokSettingsPayload,
  type TikTokSettings,
  type FacebookSettings,
  type SaveFacebookSettingsPayload,
} from "@/lib/api/developer-settings";

type UseDeveloperSettingsReturn = {
  tiktokSettings: TikTokSettings;
  facebookSettings: FacebookSettings;
  isLoading: boolean;
  isSaving: boolean;
  saveError: string | null;
  fieldErrors: Record<string, string>;
  fetchTikTokSettings: () => Promise<void>;
  fetchFacebookSettings: () => Promise<void>;
  updateTikTokSettings: (patch: Partial<TikTokSettings>) => void;
  updateFacebookSettings: (patch: Partial<FacebookSettings>) => void;
  updateSettings: (patch: Partial<TikTokSettings>) => void;
  saveTikTokSettings: () => Promise<boolean>;
  saveFacebookSettings: () => Promise<boolean>;
  saveSettings: () => Promise<boolean>;
};

export function useDeveloperSettings(): UseDeveloperSettingsReturn {
  const [tiktokSettings, setTiktokSettings] = useState<TikTokSettings>({
    client_key: "",
    client_secret: "",
    environment: "sandbox",
    content_posting_mode: "upload_as_draft",
  });

  const [facebookSettings, setFacebookSettings] = useState<FacebookSettings>({
    app_id: "",
    app_secret: "",
    has_stored_secret: false,
    configuration_id: null,
    graph_api_version: "v21.0",
    callback_url: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [hasTikTokStoredSecret, setHasTikTokStoredSecret] = useState(false);
  const [hasFacebookStoredSecret, setHasFacebookStoredSecret] = useState(false);

  const fetchTikTokSettings = useCallback(async () => {
    setIsLoading(true);
    setSaveError(null);
    try {
      const response = await getTikTokSettings();
      if (response.success && response.data) {
        const hasSecret = !!(response.data.client_secret && response.data.client_secret.length > 0);
        setHasTikTokStoredSecret(hasSecret);
        setTiktokSettings({
          client_key: response.data.client_key ?? "",
          client_secret: response.data.client_secret ?? "",
          environment: response.data.environment ?? "sandbox",
          content_posting_mode: response.data.content_posting_mode ?? "upload_as_draft",
        });
      }
    } catch (error) {
      console.error("Failed to fetch TikTok settings:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchFacebookSettings = useCallback(async () => {
    setIsLoading(true);
    setSaveError(null);
    try {
      const response = await getFacebookSettings();
      if (response.success && response.data) {
        setHasFacebookStoredSecret(response.data.has_stored_secret);
        setFacebookSettings({
          app_id: response.data.app_id ?? "",
          app_secret: response.data.app_secret ?? "",
          has_stored_secret: response.data.has_stored_secret ?? false,
          configuration_id: response.data.configuration_id ?? null,
          graph_api_version: response.data.graph_api_version ?? "v21.0",
          callback_url: response.data.callback_url ?? "",
        });
      }
    } catch (error) {
      console.error("Failed to fetch Facebook settings:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateTikTokSettings = useCallback((patch: Partial<TikTokSettings>) => {
    setTiktokSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const updateFacebookSettings = useCallback((patch: Partial<FacebookSettings>) => {
    setFacebookSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const saveTikTokSettingsFn = useCallback(async (): Promise<boolean> => {
    setIsSaving(true);
    setSaveError(null);
    setFieldErrors({});

    try {
      const payload: SaveTikTokSettingsPayload = {
        client_key: tiktokSettings.client_key,
        client_secret: tiktokSettings.client_secret,
        environment: tiktokSettings.environment,
        content_posting_mode: tiktokSettings.content_posting_mode,
        has_stored_secret: hasTikTokStoredSecret && tiktokSettings.client_secret === "",
      };

      const response = await saveTikTokSettings(payload);

      if (response.success && response.data) {
        setTiktokSettings({
          client_key: response.data.client_key ?? "",
          client_secret: response.data.client_secret ?? "",
          environment: response.data.environment ?? "sandbox",
          content_posting_mode: response.data.content_posting_mode ?? "upload_as_draft",
        });
        setHasTikTokStoredSecret(!!response.data.client_secret);
        return true;
      } else {
        setSaveError(response.message || "Failed to save settings");
        return false;
      }
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
        error.status === 422 &&
        "errors" in error
      ) {
        const validationErrors = error.errors as Record<string, string[]>;
        const mappedErrors: Record<string, string> = {};
        Object.entries(validationErrors).forEach(([key, messages]) => {
          mappedErrors[key] = messages[0] || "Invalid value";
        });
        setFieldErrors(mappedErrors);
        setSaveError("Please fix the validation errors");
      } else {
        const errorMessage =
          error && typeof error === "object" && "message" in error
            ? (error.message as string)
            : "Failed to save TikTok settings";
        setSaveError(errorMessage);
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [tiktokSettings, hasTikTokStoredSecret]);

  const saveFacebookSettingsFn = useCallback(async (): Promise<boolean> => {
    setIsSaving(true);
    setSaveError(null);
    setFieldErrors({});

    try {
      const payload: SaveFacebookSettingsPayload = {
        app_id: facebookSettings.app_id,
        app_secret: facebookSettings.app_secret,
        configuration_id: facebookSettings.configuration_id,
        graph_api_version: facebookSettings.graph_api_version,
        has_stored_secret: hasFacebookStoredSecret && facebookSettings.app_secret === "",
      };

      const response = await saveFacebookSettings(payload);

      if (response.success && response.data) {
        setFacebookSettings({
          app_id: response.data.app_id ?? "",
          app_secret: response.data.app_secret ?? "",
          has_stored_secret: response.data.has_stored_secret ?? false,
          configuration_id: response.data.configuration_id ?? null,
          graph_api_version: response.data.graph_api_version ?? "v21.0",
          callback_url: response.data.callback_url ?? "",
        });
        setHasFacebookStoredSecret(!!response.data.has_stored_secret);
        return true;
      } else {
        setSaveError(response.message || "Failed to save settings");
        return false;
      }
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
        error.status === 422 &&
        "errors" in error
      ) {
        const validationErrors = error.errors as Record<string, string[]>;
        const mappedErrors: Record<string, string> = {};
        Object.entries(validationErrors).forEach(([key, messages]) => {
          mappedErrors[key] = messages[0] || "Invalid value";
        });
        setFieldErrors(mappedErrors);
        setSaveError("Please fix the validation errors");
      } else {
        const errorMessage =
          error && typeof error === "object" && "message" in error
            ? (error.message as string)
            : "Failed to save Facebook settings";
        setSaveError(errorMessage);
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [facebookSettings, hasFacebookStoredSecret]);

  useEffect(() => {
    fetchTikTokSettings();
    fetchFacebookSettings();
  }, [fetchTikTokSettings, fetchFacebookSettings]);

  return {
    tiktokSettings,
    facebookSettings,
    isLoading,
    isSaving,
    saveError,
    fieldErrors,
    fetchTikTokSettings,
    fetchFacebookSettings,
    updateTikTokSettings,
    updateFacebookSettings,
    updateSettings: updateTikTokSettings,
    saveTikTokSettings: saveTikTokSettingsFn,
    saveFacebookSettings: saveFacebookSettingsFn,
    saveSettings: saveTikTokSettingsFn,
  };
}