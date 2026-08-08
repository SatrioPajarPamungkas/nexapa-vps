import tiktok from "@/assets/platforms/tiktok.svg";
import facebook from "@/assets/platforms/facebook.svg";
import instagram from "@/assets/platforms/instagram.svg";
import youtube from "@/assets/platforms/youtube.svg";
import pinterest from "@/assets/platforms/pinterest.svg";
import shopee from "@/assets/platforms/shopee.svg";

type Props = {
  platform: "tiktok" | "facebook" | "instagram" | "youtube" | "pinterest" | "shopee";
  className?: string;
};

export function PlatformLogo({ platform, className }: Props) {
  const map: Record<Props["platform"], string> = {
    tiktok,
    facebook,
    instagram,
    youtube,
    pinterest,
    shopee,
  };
  const src = map[platform];
  return <img src={src} alt={platform} className={className} />;
}
