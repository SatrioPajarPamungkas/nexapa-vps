import { useState } from "react";
import { Settings, Copy, RefreshCcw, CheckCircle2 } from "lucide-react";
import { useSettingsWorkspace } from "../hooks/useSettingsWorkspace";
import { SettingsNavigation } from "./SettingsNavigation";
import { GeneralSettingsForm } from "./GeneralSettings";
import { DeveloperApplicationSettings } from "./DeveloperApplicationSettings";
import { PlatformIntegrationSettings } from "./PlatformIntegrationSettings";
import { EndpointSettings } from "./EndpointSettings";
import { WorkerSettings } from "./WorkerSettings";
import { StorageSettings } from "./StorageSettings";
import { ProxySettings } from "./ProxySettings";
import { SecuritySettings } from "./SecuritySettings";
import { EnvironmentSettings } from "./EnvironmentSettings";
import { SettingsValidation } from "./SettingsValidation";
import { UnsavedChangesBar } from "./UnsavedChangesBar";
import { ResetSettingsDialog } from "./ResetSettingsDialog";
import type { SettingsSection } from "../settings.types";

export function SettingsWorkspace() {
  const {
    current,
    activeSection,
    setActiveSection,
    activePlatform,
    setActivePlatform,
    dirty,
    showValidation,
    validationItems,
    liveMsg,
    clipboardError,
    update,
    applyLocally,
    discard,
    resetSection,
    resetAll,
    copySafe,
    validateNow,
  } = useSettingsWorkspace();

  const [resetDialogTarget, setResetDialogTarget] = useState<SettingsSection | "all" | null>(null);
  const [copiedSafe, setCopiedSafe] = useState(false);

  const handleCopySafe = async () => {
    const ok = await copySafe();
    if (ok) {
      setCopiedSafe(true);
      window.setTimeout(() => setCopiedSafe(false), 2500);
    }
  };

  const handleNavigateValidation = (section: SettingsSection) => {
    setActiveSection(section);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen">
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {liveMsg}
      </div>

      {/* Compact backend notice */}
      <div className="mb-5 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
        <p className="flex-1 text-[11px] text-slate-500">
          Settings are stored only in the current browser session until Nexapa API and encrypted configuration storage are connected.
        </p>
        <span className="text-[10px] text-slate-400">In-memory only</span>
      </div>

      {/* Mobile section selector */}
      <div className="mb-4 lg:hidden">
        <label htmlFor="settings-section-select" className="sr-only">Select settings section</label>
        <select
          id="settings-section-select"
          value={activeSection}
          onChange={(e) => setActiveSection(e.target.value as SettingsSection)}
          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 focus:border-blue-400 focus:outline-none"
        >
          {([
            ["general", "General"],
            ["developer", "Developer Application"],
            ["platforms", "Platform Integrations"],
            ["endpoints", "Endpoints"],
            ["workers", "Workers"],
            ["storage", "Storage"],
            ["proxy", "Proxy"],
            ["security", "Security"],
            ["environment", "Environment"],
          ] as const).map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-6">
        {/* Sidebar navigation */}
        <aside className="hidden w-52 shrink-0 lg:block">
          <div className="sticky top-20">
            <div className="mb-3 flex items-center gap-1.5 px-3">
              <Settings className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Sections</span>
            </div>
            <SettingsNavigation
              activeSection={activeSection}
              onNavigate={setActiveSection}
              validationItems={validationItems}
            />
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 space-y-5">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={validateNow}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-[12px] font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Validate Configuration
            </button>
            <button
              type="button"
              onClick={() => setResetDialogTarget("all")}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <RefreshCcw className="h-3.5 w-3.5" /> Reset Changes
            </button>
            <button
              type="button"
              onClick={handleCopySafe}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Copy className="h-3.5 w-3.5" /> {copiedSafe ? "Copied!" : "Copy Safe Config"}
            </button>
          </div>

          {clipboardError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700" role="alert">
              {clipboardError}
            </div>
          )}

          {/* Section content */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {activeSection === "general" && (
              <GeneralSettingsForm value={current.general} onChange={(patch) => update("general", patch)} />
            )}
            {activeSection === "developer" && (
              <DeveloperApplicationSettings value={current.developer} onChange={(patch) => update("developer", patch)} />
            )}
            {activeSection === "platforms" && (
              <PlatformIntegrationSettings
                youtube={current.youtube}
                shopee={current.shopee}
                activePlatform={activePlatform}
                onPlatformChange={setActivePlatform}
                onYouTubeChange={(patch) => update("youtube", patch)}
                onShopeeChange={(patch) => update("shopee", patch)}
                validationItems={validationItems}
              />
            )}
            {activeSection === "endpoints" && (
              <EndpointSettings
                value={current.endpoints}
                onChange={(patch) => update("endpoints", patch)}
                onCopyFeedback={(msg) => {
                  window.setTimeout(() => { document.title = "Nexapa Settings"; }, 2000);
                  document.title = msg;
                }}
              />
            )}
            {activeSection === "workers" && (
              <WorkerSettings value={current.workers} onChange={(patch) => update("workers", patch)} />
            )}
            {activeSection === "storage" && (
              <StorageSettings value={current.storage} onChange={(patch) => update("storage", patch)} />
            )}
            {activeSection === "proxy" && (
              <ProxySettings value={current.proxy} onChange={(patch) => update("proxy", patch)} />
            )}
            {activeSection === "security" && (
              <SecuritySettings value={current.security} onChange={(patch) => update("security", patch)} />
            )}
            {activeSection === "environment" && (
              <EnvironmentSettings value={current.environment} onChange={(patch) => update("environment", patch)} />
            )}
          </div>

          <SettingsValidation
            items={validationItems}
            onNavigate={handleNavigateValidation}
            visible={showValidation}
          />
        </main>
      </div>

      <UnsavedChangesBar
        visible={dirty}
        onApply={applyLocally}
        onDiscard={discard}
      />

      <ResetSettingsDialog
        open={resetDialogTarget !== null}
        target={resetDialogTarget ?? "all"}
        onClose={() => setResetDialogTarget(null)}
        onConfirm={(target) => {
          if (target === "all") resetAll();
          else resetSection(target);
        }}
      />
    </div>
  );
}
