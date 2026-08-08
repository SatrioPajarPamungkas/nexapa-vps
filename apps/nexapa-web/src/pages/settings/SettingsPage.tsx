import { Link } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { UserProfileForm } from "@/features/settings/components/UserProfileForm";

export function SettingsPage() {
  return (
    <div className="min-w-0 bg-transparent">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Manage your personal profile and account information."
      />

      <div className="mt-6 flex gap-2">
        <span className="rounded-xl border border-blue-400/30 bg-blue-500/15 px-4 py-2 text-[13px] font-medium text-blue-900 backdrop-blur-xl">
          Profile
        </span>
        <Link
          to="/settings/appearance"
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[13px] font-medium text-slate-600 backdrop-blur-xl transition hover:bg-white/10"
        >
          Appearance
        </Link>
      </div>

      <div className="mx-auto mt-6 max-w-[768px] bg-transparent">
        <UserProfileForm />
      </div>
    </div>
  );
}
