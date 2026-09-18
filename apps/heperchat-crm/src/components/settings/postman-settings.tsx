'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  FileJson,
  Loader2,
} from 'lucide-react';

const COLLECTION_URL =
  '/docs/postman/meta-whatsapp-cloud-api.postman_collection.json';

type PostmanUrl =
  | string
  | {
      raw?: string;
    };

type PostmanRequest = {
  method?: string;
  url?: PostmanUrl;
  description?: string;
};

type PostmanItem = {
  name?: string;
  request?: PostmanRequest;
  item?: PostmanItem[];
};

type PostmanCollection = {
  info?: {
    name?: string;
    description?: string;
  };
  item?: PostmanItem[];
};

type Endpoint = {
  name: string;
  method: string;
  url: string;
  folder: string;
  description?: string;
};

function flattenItems(
  items: PostmanItem[] = [],
  folder = '',
): Endpoint[] {
  const result: Endpoint[] = [];

  for (const item of items) {
    if (item.item) {
      const nextFolder = folder
        ? `${folder} / ${item.name ?? 'Folder'}`
        : item.name ?? 'Folder';

      result.push(...flattenItems(item.item, nextFolder));
      continue;
    }

    if (!item.request) continue;

    let url = '';

    if (typeof item.request.url === 'string') {
      url = item.request.url;
    } else {
      url = item.request.url?.raw ?? '';
    }

    result.push({
      name: item.name ?? 'Unnamed request',
      method: item.request.method ?? 'GET',
      url,
      folder: folder || 'General',
      description: item.request.description,
    });
  }

  return result;
}

function MethodBadge({ method }: { method: string }) {
  return (
    <span className="inline-flex min-w-[58px] items-center justify-center rounded-md border border-border bg-muted px-2 py-1 text-[11px] font-bold uppercase text-foreground">
      {method}
    </span>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 1400);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground transition hover:bg-muted"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          Copy
        </>
      )}
    </button>
  );
}

export function PostmanSettings() {
  const [collection, setCollection] =
    useState<PostmanCollection | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(COLLECTION_URL, {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(
            `Failed to load collection (${response.status})`,
          );
        }

        const data = (await response.json()) as PostmanCollection;

        if (!cancelled) {
          setCollection(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load Postman collection',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const endpoints = useMemo(
    () => flattenItems(collection?.item ?? []),
    [collection],
  );

  const grouped = useMemo(() => {
    const groups = new Map<string, Endpoint[]>();

    for (const endpoint of endpoints) {
      const existing = groups.get(endpoint.folder) ?? [];
      existing.push(endpoint);
      groups.set(endpoint.folder, existing);
    }

    return Array.from(groups.entries());
  }, [endpoints]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Postman API
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Official Meta WhatsApp Cloud API collection and endpoint reference.
          </p>
        </div>

        <a
          href={COLLECTION_URL}
          download
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          <Download className="h-4 w-4" />
          Download Meta Collection
        </a>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileJson className="h-5 w-5" />
          </div>

          <div>
            <p className="font-medium text-foreground">
              {collection?.info?.name ??
                'Nexapa CRM WhatsApp API'}
            </p>

            <p className="text-sm text-muted-foreground">
              {loading
                ? 'Loading endpoints...'
                : `${endpoints.length} API requests`}
            </p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card p-12">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading &&
        !error &&
        grouped.map(([folder, requests]) => (
          <section
            key={folder}
            className="overflow-hidden rounded-xl border border-border bg-card"
          >
            <div className="border-b border-border bg-muted/30 px-5 py-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-foreground">
                  {folder}
                </h3>

                <span className="text-xs text-muted-foreground">
                  {requests.length} requests
                </span>
              </div>
            </div>

            <div className="divide-y divide-border">
              {requests.map((endpoint, index) => (
                <div
                  key={`${folder}-${endpoint.name}-${index}`}
                  className="p-4 transition hover:bg-muted/20"
                >
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <MethodBadge
                        method={
                          endpoint.method === 'VIEW'
                            ? 'REFERENCE'
                            : endpoint.method
                        }
                      />

                      <div className="min-w-0">
                        <p className="font-medium text-foreground">
                          {endpoint.name}
                        </p>

                        <code className="mt-1 block overflow-x-auto text-xs text-muted-foreground">
                          {endpoint.url ||
                            (endpoint.method === 'VIEW'
                              ? 'Webhook / payload reference'
                              : 'URL not configured')}
                        </code>

                        {endpoint.description && (
                          <p className="mt-2 text-xs leading-5 text-muted-foreground">
                            {endpoint.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {endpoint.url && (
                      <CopyButton value={endpoint.url} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
        Meta access tokens and other credentials are not included in
        this page or downloadable collection. Configure credentials
        securely inside Postman.
      </div>
    </div>
  );
}
