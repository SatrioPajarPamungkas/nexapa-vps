import { uploadMediaFile, type MediaAsset } from "./media-upload";
import type { PublisherMediaKind } from "@/features/publisher/publisher.types";

export type UploadQueueItemStatus = 
  | "queued"
  | "uploading"
  | "processing"
  | "completed"
  | "failed";

export type UploadQueueItem = {
  id: string;
  file: File;
  status: UploadQueueItemStatus;
  progress: number;
  error: string | null;
  result: MediaAsset | null;
  retryCount: number;
};

export type UploadQueueOptions = {
  concurrency?: number;
  maxRetries?: number;
  expectedMediaKind?: PublisherMediaKind;
};

export type UploadQueueCallbacks = {
  onStatusChange?: (items: UploadQueueItem[]) => void;
  onAllComplete?: (items: UploadQueueItem[]) => void;
};

export class UploadQueue {
  private items: UploadQueueItem[] = [];
  private concurrency: number;
  private maxRetries: number;
  private expectedMediaKind: PublisherMediaKind;
  private abortController: AbortController | null = null;
  private running = false;
  private callbacks: UploadQueueCallbacks = {};

  constructor(
    files: File[],
    options: UploadQueueOptions = {},
    callbacks: UploadQueueCallbacks = {},
  ) {
    this.items = files.map((file) => ({
      id: `upload_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      file,
      status: "queued",
      progress: 0,
      error: null,
      result: null,
      retryCount: 0,
    }));
    this.concurrency = options.concurrency ?? 3;
    this.maxRetries = options.maxRetries ?? 1;
    this.expectedMediaKind = options.expectedMediaKind ?? "video";
    this.callbacks = callbacks;
  }

  public getItems(): UploadQueueItem[] {
    return [...this.items];
  }

  public getPendingCount(): number {
    return this.items.filter((item) => 
      item.status === "queued" || item.status === "uploading"
    ).length;
  }

  public getCompletedCount(): number {
    return this.items.filter((item) => item.status === "completed").length;
  }

  public getFailedCount(): number {
    return this.items.filter((item) => item.status === "failed").length;
  }

  public hasFailures(): boolean {
    return this.getFailedCount() > 0;
  }

  public isComplete(): boolean {
    return this.items.every((item) => 
      item.status === "completed" || item.status === "failed"
    );
  }

  public async start(): Promise<void> {
    if (this.running) return;
    
    this.running = true;
    this.abortController = new AbortController();

    try {
      const workers: Promise<void>[] = [];
      
      for (let i = 0; i < this.concurrency; i++) {
        workers.push(this.worker());
      }

      await Promise.all(workers);
      
      if (this.callbacks.onAllComplete) {
        this.callbacks.onAllComplete(this.items);
      }
    } finally {
      this.running = false;
      this.abortController = null;
    }
  }

  public cancel(): void {
    this.abortController?.abort();
    this.running = false;
    
    for (const item of this.items) {
      if (item.status === "queued" || item.status === "uploading") {
        item.status = "failed";
        item.error = "Upload cancelled";
      }
    }
    
    this.notifyStatusChange();
  }

  public async retryFailed(): Promise<void> {
    const failedItems = this.items.filter((item) => item.status === "failed");
    
    for (const item of failedItems) {
      item.status = "queued";
      item.progress = 0;
      item.error = null;
      item.result = null;
    }
    
    this.notifyStatusChange();
    await this.start();
  }

  private async worker(): Promise<void> {
    while (this.running) {
      const item = this.items.find((i) => i.status === "queued");
      
      if (!item) {
        return;
      }

      await this.processItem(item);
    }
  }

  private async processItem(item: UploadQueueItem): Promise<void> {
    item.status = "uploading";
    this.notifyStatusChange();

    try {
      const result = await uploadMediaFile(
        item.file,
        this.expectedMediaKind,
        (progress) => {
          item.progress = progress.percent;
          this.notifyStatusChange();
        },
        this.abortController?.signal,
      );

      item.status = "completed";
      item.progress = 100;
      item.result = result;
      this.notifyStatusChange();
    } catch (error) {
      const shouldRetry = item.retryCount < this.maxRetries;
      
      if (shouldRetry && this.running) {
        item.retryCount += 1;
        item.status = "queued";
        item.progress = 0;
        item.error = null;
        this.notifyStatusChange();
        await new Promise((resolve) => setTimeout(resolve, 1000 * item.retryCount));
        return this.processItem(item);
      }

      item.status = "failed";
      item.error = error instanceof Error ? error.message : "Upload failed";
      this.notifyStatusChange();
    }
  }

  private notifyStatusChange(): void {
    if (this.callbacks.onStatusChange) {
      this.callbacks.onStatusChange(this.items);
    }
  }
}

export function createUploadQueue(
  files: File[],
  options?: UploadQueueOptions,
  callbacks?: UploadQueueCallbacks,
): UploadQueue {
  return new UploadQueue(files, options, callbacks);
}