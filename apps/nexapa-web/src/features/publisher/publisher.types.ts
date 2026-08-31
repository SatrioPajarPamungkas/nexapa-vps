export type PublishPlatform = "tiktok" | "facebook" | "instagram" | "youtube";

export type PublisherPlatform = "facebook" | "tiktok" | "youtube" | "shopee";

export type FacebookPostType = "text" | "image" | "video";

export type MediaKind = "image" | "video" | "none";
export type PublisherMediaKind = "image" | "video";

export type LocalMediaAsset = {
  id: string;
  file: File;
  kind: MediaKind;
  mimeType: string;
  fileName: string;
  fileSize: number;
  previewUrl: string;
  width: number | null;
  height: number | null;
  duration: number | null;
  addedAt: number;
};

export type DestinationStatus =
  | "ready"
  | "demo"
  | "backend-required"
  | "authorization-required"
  | "not-configured";

export type DestinationAccount = {
  id: string;
  platform: PublishPlatform;
  accountType?: string | null;
  parentConnectedAccountId?: string | null;
  label: string;
  identifier: string;
  avatarUrl: string | null;
  status: DestinationStatus;
  isDefault: boolean;
  isDemo: boolean;
  isPublishable?: boolean;
};

export type TikTokPrivacy = "only_me" | "public" | "friends" | "followers";

export type TikTokPrivacyLevel = "SELF_ONLY" | "PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "FOLLOWER_OF_CREATOR";

export const PRIVACY_LEVEL_MAP: Record<TikTokPrivacy, TikTokPrivacyLevel> = {
  only_me: "SELF_ONLY",
  public: "PUBLIC_TO_EVERYONE",
  friends: "MUTUAL_FOLLOW_FRIENDS",
  followers: "FOLLOWER_OF_CREATOR",
};

export const PRIVACY_LABEL_MAP: Record<TikTokPrivacyLevel, string> = {
  SELF_ONLY: "Only me",
  PUBLIC_TO_EVERYONE: "Public",
  MUTUAL_FOLLOW_FRIENDS: "Friends",
  FOLLOWER_OF_CREATOR: "Followers",
};

export type TikTokInteraction = {
  allowComments: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
};

export type TikTokDisclosure = {
  brandedContent: boolean;
  promotionalContent: boolean;
};

export type TikTokCreatorInfo = {
  creator_nickname: string;
  creator_username: string;
  creator_avatar_url: string;
  privacy_level_options: string[];
  comment_disabled: boolean;
  duet_disabled: boolean;
  stitch_disabled: boolean;
  max_video_post_duration_sec: number;
};

export type TikTokSettings = {
  privacy: TikTokPrivacy;
  interaction: TikTokInteraction;
  disclosure: TikTokDisclosure;
  rightsConfirmed: boolean;
  captionOverrideEnabled: boolean;
  captionOverride: string;
  creatorInfo: TikTokCreatorInfo | null;
  isLoadingCreatorInfo: boolean;
};

export type FacebookPostDestination = "page_timeline" | "video_post";

export type FacebookVisibility = "published" | "unpublished";

export type FacebookSettings = {
  postType: FacebookPostType;
  destination: FacebookPostDestination;
  visibility: FacebookVisibility;
  allowComments: boolean;
  includeLinkPreview: boolean;
  captionOverrideEnabled: boolean;
  captionOverride: string;
};

export type InstagramMode = "reel" | "feed_video" | "feed_post";

export type InstagramSettings = {
  mode: InstagramMode;
  shareToFeed: boolean;
  disableComments: boolean;
  addFirstCommentHashtags: boolean;
  captionOverrideEnabled: boolean;
  captionOverride: string;
};

export type YouTubeVisibility = "private" | "unlisted" | "public";

export type YouTubeMadeForKids = "no" | "yes";

export type YouTubeSettings = {
  title: string;
  description: string;
  visibility: YouTubeVisibility;
  category: string; // placeholder
  madeForKids: YouTubeMadeForKids;
  tags: string; // comma-separated
  captionOverrideEnabled: boolean;
  captionOverride: string;
};

export type PlatformSettings = {
  tiktok: TikTokSettings;
  facebook: FacebookSettings;
  instagram: InstagramSettings;
  youtube: YouTubeSettings;
};

export type CaptionAnalysis = {
  text: string;
  trimmedLength: number;
  lineCount: number;
  hashtags: string[];
  hashtagCount: number;
  mentions: string[];
  links: string[];
};

export type ValidationSeverity = "ready" | "action-required" | "backend-required" | "warning";

export type ValidationItem = {
  id: string;
  platform?: PublishPlatform | "global";
  label: string;
  severity: ValidationSeverity;
  message: string;
};

export type PublishDraft = {
  id: string;
  name: string;
  platform?: PublisherPlatform;
  mediaMeta: {
    fileName: string | null;
    fileSize: number | null;
    mimeType: string | null;
    kind: MediaKind;
    width: number | null;
    height: number | null;
    duration: number | null;
  } | null;
  mediaFileRef: File | null; // retained only in-mem
  caption: string;
  hashtags: string[];
  selectedDestinationIds: string[];
  platformSettings: PlatformSettings;
  createdAt: number;
  updatedAt: number;
};

export type PublisherPreviewPlatform = PublishPlatform;

export const MAX_LOCAL_DRAFTS = 20;
export const MAX_HASHTAGS = 30;
export const MAX_DISPLAY_NAME = 80;
export const MAX_NOTES = 300;
export const MAX_CAPTION_PREVIEW = 2200;
