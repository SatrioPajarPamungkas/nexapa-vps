import type { CaptionAnalysis, LocalMediaAsset, MediaKind } from "./publisher.types";
import { ALL_SUPPORTED_MIMES, SUPPORTED_IMAGE_MIMES, SUPPORTED_VIDEO_MIMES } from "./publisher.constants";

let idSeq = 0;
export function generateId(prefix = "pub"): string {
  idSeq += 1;
  return `${prefix}_${Date.now().toString(36)}_${idSeq.toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
}

export function formatFileSize(bytes: number | null): string {
  if (bytes === null || Number.isNaN(bytes)) return "Unavailable";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

export function formatDimensions(w: number | null, h: number | null): string {
  if (w === null || h === null) return "Unavailable";
  return `${w} × ${h}`;
}

export function formatDuration(sec: number | null): string {
  if (sec === null || Number.isNaN(sec)) return "Unavailable";
  const s = Math.round(sec);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export function isSupportedMime(mime: string): boolean {
  return ALL_SUPPORTED_MIMES.includes(mime);
}

export function getMediaKind(mime: string): MediaKind {
  if (SUPPORTED_IMAGE_MIMES.includes(mime)) return "image";
  if (SUPPORTED_VIDEO_MIMES.includes(mime)) return "video";
  return "none";
}

export function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\w\u00C0-\u024F]+/g);
  if (!matches) return [];
  // normalize and dedup case-insensitive
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of matches) {
    const lower = m.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      out.push(m);
    }
  }
  return out;
}

export function extractMentions(text: string): string[] {
  const matches = text.match(/@[\w.]+/g);
  if (!matches) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of matches) {
    const lower = m.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      out.push(m);
    }
  }
  return out;
}

export function extractLinks(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s]+/g);
  if (!matches) return [];
  return [...new Set(matches)];
}

export function analyzeCaption(text: string): CaptionAnalysis {
  const trimmed = text.trim();
  return {
    text,
    trimmedLength: trimmed.length,
    lineCount: text ? text.split("\n").length : 0,
    hashtags: extractHashtags(text),
    hashtagCount: extractHashtags(text).length,
    mentions: extractMentions(text),
    links: extractLinks(text),
  };
}

export function normalizeHashtag(input: string): string | null {
  let t = input.trim();
  if (!t) return null;
  if (!t.startsWith("#")) t = `#${t}`;
  // remove spaces inside
  t = t.replace(/\s+/g, "");
  if (t.length < 2) return null;
  if (t.length > 50) return null;
  if (!/^#[\w]+$/.test(t)) {
    // allow unicode letters numbers underscore, reject special
    // keep simple: allow alnum and underscore after #
    // if fails, return null
    return null;
  }
  return t;
}

export function getImageMeta(url: string, timeoutMs = 5000): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let done = false;
    const timer = window.setTimeout(() => {
      if (done) return;
      done = true;
      img.src = "";
      reject(new Error("timeout"));
    }, timeoutMs);
    const cleanup = () => {
      window.clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
    };
    img.onload = () => {
      if (done) return;
      done = true;
      cleanup();
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      if (done) return;
      done = true;
      cleanup();
      reject(new Error("load failed"));
    };
    img.src = url;
  });
}

export function getVideoMeta(
  url: string,
  timeoutMs = 7000,
): Promise<{ width: number | null; height: number | null; duration: number | null }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    let done = false;
    const timer = window.setTimeout(() => {
      if (done) return;
      done = true;
      teardown();
      reject(new Error("timeout"));
    }, timeoutMs);
    const teardown = () => {
      window.clearTimeout(timer);
      video.onloadedmetadata = null;
      video.onerror = null;
      video.src = "";
      video.load();
    };
    video.onloadedmetadata = () => {
      if (done) return;
      done = true;
      const meta = {
        width: video.videoWidth || null,
        height: video.videoHeight || null,
        duration: Number.isFinite(video.duration) ? video.duration : null,
      };
      teardown();
      resolve(meta);
    };
    video.onerror = () => {
      if (done) return;
      done = true;
      teardown();
      reject(new Error("meta failed"));
    };
    video.src = url;
  });
}

export function compatibilityHint(kind: MediaKind, platform: string): string {
  if (platform === "youtube" && kind !== "video") return "Video required for YouTube";
  if (platform === "tiktok" && kind === "image") return "Video recommended for TikTok; image may have limited support";
  return "Compatible (advisory)";
}

export function createEmptyMediaMeta(asset: LocalMediaAsset | null) {
  if (!asset) return null;
  return {
    fileName: asset.fileName,
    fileSize: asset.fileSize,
    mimeType: asset.mimeType,
    kind: asset.kind,
    width: asset.width,
    height: asset.height,
    duration: asset.duration,
  };
}
