export type BackgroundType = "static_image" | "builtin" | "animated_gradient";

export type BackgroundPosition = "center" | "top" | "bottom" | "left" | "right";

export type BackgroundSize = "cover" | "contain";

export type BackgroundAttachment = "fixed" | "scroll";

export interface AppearanceThemeData {
  id: number | null;
  name: string;
  background_type: BackgroundType;
  background_url: string | null;
  preset_key: string | null;
  background_position: BackgroundPosition;
  background_size: BackgroundSize;
  background_attachment?: BackgroundAttachment;
  card_opacity: number;
  card_blur: number;
  sidebar_opacity: number;
  topbar_opacity: number;
  overlay_opacity: number;
  animation_speed: number;
  motion_intensity: number;
  is_active: boolean;
  is_builtin?: boolean;
  is_default?: boolean;
}

export interface AppearanceThemeListItem extends AppearanceThemeData {
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_APPEARANCE: AppearanceThemeData = {
  id: null,
  name: "Windows Glass",
  background_type: "builtin",
  background_url: null,
  preset_key: "windows_glass_default",
  background_position: "center",
  background_size: "cover",
  background_attachment: "fixed",
  card_opacity: 10,
  card_blur: 24,
  sidebar_opacity: 65,
  topbar_opacity: 5,
  overlay_opacity: 2,
  animation_speed: 1,
  motion_intensity: 20,
  is_active: true,
  is_builtin: true,
  is_default: true,
};
