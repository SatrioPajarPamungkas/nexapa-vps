import { useState, useEffect, useCallback } from "react";
import { Film } from "lucide-react";
import { apiFetchBlob } from "@/lib/api/client";
import { cn } from "@/lib/cn";

type AuthenticatedMediaThumbnailProps = {
  thumbnailUrl?: string | null;
  alt: string;
  className?: string;
};

const thumbnailBlobCache = new Map<string, Blob>();
const thumbnailRequestCache = new Map<string, Promise<Blob>>();

async function fetchThumbnailBlob(url: string): Promise<Blob> {
  if (thumbnailBlobCache.has(url)) {
    const cachedBlob = thumbnailBlobCache.get(url)!;
    if (cachedBlob.size > 0) {
      return cachedBlob;
    }
    thumbnailBlobCache.delete(url);
  }

  if (thumbnailRequestCache.has(url)) {
    return thumbnailRequestCache.get(url)!;
  }

  const requestPromise = (async () => {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname + urlObj.search;
      const blob = await apiFetchBlob(path);

      thumbnailBlobCache.set(url, blob);
      return blob;
    } catch (error) {
      throw error;
    }
  })();

  thumbnailRequestCache.set(url, requestPromise);

  void requestPromise.then(
    () => {
      thumbnailRequestCache.delete(url);
    },
    () => {
      thumbnailRequestCache.delete(url);
    },
  );

  return requestPromise;
}

export function AuthenticatedMediaThumbnail({
  thumbnailUrl,
  alt,
  className,
}: AuthenticatedMediaThumbnailProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!thumbnailUrl) {
      setObjectUrl(null);
      setLoading(false);
      setFailed(true);
      return;
    }

    setObjectUrl(null);
    setLoading(true);
    setFailed(false);

    let cancelled = false;
    let localObjectUrl: string | null = null;

    const loadThumbnail = async () => {
      try {
        const blob = await fetchThumbnailBlob(thumbnailUrl);

        if (cancelled) {
          return;
        }

        localObjectUrl = URL.createObjectURL(blob);
        setObjectUrl(localObjectUrl);
        setLoading(false);
      } catch (error) {
        if (!cancelled) {
          setFailed(true);
          setLoading(false);
        }
      }
    };

    loadThumbnail();

    return () => {
      cancelled = true;
      if (localObjectUrl) {
        URL.revokeObjectURL(localObjectUrl);
      }
    };
  }, [thumbnailUrl]);

  const handleImageError = useCallback(() => {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      setObjectUrl(null);
    }
    setFailed(true);
  }, [objectUrl]);

  if (loading) {
    return (
      <div className={cn("h-full w-full flex items-center justify-center bg-slate-950/10 backdrop-blur-sm", className)}>
        <div className="w-4 h-4 border-2 border-white/20 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (failed || !objectUrl) {
    return (
      <div className={cn("h-full w-full flex items-center justify-center bg-slate-950/10", className)}>
        <div className="text-center">
          <Film className="h-8 w-8 text-slate-400 mx-auto mb-1" />
          <span className="text-[10px] text-slate-500">Thumbnail unavailable</span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={objectUrl}
      alt={alt}
      className={cn("h-full w-full object-cover", className)}
      loading="lazy"
      onError={handleImageError}
    />
  );
}
