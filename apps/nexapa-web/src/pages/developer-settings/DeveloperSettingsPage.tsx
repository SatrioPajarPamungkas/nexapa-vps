import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { DeveloperApplicationSettings } from "@/features/settings/components/DeveloperApplicationSettings";
import { PlatformIntegrationSettings } from "@/features/settings/components/PlatformIntegrationSettings";
import { EndpointSettings } from "@/features/settings/components/EndpointSettings";
import { WorkerSettings } from "@/features/settings/components/WorkerSettings";
import { StorageSettings } from "@/features/settings/components/StorageSettings";
import { ProxySettings } from "@/features/settings/components/ProxySettings";
import { SecuritySettings } from "@/features/settings/components/SecuritySettings";
import { EnvironmentSettings } from "@/features/settings/components/EnvironmentSettings";
import { useSettingsWorkspace } from "@/features/settings/hooks/useSettingsWorkspace";
import type { SettingsSection, PlatformTab } from "@/features/settings/settings.types";
import { cn } from "@/lib/cn";

const DEV_SECTIONS: { id: SettingsSection; label: string }[] = [
  { id: "developer", label: "Developer Apps" },
  { id: "platforms", label: "Platform Integrations" },
  { id: "endpoints", label: "Endpoints" },
  { id: "workers", label: "Workers" },
  { id: "storage", label: "Storage" },
  { id: "proxy", label: "Proxy" },
  { id: "security", label: "Security" },
  { id: "environment", label: "Environment" },
];

export function DeveloperSettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("platforms");
  const [activePlatform, setActivePlatform] = useState<PlatformTab>("tiktok");
  const {
    current,
    update,
  } = useSettingsWorkspace();

  return (
    <div className="min-w-0 bg-transparent">
      <PageHeader
        eyebrow="System"
        title="Developer Settings"
        description="Configure platform integrations, API credentials, storage, workers, endpoints, and system security. Accessible only to administrators."
      />

      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 bg-transparent">
        <div className="flex flex-col gap-6 lg:flex-row bg-transparent">
          {/* Sidebar navigation - glass */}
          <aside className="hidden w-56 shrink-0 lg:block">
            <div className="sticky top-20">
              <nav
                aria-label="Developer settings sections"
                className="rounded-xl border border-white/15 bg-white/8 p-2 backdrop-blur-xl shadow-[0_8px_30px_rgba(2,6,23,0.08)]"
              >
                <div className="space-y-1">
                  {DEV_SECTIONS.map((section) => {
                    const isActive = activeSection === section.id;
                    return (
                      <button
                        key={section.id}
                        type="button"
                        aria-current={isActive ? "page" : undefined}
                        onClick={() => setActiveSection(section.id)}
                        className={cn(
                          "flex w-full items-center rounded-lg px-3 py-2 text-left text-[12px] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/30",
                          isActive
                            ? "border border-white/25 bg-white/20 text-slate-950 shadow-sm backdrop-blur-xl"
                            : "border border-transparent bg-transparent text-slate-700 hover:bg-white/10 hover:text-slate-900",
                        )}
                      >
                        <span className="min-w-0 flex-1 truncate">{section.label}</span>
                      </button>
                    );
                  })}
                </div>
              </nav>
            </div>
          </aside>

          {/* Mobile section selector - glass */}
          <div className="mb-1 lg:hidden">
            <label htmlFor="dev-section-select" className="sr-only">
              Select developer settings section
            </label>
            <div className="rounded-xl border border-white/15 bg-white/8 p-1.5 backdrop-blur-xl">
              <select
                id="dev-section-select"
                value={activeSection}
                onChange={(e) => setActiveSection(e.target.value as SettingsSection)}
                className="h-9 w-full rounded-lg border border-white/20 bg-white/12 px-3 text-[12px] font-medium text-slate-900 backdrop-blur-xl placeholder:text-slate-600 focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              >
                {DEV_SECTIONS.map((section) => (
                  <option key={section.id} value={section.id} className="bg-slate-900 text-white">
                    {section.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Main content - transparent gap for wallpaper */}
          <main className="min-w-0 flex-1 bg-transparent">
            {activeSection === "developer" && (
              <DeveloperApplicationSettings
                value={current.developer}
                onChange={(patch) => update("developer", patch)}
              />
            )}
            {activeSection === "platforms" && (
              <PlatformIntegrationSettings
                youtube={current.youtube}
                shopee={current.shopee}
                activePlatform={activePlatform}
                onPlatformChange={setActivePlatform}
                onYouTubeChange={(patch) => update("youtube", patch)}
                onShopeeChange={(patch) => update("shopee", patch)}
                validationItems={[]}
              />
            )}
            {activeSection === "endpoints" && (
              <EndpointSettings
                value={current.endpoints}
                onChange={(patch) => update("endpoints", patch)}
                onCopyFeedback={() => {}}
              />
            )}
            {activeSection === "workers" && (
              <WorkerSettings
                value={current.workers}
                onChange={(patch) => update("workers", patch)}
              />
            )}
            {activeSection === "storage" && (
              <StorageSettings
                value={current.storage}
                onChange={(patch) => update("storage", patch)}
              />
            )}
            {activeSection === "proxy" && (
              <ProxySettings
                value={current.proxy}
                onChange={(patch) => update("proxy", patch)}
              />
            )}
            {activeSection === "security" && (
              <SecuritySettings
                value={current.security}
                onChange={(patch) => update("security", patch)}
              />
            )}
            {activeSection === "environment" && (
              <EnvironmentSettings
                value={current.environment}
                onChange={(patch) => update("environment", patch)}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}