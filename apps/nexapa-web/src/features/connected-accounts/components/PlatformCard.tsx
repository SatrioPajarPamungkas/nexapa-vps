import { PlatformLogo } from "./PlatformLogo";

type Props = {
  platform: "tiktok" | "facebook" | "instagram" | "youtube" | "pinterest" | "shopee";
  count: number;
  comingSoon?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
};

export function PlatformCard({ platform, count, comingSoon, isSelected, onClick }: Props) {
  const platformNames: Record<Props["platform"], string> = {
    tiktok: "TikTok",
    facebook: "Facebook",
    instagram: "Instagram",
    youtube: "YouTube",
    pinterest: "Pinterest",
    shopee: "Shopee",
  };
  const label = platformNames[platform];

  if (comingSoon) {
    return (
      <div className="glass-subtle flex h-[112px] flex-col justify-between rounded-2xl border border-white/15 p-4">
        <div className="flex items-start justify-between">
          <div className="flex h-[36px] w-[36px] items-center justify-center rounded-xl border border-white/20 bg-white/20 backdrop-blur-xl">
            <PlatformLogo platform={platform} className="h-[24px] w-[24px]" />
          </div>
          <svg
            className="h-4 w-4 text-white/40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
        <div className="w-full space-y-1 text-left">
          <h3 className="text-[14px] font-semibold leading-tight text-slate-900">{label}</h3>
          <span className="rounded-full border border-white/15 bg-white/8 px-2 py-1 text-[11px] leading-none font-medium text-slate-500">Segera hadir</span>
        </div>
      </div>
    );
  }

  const isConnected = count > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`glass-card group flex h-[112px] flex-col justify-between rounded-2xl border p-4 transition-all duration-200 ${
        isSelected
          ? "border-blue-400/50 bg-blue-500/12 ring-1 ring-blue-400/20 shadow-card"
          : isConnected
            ? "border-emerald-400/25 bg-emerald-400/10 hover:border-emerald-400/30 hover:bg-emerald-400/12"
            : "border-white/15 bg-white/8 hover:border-white/25 hover:bg-white/12"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex h-[36px] w-[36px] items-center justify-center rounded-xl border border-white/20 bg-white/20 shadow-sm backdrop-blur-xl">
          <PlatformLogo platform={platform} className="h-[24px] w-[24px]" />
        </div>
        <svg
          className={`h-4 w-4 transition ${
            isSelected ? "text-blue-600" : "text-slate-400/60 group-hover:text-slate-600"
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
      <div className="w-full space-y-1 text-left">
        <h3 className="text-[14px] font-semibold leading-tight text-slate-900">{label}</h3>
        <div className="flex items-center gap-1.5">
          <span className={`rounded-full border px-2 py-1 text-[11px] leading-none font-medium ${
            isConnected
              ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-800"
              : "border-white/15 bg-white/8 text-slate-500"
          }`}>
            {count === 0 ? "Belum terhubung" : `${count} akun terhubung`}
          </span>
          {isSelected && (
            <span className="rounded-full border border-blue-400/30 bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-blue-800">
              Dipilih
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
