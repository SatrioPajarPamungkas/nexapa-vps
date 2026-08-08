import type { PublishPlatform } from "./publisher.types";

export const PLATFORM_DISPLAY: Record<PublishPlatform, string> = {
  tiktok: "TikTok",
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
};

export const SUPPORTED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];
export const SUPPORTED_VIDEO_MIMES = ["video/mp4", "video/webm", "video/quicktime"];
export const ALL_SUPPORTED_MIMES = [...SUPPORTED_IMAGE_MIMES, ...SUPPORTED_VIDEO_MIMES];

export const ADVISORY_LIMITS = {
  tiktok: 2200,
  facebook: 8000,
  instagram: 2200,
  youtube_title: 100,
  youtube_description: 5000,
  global: 2200,
};

export const HASHTAG_SUGGESTIONS = ["#content", "#creator", "#video", "#nexapa", "#workflow", "#media", "#story", "#behindthescenes"];

export const DEMO_ACCOUNTS: Array<{
  platform: PublishPlatform;
  label: string;
  identifier: string;
}> = [
  { platform: "tiktok", label: "TikTok Demo Account", identifier: "demo_tiktok_01" },
  { platform: "facebook", label: "Facebook Demo Page", identifier: "demo_facebook_page_01" },
  { platform: "instagram", label: "Instagram Demo Professional Account", identifier: "demo_instagram_pro_01" },
  { platform: "youtube", label: "YouTube Demo Channel", identifier: "demo_youtube_channel_01" },
  { platform: "tiktok", label: "TikTok Demo Backup Account", identifier: "demo_tiktok_backup_01" },
  { platform: "facebook", label: "Facebook Demo Second Page", identifier: "demo_facebook_page_02" },
];

export const YOUTUBE_CATEGORIES = [
  "People & Blogs",
  "Entertainment",
  "Education",
  "Howto & Style",
  "Music",
  "Gaming",
  "News & Politics",
];

export const TIKTOK_PRIVACY_LABEL: Record<string, string> = {
  only_me: "Only me",
  public: "Public",
  friends: "Friends",
};
