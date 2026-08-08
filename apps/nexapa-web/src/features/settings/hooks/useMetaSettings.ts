import { useState, useCallback, useEffect } from "react";
import {
  getFacebookSettings,
  saveFacebookSettings,
  type FacebookSettings,
  type SaveFacebookSettingsPayload,
} from "@/lib/api/developer-settings";

type UseMetaSettingsReturn = {
  settings: FacebookSettings;
  isLoading: boolean;
  isSaving: boolean;
  saveError: string | null;
  fieldErrors: Record<string, string>;
  fetchSettings: () => Promise<void>;
  updateSettings: (patch: Partial<FacebookSettings>) => void;
  saveSettings: (payload?: SaveFacebookSettingsPayload) => Promise<boolean>;
};

export function useMetaSettings(): UseMetaSettingsReturn {
  const [settings, setSettings] = useState<FacebookSettings>({
    app_id: "",
    app_secret: "",
    has_stored_secret: false,
    configuration_id: null,
    graph_api_version: "v21.0",
    callback_url: "",
    webhook_url: "",
    webhook_verify_token: "",
    environment: "Development",
    planned_products: [],
    requested_permissions: [],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [hasStoredSecret, setHasStoredSecret] = useState(false);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setSaveError(null);
    try {
      const response = await getFacebookSettings();
      if (response.success && response.data) {
        setHasStoredSecret(response.data.has_stored_secret ?? false);
        setSettings({
          app_id: response.data.app_id ?? "",
          app_secret: response.data.app_secret ?? "",
          has_stored_secret: response.data.has_stored_secret ?? false,
          configuration_id: response.data.configuration_id ?? null,
          graph_api_version: response.data.graph_api_version ?? "v21.0",
          callback_url: response.data.callback_url ?? "",
          webhook_url: response.data.webhook_url ?? "",
          webhook_verify_token: response.data.webhook_verify_token ?? "",
          environment: response.data.environment ?? "Development",
          planned_products: response.data.planned_products ?? [],
          requested_permissions: response.data.requested_permissions ?? [],
        });
      }
    } catch (error) {
      console.error("Failed to fetch Meta settings:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSettings = useCallback((patch: Partial<FacebookSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const saveSettings = useCallback(async (payload?: SaveFacebookSettingsPayload): Promise<boolean> => {
    setIsSaving(true);
    setSaveError(null);
    setFieldErrors({});

    try {
      const requestPayload: SaveFacebookSettingsPayload = payload ?? {
        app_id: settings.app_id.trim(),
        app_secret: settings.app_secret.trim() !== "" ? settings.app_secret : undefined,
        configuration_id: settings.configuration_id,
        graph_api_version: settings.graph_api_version,
        webhook_url: settings.webhook_url,
        webhook_verify_token: settings.webhook_verify_token?.trim() || undefined,
        environment: settings.environment,
        planned_products: settings.planned_products,
        requested_permissions: settings.requested_permissions,
      };

      if (!payload && hasStoredSecret && !requestPayload.app_secret) {
        requestPayload.has_stored_secret = true;
      }

      const response = await saveFacebookSettings(requestPayload);

      if (response.success && response.data) {
        setHasStoredSecret(response.data.has_stored_secret ?? false);
        setSettings({
          app_id: response.data.app_id ?? "",
          app_secret: response.data.app_secret ?? "",
          has_stored_secret: response.data.has_stored_secret ?? false,
          configuration_id: response.data.configuration_id ?? null,
          graph_api_version: response.data.graph_api_version ?? "v21.0",
          callback_url: response.data.callback_url ?? "",
          webhook_url: response.data.webhook_url ?? "",
          webhook_verify_token: response.data.webhook_verify_token ?? "",
          environment: response.data.environment ?? "Development",
          planned_products: response.data.planned_products ?? [],
          requested_permissions: response.data.requested_permissions ?? [],
        });
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
            : "Failed to save Meta settings";
        setSaveError(errorMessage);
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [settings, hasStoredSecret]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    isLoading,
    isSaving,
    saveError,
    fieldErrors,
    fetchSettings,
    updateSettings,
    saveSettings,
  };
}
