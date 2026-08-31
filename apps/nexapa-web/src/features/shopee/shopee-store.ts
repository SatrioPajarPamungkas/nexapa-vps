export type ShopeeDraftStatus = "draft" | "scheduled" | "ready";

export type ShopeeDraft = {
  id: string;
  title: string;
  caption: string;
  productUrl: string;
  scheduleAt: string;
  videoName: string | null;
  videoSize: number | null;
  status: ShopeeDraftStatus;
  createdAt: number;
  updatedAt: number;
};

const KEY = "nexapa.shopee.drafts.v2";

export function loadShopeeDrafts(): ShopeeDraft[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function saveShopeeDraft(draft: ShopeeDraft): ShopeeDraft[] {
  const current = loadShopeeDrafts();
  const index = current.findIndex((item) => item.id === draft.id);
  const next = index >= 0
    ? current.map((item) => item.id === draft.id ? draft : item)
    : [draft, ...current];
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("nexapa:shopee-drafts"));
  return next;
}

export function deleteShopeeDraft(id: string): ShopeeDraft[] {
  const next = loadShopeeDrafts().filter((item) => item.id !== id);
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("nexapa:shopee-drafts"));
  return next;
}

export function formatShopeeDate(value: number | string): string {
  const date = typeof value === "number" ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
