import nexapaWallpaper from "@/assets/backgrounds/nexapa-wallpaper.webp";
import windowsGlass from "@/assets/backgrounds/nexapa-windows-glass.webp";
import windowsDarkBlue from "@/assets/backgrounds/windows-11-dark-mode-blue-stock-official-3840x2400-5630.jpg";
import windowsDarkBlack from "@/assets/backgrounds/windows-11-dark-mode-stock-official-black-background-3839x2400-5659.jpg";
import windowsLight1 from "@/assets/backgrounds/windows-11-stock-official-light-3840x2400-5655.jpg";
import windowsLight2 from "@/assets/backgrounds/windows-11-stock-official-light-3840x2400-5662.png";
import windowsGrey from "@/assets/backgrounds/windows-11-stock-grey-abstract-dark-background-3840x2400-8957.png";
import huaweiGradient from "@/assets/backgrounds/huawei-gradient-5800x3200-26687.jpg";
import luffy from "@/assets/backgrounds/monkey-d-luffy-5120x2880-26035.jpg";
import honkai from "@/assets/backgrounds/stellefly-honkai-4000x2600-26880.jpg";

export type PresetBackgroundType = "builtin" | "animated_gradient";

export interface AppearancePreset {
  key: string;
  label: string;
  description: string;
  backgroundType: PresetBackgroundType;
  previewAsset: string;
  fullAsset: string | null;
  textMode: "dark" | "light" | "auto";
  recommendedOverlay: number;
  category: "built-in" | "animated";
  gradientCss?: string;
}

export const BUILTIN_PRESETS: AppearancePreset[] = [
  {
    key: "windows_glass_default",
    label: "Windows Glass",
    description: "Default Nexapa glass wallpaper",
    backgroundType: "builtin",
    previewAsset: nexapaWallpaper,
    fullAsset: nexapaWallpaper,
    textMode: "dark",
    recommendedOverlay: 2,
    category: "built-in",
  },
  {
    key: "windows_dark_blue",
    label: "Windows Dark Blue",
    description: "Dark blue official Windows",
    backgroundType: "builtin",
    previewAsset: windowsDarkBlue,
    fullAsset: windowsDarkBlue,
    textMode: "light",
    recommendedOverlay: 5,
    category: "built-in",
  },
  {
    key: "windows_dark_black",
    label: "Windows Dark Black",
    description: "Pure dark black Windows",
    backgroundType: "builtin",
    previewAsset: windowsDarkBlack,
    fullAsset: windowsDarkBlack,
    textMode: "light",
    recommendedOverlay: 10,
    category: "built-in",
  },
  {
    key: "windows_light",
    label: "Windows Light",
    description: "Official light Windows",
    backgroundType: "builtin",
    previewAsset: windowsLight1,
    fullAsset: windowsLight1,
    textMode: "dark",
    recommendedOverlay: 0,
    category: "built-in",
  },
  {
    key: "windows_light_alt",
    label: "Windows Light Alt",
    description: "Alternative light variant",
    backgroundType: "builtin",
    previewAsset: windowsLight2,
    fullAsset: windowsLight2,
    textMode: "dark",
    recommendedOverlay: 0,
    category: "built-in",
  },
  {
    key: "windows_grey",
    label: "Windows Grey",
    description: "Grey abstract dark",
    backgroundType: "builtin",
    previewAsset: windowsGrey,
    fullAsset: windowsGrey,
    textMode: "light",
    recommendedOverlay: 6,
    category: "built-in",
  },
  {
    key: "huawei_gradient",
    label: "Huawei Gradient",
    description: "Colorful Huawei gradient",
    backgroundType: "builtin",
    previewAsset: huaweiGradient,
    fullAsset: huaweiGradient,
    textMode: "dark",
    recommendedOverlay: 3,
    category: "built-in",
  },
  {
    key: "luffy",
    label: "Luffy",
    description: "Monkey D. Luffy — 5K",
    backgroundType: "builtin",
    previewAsset: luffy,
    fullAsset: luffy,
    textMode: "light",
    recommendedOverlay: 8,
    category: "built-in",
  },
  {
    key: "honkai",
    label: "Honkai",
    description: "Stellefly Honkai Star Rail",
    backgroundType: "builtin",
    previewAsset: honkai,
    fullAsset: honkai,
    textMode: "light",
    recommendedOverlay: 8,
    category: "built-in",
  },
  {
    key: "windows_glass_alt",
    label: "Windows Glass Alt",
    description: "Alternative glass composition",
    backgroundType: "builtin",
    previewAsset: windowsGlass,
    fullAsset: windowsGlass,
    textMode: "dark",
    recommendedOverlay: 2,
    category: "built-in",
  },
];

export const ANIMATED_PRESETS: AppearancePreset[] = [
  {
    key: "aurora_blue",
    label: "Aurora Blue",
    description: "Calm aurora drifting gradient",
    backgroundType: "animated_gradient",
    previewAsset: windowsDarkBlue,
    fullAsset: null,
    textMode: "light",
    recommendedOverlay: 6,
    category: "animated",
    gradientCss:
      "radial-gradient(120% 120% at 10% 20%, #60a5fa 0%, transparent 50%), radial-gradient(100% 100% at 90% 30%, #22d3ee 0%, transparent 55%), radial-gradient(140% 100% at 50% 100%, #1e3a8a 0%, #020617 70%)",
  },
  {
    key: "windows_flow",
    label: "Windows Flow",
    description: "Soft Windows flow animation",
    backgroundType: "animated_gradient",
    previewAsset: nexapaWallpaper,
    fullAsset: null,
    textMode: "dark",
    recommendedOverlay: 3,
    category: "animated",
    gradientCss:
      "radial-gradient(80% 80% at 20% 30%, #93c5fd 0%, transparent 50%), radial-gradient(90% 90% at 80% 80%, #a5b4fc 0%, transparent 55%), linear-gradient(135deg, #f8fafc 0%, #dbeafe 40%, #e0e7ff 100%)",
  },
];

export const ALL_PRESETS: AppearancePreset[] = [...BUILTIN_PRESETS, ...ANIMATED_PRESETS];

export const PRESET_MAP: Record<string, AppearancePreset> = ALL_PRESETS.reduce((acc, p) => {
  acc[p.key] = p;
  return acc;
}, {} as Record<string, AppearancePreset>);

export const DEFAULT_PRESET_KEY = "windows_glass_default";
