import { useState } from "react";
import { Plus, Pencil, Trash2, Folder } from "lucide-react";
import type { MediaCollection } from "../media-library.types";
import { BUILTIN_COLLECTIONS, type BuiltInCollectionKey } from "../media-library.constants";
import { MAX_COLLECTIONS } from "../media-library.types";
import { cn } from "@/lib/cn";

type Props = {
  activeCollection: string;
  onSelect: (key: string) => void;
  collections: MediaCollection[];
  collectionCounts: Record<string, number>;
  totalCount: number;
  archivedCount: number;
  onCreateCollection: (name: string) => Promise<MediaCollection | null>;
  onRenameCollection: (id: string, name: string) => Promise<boolean>;
  onDeleteCollection: (id: string) => Promise<boolean>;
};

export function MediaCollectionNav({
  activeCollection,
  onSelect,
  collections,
  collectionCounts,
  totalCount,
  archivedCount,
  onCreateCollection,
  onRenameCollection,
  onDeleteCollection,
}: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleCreate() {
    setCreateError("");
    if (!newName.trim()) {
      setCreateError("Folder name is required");
      return;
    }

    const col = await onCreateCollection(newName.trim());
    if (col) {
      setNewName("");
      setShowCreate(false);
      onSelect(col.id);
    } else {
      setCreateError("Failed to create folder. Please try again.");
    }
  }

  function handleStartEdit(col: MediaCollection) {
    setEditingId(col.id);
    setEditName(col.name);
    setEditError("");
  }

  async function handleSaveEdit(id: string) {
    setEditError("");
    if (!editName.trim()) {
      setEditError("Folder name is required");
      return;
    }

    const ok = await onRenameCollection(id, editName.trim());
    if (!ok) {
      setEditError("Failed to rename folder. Please try again.");
      return;
    }
    setEditingId(null);
  }

  async function handleConfirmDelete() {
    if (!deleteTargetId || deleteLoading) return;

    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const result = await onDeleteCollection(deleteTargetId);
      if (result) {
        setDeleteConfirmOpen(false);
        setDeleteTargetId(null);
      } else {
        setDeleteError("Failed to delete the folder. Please try again.");
      }
    } catch (error) {
      setDeleteError("Failed to delete the folder. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  }

  function getBuiltinCount(key: BuiltInCollectionKey): number {
    switch (key) {
      case "all":
        return totalCount - archivedCount;
      case "archive":
        return archivedCount;
      case "ready":
        return collectionCounts["__ready__"] ?? 0;
      case "published":
        return collectionCounts["__published__"] ?? 0;
      default:
        return 0;
    }
  }

  return (
    <nav
      aria-label="Media collections"
      className="flex flex-col gap-2 overflow-x-auto rounded-xl border border-white/20 bg-white/10 p-2 backdrop-blur-2xl shadow-[0_14px_36px_rgba(2,6,23,0.10)]"
    >
      <div className="flex items-center gap-1.5 flex-wrap" role="tablist" aria-label="Collection tabs">
        {BUILTIN_COLLECTIONS.map((col) => {
          const isActive = activeCollection === col.id;
          const count = getBuiltinCount(col.key);
          return (
            <button
              key={col.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelect(col.id)}
              className={cn(
                "relative inline-flex min-h-[40px] items-center whitespace-nowrap rounded-lg border px-3 py-1.5 text-[12px] font-medium backdrop-blur-xl transition-all",
                isActive
                  ? "border-white/25 bg-white/20 text-slate-950 shadow-sm ring-1 ring-white/10"
                  : "border-white/10 bg-white/5 text-slate-700 hover:border-white/20 hover:bg-white/12 hover:text-slate-950",
              )}
            >
              {col.name}
              {count > 0 && (
                <span
                  className={cn(
                    "ml-1.5 rounded-full border px-1.5 py-0.5 text-[10px] font-medium backdrop-blur-xl",
                    isActive
                      ? "border-white/15 bg-white/15 text-slate-800"
                      : "border-white/10 bg-white/8 text-slate-600",
                  )}
                >
                  {count}
                </span>
              )}
              {col.key === "archive" && !isActive && archivedCount > 0 && (
                <span className="ml-1.5 inline-flex h-2 w-2 rounded-full bg-amber-400"></span>
              )}
            </button>
          );
        })}

        {collections.map((col) => {
          const isActive = activeCollection === col.id;
          const count = col.mediaCount ?? 0;
          if (editingId === col.id) {
            return (
              <div key={col.id} className="flex min-h-[40px] items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 backdrop-blur-xl">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleSaveEdit(col.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="h-7 w-32 rounded-lg border border-white/20 bg-white/60 px-2 text-[12px] text-slate-900 backdrop-blur-xl placeholder:text-slate-500 focus:border-blue-400/40 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                  maxLength={60}
                  autoFocus
                />
                <button type="button" onClick={() => void handleSaveEdit(col.id)} className="min-h-[28px] rounded-md bg-white/15 px-2 text-[11px] font-medium text-slate-800 backdrop-blur-xl hover:bg-white/25">
                  Save
                </button>
                <button type="button" onClick={() => setEditingId(null)} className="min-h-[28px] rounded-md px-2 text-[11px] text-slate-600 hover:bg-white/10">
                  Cancel
                </button>
              </div>
            );
          }
          return (
            <div key={col.id} className="group relative flex items-center gap-0.5">
              <button
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelect(col.id)}
                className={cn(
                  "inline-flex min-h-[40px] items-center whitespace-nowrap rounded-lg border px-3 py-1.5 text-[12px] font-medium backdrop-blur-xl transition-all",
                  isActive
                    ? "border-white/25 bg-white/20 text-slate-950 shadow-sm ring-1 ring-white/10"
                    : "border-white/10 bg-white/5 text-slate-700 hover:border-white/20 hover:bg-white/12 hover:text-slate-950",
                )}
              >
                <Folder className="mr-1 inline h-3 w-3" aria-hidden="true" />
                {col.name}
                {count > 0 && (
                  <span
                    className={cn(
                      "ml-1.5 rounded-full border px-1.5 py-0.5 text-[10px] font-medium backdrop-blur-xl",
                      isActive
                        ? "border-white/15 bg-white/15 text-slate-800"
                        : "border-white/10 bg-white/8 text-slate-600",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
              <div className="ml-0.5 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <button
                  type="button"
                  aria-label={`Rename ${col.name}`}
                  onClick={() => handleStartEdit(col)}
                  className="inline-flex h-6 w-6 min-h-[24px] min-w-[24px] items-center justify-center rounded-md border border-white/10 bg-white/5 text-slate-500 backdrop-blur-xl hover:bg-white/15 hover:text-slate-800"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${col.name}`}
                  onClick={() => {
                    setDeleteTargetId(col.id);
                    setDeleteConfirmOpen(true);
                  }}
                  className="inline-flex h-6 w-6 min-h-[24px] min-w-[24px] items-center justify-center rounded-md border border-white/10 bg-white/5 text-slate-500 backdrop-blur-xl hover:bg-rose-500/12 hover:text-rose-700"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editError && (
        <p className="rounded-md border border-rose-300/30 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-800 backdrop-blur-xl" role="alert">{editError}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {showCreate ? (
          <div className="flex min-h-[40px] flex-wrap items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1 backdrop-blur-xl">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") setShowCreate(false);
              }}
              placeholder="Collection name..."
              className="h-7 w-40 rounded-lg border border-white/20 bg-white/60 px-2 text-[12px] text-slate-900 backdrop-blur-xl placeholder:text-slate-500 focus:border-blue-400/40 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              maxLength={60}
              autoFocus
            />
            <button type="button" onClick={handleCreate} className="min-h-[28px] rounded-md bg-white/20 px-2.5 py-1 text-[11px] font-medium text-slate-900 backdrop-blur-xl hover:bg-white/30">
              Create
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="min-h-[28px] rounded-md px-2 text-[11px] text-slate-600 hover:bg-white/10">
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            disabled={collections.length >= MAX_COLLECTIONS}
            className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-dashed border-white/20 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-600 backdrop-blur-xl transition hover:border-white/30 hover:bg-white/12 hover:text-slate-800 disabled:opacity-50"
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            Create Collection
          </button>
        )}
        {createError && (
          <p className="rounded-md border border-rose-300/30 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-800 backdrop-blur-xl" role="alert">{createError}</p>
        )}
      </div>

      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => {
              if (!deleteLoading) {
                setDeleteConfirmOpen(false);
                setDeleteTargetId(null);
                setDeleteError(null);
              }
            }}
          />
          <div className="relative rounded-2xl border border-white/20 bg-white/90 p-6 backdrop-blur-2xl shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-950">Delete scrape folder?</h3>
            <p className="mt-2 text-[13px] text-slate-700">
              Folder grouping will be removed. Media files will remain in All Media.
            </p>

            {deleteError && (
              <div className="mt-3 rounded-lg border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-800">
                {deleteError}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!deleteLoading) {
                    setDeleteConfirmOpen(false);
                    setDeleteTargetId(null);
                    setDeleteError(null);
                  }
                }}
                disabled={deleteLoading}
                className="rounded-lg border border-white/20 bg-white/12 px-4 py-2 text-[13px] font-medium text-slate-800 backdrop-blur-xl transition hover:bg-white/22 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDelete()}
                disabled={deleteLoading}
                className="rounded-lg bg-rose-600 px-4 py-2 text-[13px] font-medium text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50"
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
