import type { UnifiedMediaAsset } from "../media-library.types";
import { MediaAssetCard } from "./MediaAssetCard";

type Props = {
  assets: UnifiedMediaAsset[];
  onToggle: (key: string) => void;
  onRemove: (key: string) => void;
  onOpen: (key: string) => void;
};

export function MediaAssetGrid({ assets, onToggle, onRemove, onOpen }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 bg-transparent sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
      {assets.map((a) => (
        <MediaAssetCard key={a.key} asset={a} onToggle={onToggle} onRemove={onRemove} onOpen={onOpen} />
      ))}
    </div>
  );
}
