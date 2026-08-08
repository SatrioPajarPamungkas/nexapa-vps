import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BadgeCheck,
  Mail,
  Palette,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "U";
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [avatarFailed, setAvatarFailed] = useState(false);

  if (!user) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <p className="text-sm text-slate-500">Loading profile...</p>
      </div>
    );
  }

  const showAvatar = Boolean(user.google_avatar_url) && !avatarFailed;
  const roleLabel =
    user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          User Profile
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your Nexapa account identity.
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-white/30 bg-white/80 shadow-sm backdrop-blur-xl">
        <div className="border-b border-slate-200/70 px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-2xl font-bold text-white shadow-lg ring-4 ring-white">
              {showAvatar ? (
                <img
                  src={user.google_avatar_url ?? undefined}
                  alt={`${user.name} avatar`}
                  className="h-full w-full object-cover"
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <span>{getInitials(user.name)}</span>
              )}
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold text-slate-900">
                {user.name}
              </h2>

              <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{user.email}</span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  {roleLabel}
                </span>

                {user.email_verified ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    Email verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                    Email unverified
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 px-6 py-6 sm:grid-cols-2 sm:px-8">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              <UserRound className="h-4 w-4" aria-hidden="true" />
              Full name
            </div>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {user.name}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              <Mail className="h-4 w-4" aria-hidden="true" />
              Email address
            </div>
            <p className="mt-2 break-all text-sm font-medium text-slate-900">
              {user.email}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Account role
            </div>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {roleLabel}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              <BadgeCheck className="h-4 w-4" aria-hidden="true" />
              Verification
            </div>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {user.email_verified ? "Verified" : "Not verified"}
            </p>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-200/70 px-6 py-5 sm:px-8">
          <button
            type="button"
            onClick={() => navigate("/settings/appearance")}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <Palette className="h-4 w-4" aria-hidden="true" />
            Manage Appearance
          </button>
        </div>
      </section>
    </div>
  );
}
