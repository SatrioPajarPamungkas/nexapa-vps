import type { SettingsSection } from "../settings.types";
import { SETTINGS_SECTIONS } from "../settings.constants";
import { ConfigurationStatus } from "./ConfigurationStatus";
import { getSectionStatus } from "../settings.utils";
import type { ValidationItem } from "../settings.types";
import { cn } from "@/lib/cn";

type Props = {
  activeSection: SettingsSection;
  onNavigate: (section: SettingsSection) => void;
  validationItems: ValidationItem[];
};

export function SettingsNavigation({ activeSection, onNavigate, validationItems }: Props) {
  return (
    <nav aria-label="Settings sections" className="space-y-0.5">
      {SETTINGS_SECTIONS.map((section) => {
        const status = getSectionStatus(section.id, validationItems);
        const isActive = activeSection === section.id;
        return (
          <button
            key={section.id}
            type="button"
            aria-current={isActive ? "page" : undefined}
            onClick={() => onNavigate(section.id)}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] transition-all",
              isActive
                ? "bg-slate-900 font-medium text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
            )}
          >
            <span className="min-w-0 flex-1 truncate">{section.label}</span>
            <span className="shrink-0">
              <ConfigurationStatus status={status} />
            </span>
          </button>
        );
      })}
    </nav>
  );
}
