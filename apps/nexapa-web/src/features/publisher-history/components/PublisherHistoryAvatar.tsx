import { useEffect, useState } from "react";

type Props = {
  name: string;
  src?: string | null;
  className?: string;
};

export function PublisherHistoryAvatar({ name, src, className = "h-7 w-7" }: Props) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (src && !failed) {
    return <img src={src} alt="" className={`${className} shrink-0 rounded-full object-cover ring-1 ring-white/15`} onError={() => setFailed(true)} />;
  }

  return (
    <span className={`${className} inline-flex shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/12 text-[9px] font-semibold text-slate-700 backdrop-blur-xl`}>
      {initials}
    </span>
  );
}
