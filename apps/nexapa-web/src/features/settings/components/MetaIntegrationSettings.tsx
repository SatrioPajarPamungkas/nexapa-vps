import { useMetaSettings } from "../hooks/useMetaSettings";
import { MetaIntegrationSettingsForm } from "./MetaIntegrationSettingsForm";

type Props = {
  status: "not-configured" | "partial" | "complete-locally" | "backend-required" | "has-errors";
};

export function MetaIntegrationSettings({ status }: Props) {
  const {
    settings,
    isLoading,
    isSaving,
    saveError,
    fieldErrors,
    fetchSettings,
    updateSettings,
    saveSettings,
  } = useMetaSettings();

  const hasStoredSecret = settings.has_stored_secret ?? false;

  return (
    <MetaIntegrationSettingsForm
      settings={settings}
      isLoading={isLoading}
      isSaving={isSaving}
      saveError={saveError}
      fieldErrors={fieldErrors}
      hasStoredSecret={hasStoredSecret}
      status={status}
      onUpdate={updateSettings}
      onSave={saveSettings}
      onRefetch={fetchSettings}
    />
  );
}
