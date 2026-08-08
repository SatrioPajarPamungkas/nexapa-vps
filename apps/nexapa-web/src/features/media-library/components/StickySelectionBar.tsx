import { useState } from "react";
import { Copy, Trash2, X, FolderPlus, Tag, Archive, RotateCcw, Send, Clock } from "lucide-react";
import type { MediaCollection } from "../media-library.types";
import { cn } from "@/lib/cn";

type Props = {
  selectedCount: number;
  isAllMatchingSelected: boolean;
  onClearAllSelection: () => void;
  onRemoveSelected: () => void;
  onArchiveSelected: () => void;
  onRestoreSelected: () => void;
  onCopyNames: () => Promise<boolean>;
  onCopyMetadata: () => Promise<boolean>;
  clipboardMsg: string;
  collections: MediaCollection[];
  onMoveSelectedToCollection: (collectionId: string) => void;
  onAddTagToSelected: (tag: string) => void;
  onPublishNow?: () => void;
  onSchedule?: () => void;
  onDelete?: () => void;
  hasActiveUsage?: (count: number) => boolean;
};

export function StickySelectionBar({
  selectedCount,
  isAllMatchingSelected,
  onClearAllSelection,
  onArchiveSelected,
  onRestoreSelected,
  onCopyNames,
  onCopyMetadata,
  clipboardMsg,
  collections,
  onMoveSelectedToCollection,
  onAddTagToSelected,
  onPublishNow,
  onSchedule,
  onDelete,
}: Props) {
  const [localMsg, setLocalMsg] = useState<string>("");
  const [showCollections, setShowCollections] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagValue, setTagValue] = useState("");

  async function withFeedback(fn: () => Promise<boolean>, successText: string) {
    const ok = await fn();
    setLocalMsg(ok ? successText : "Clipboard access failed");
    window.setTimeout(() => setLocalMsg(""), 3000);
  }

  function handleAddTag() {
    if (tagValue.trim()) {
      onAddTagToSelected(tagValue.trim());
      setTagValue("");
      setShowTagInput(false);
    }
  }

  const canPublishNow = !isAllMatchingSelected && onPublishNow && selectedCount === 1;
  const canSchedule = onSchedule && selectedCount >= 1;
  const canDelete = onDelete && selectedCount > 0;

  return (
    <div className="sticky-action-bar sticky bottom-0 z-20 -mx-4 -mb-4 border-t border-white/10 bg-slate-950/70 px-4 py-3 shadow-[0_18px_55px_rgba(2,6,23,0.28)] backdrop-blur-2xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[12px] font-medium text-white backdrop-blur-xl">
            {selectedCount} selected
          </span>
          {(localMsg || clipboardMsg) && (
            <span className="text-[11px] text-emerald-300" role="status" aria-live="polite">
              {localMsg || clipboardMsg}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {canPublishNow && (
            <button
              type="button"
              onClick={onPublishNow}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-3 py-1.5 text-[12px] font-medium text-white shadow-[0_8px_22px_rgba(37,99,235,0.28)] hover:from-blue-700 hover:to-blue-800"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              Publish Now
            </button>
          )}

          {canSchedule && (
            <button
              type="button"
              onClick={onSchedule}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-[12px] font-medium text-white/80 backdrop-blur-xl transition hover:bg-white/15 hover:text-white"
            >
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              Schedule
            </button>
          )}

          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-red-400/30 bg-red-500/15 px-3 py-1.5 text-[12px] font-medium text-red-200 backdrop-blur-xl transition hover:bg-red-500/25"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Delete ({selectedCount})
            </button>
          )}

          <div className={cn(
            "flex flex-wrap items-center gap-1.5",
            (canPublishNow || canSchedule || canDelete) && "border-l border-white/10 pl-2"
          )}>
            <button
              type="button"
              disabled={selectedCount === 0 || isAllMatchingSelected}
              onClick={() => void withFeedback(onCopyNames, "Filenames copied")}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-2.5 py-1.5 text-[11px] font-medium text-white/70 backdrop-blur-xl transition hover:bg-white/15 hover:text-white disabled:opacity-50"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden="true" /> Names
            </button>
            <button
              type="button"
              disabled={selectedCount === 0 || isAllMatchingSelected}
              onClick={() => void withFeedback(onCopyMetadata, "Metadata copied")}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-2.5 py-1.5 text-[11px] font-medium text-white/70 backdrop-blur-xl transition hover:bg-white/15 hover:text-white disabled:opacity-50"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden="true" /> Metadata
            </button>

            <div className="relative">
              <button
                type="button"
                disabled={selectedCount === 0 || isAllMatchingSelected}
                onClick={() => setShowCollections(!showCollections)}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-2.5 py-1.5 text-[11px] font-medium text-white/70 backdrop-blur-xl transition hover:bg-white/15 hover:text-white disabled:opacity-50"
              >
                <FolderPlus className="h-3.5 w-3.5" aria-hidden="true" /> Collection
              </button>
              {showCollections && (
                <div className="absolute bottom-full left-0 mb-1 w-48 rounded-xl border border-white/10 bg-slate-950/80 p-1.5 shadow-[0_18px_55px_rgba(2,6,23,0.40)] backdrop-blur-2xl">
                  {collections.length === 0 ? (
                    <p className="px-2 py-1.5 text-[11px] text-white/50">No collections yet</p>
                  ) : (
                    collections.map((col) => (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => { onMoveSelectedToCollection(col.id); setShowCollections(false); }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] text-white/70 transition hover:bg-white/10 hover:text-white"
                      >
                        <FolderPlus className="h-3 w-3 text-white/40" aria-hidden="true" />
                        {col.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                disabled={selectedCount === 0 || isAllMatchingSelected}
                onClick={() => setShowTagInput(!showTagInput)}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-2.5 py-1.5 text-[11px] font-medium text-white/70 backdrop-blur-xl transition hover:bg-white/15 hover:text-white disabled:opacity-50"
              >
                <Tag className="h-3.5 w-3.5" aria-hidden="true" /> Tag
              </button>
              {showTagInput && (
                <div className="absolute bottom-full left-0 mb-1 flex gap-1 rounded-xl border border-white/10 bg-slate-950/80 p-1.5 shadow-[0_18px_55px_rgba(2,6,23,0.40)] backdrop-blur-2xl">
                  <input
                    type="text"
                    value={tagValue}
                    onChange={(e) => setTagValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddTag(); }}
                    placeholder="Tag name..."
                    className="h-7 w-28 rounded-lg border border-white/15 bg-white/10 px-2 text-[11px] text-white placeholder:text-white/40 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-white/20"
                    autoFocus
                  />
                  <button type="button" onClick={handleAddTag} className="text-[11px] font-medium text-white/70 hover:text-white">
                    Add
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={selectedCount === 0 || isAllMatchingSelected}
              onClick={onArchiveSelected}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-2.5 py-1.5 text-[11px] font-medium text-white/70 backdrop-blur-xl transition hover:bg-white/15 hover:text-white disabled:opacity-50"
            >
              <Archive className="h-3.5 w-3.5" aria-hidden="true" /> Archive
            </button>
            <button
              type="button"
              disabled={selectedCount === 0 || isAllMatchingSelected}
              onClick={onRestoreSelected}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-2.5 py-1.5 text-[11px] font-medium text-white/70 backdrop-blur-xl transition hover:bg-white/15 hover:text-white disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Restore
            </button>

            <button
              type="button"
              onClick={onClearAllSelection}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-2.5 py-1.5 text-[11px] font-medium text-white/80 backdrop-blur-xl transition hover:bg-white/20"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" /> Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
