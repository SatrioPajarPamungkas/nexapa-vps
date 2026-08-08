import { Type, Image as ImageIcon, Film } from "lucide-react";
import type { FacebookPostType } from "../lib/upload-helpers";

type Props = {
  value: FacebookPostType;
  onChange: (type: FacebookPostType) => void;
  disabled?: boolean;
};

export function FacebookSchedulerContentType({ value, onChange, disabled = false }: Props) {
  const options: { type: FacebookPostType; label: string; icon: React.ReactNode }[] = [
    {
      type: "text",
      label: "Text",
      icon: <Type className="h-4 w-4" />,
    },
    {
      type: "image",
      label: "Image",
      icon: <ImageIcon className="h-4 w-4" />,
    },
    {
      type: "video",
      label: "Video",
      icon: <Film className="h-4 w-4" />,
    },
  ];

  return (
    <div className="flex gap-2">
      {options.map((option) => (
        <button
          key={option.type}
          type="button"
          onClick={() => onChange(option.type)}
          disabled={disabled}
          className={`flex-1 inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-[12px] font-medium transition-colors ${
            value === option.type
              ? "border-blue-300 bg-blue-50 text-blue-700"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
