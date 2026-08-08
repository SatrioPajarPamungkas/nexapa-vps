import type { UnifiedMediaAsset } from "../media-library.types";
import { MediaAssetRow } from "./MediaAssetRow";

type Props = {
  assets: UnifiedMediaAsset[];
  onToggle: (key: string) => void;
  onRemove: (key: string) => void;
  onOpen: (key: string) => void;
};

export function MediaAssetList({ assets, onToggle, onRemove, onOpen }: Props) {
  return (
    <div className="space-y-2 bg-transparent">
      {assets.map((a) => (
        <MediaAssetRow key={a.key} asset={a} onToggle={onToggle} onRemove={onRemove} onOpen={onOpen} />
      ))}
    </div>
  );
}
