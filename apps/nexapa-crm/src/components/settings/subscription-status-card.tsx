'use client';

import { useEffect, useState } from 'react';
import {
  CalendarClock,
  Loader2,
  PackageCheck,
} from 'lucide-react';

import { Card } from '@/components/ui/card';

interface SubscriptionStatus {
  admin_bypass?: boolean;
  status?: string;
  plan?: string;
  plan_name?: string;
  billing_cycle?: 'monthly' | 'yearly';
  expires_at?: string;
  message?: string;
}

function formatDate(value?: string) {
  if (!value) return '—';

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value));
}

function remainingDays(value?: string) {
  if (!value) return null;

  return Math.max(
    0,
    Math.ceil(
      (new Date(value).getTime() - Date.now()) /
        86_400_000,
    ),
  );
}

export function SubscriptionStatusCard() {
  const [data, setData] =
    useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/subscription/status', {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        const body =
          (await response.json()) as SubscriptionStatus;

        if (!response.ok && !body.status) {
          throw new Error(
            body.message || 'Status paket gagal dimuat.',
          );
        }

        setData(body);
      })
      .catch((caught) => {
        if (caught instanceof DOMException) return;

        setError(
          caught instanceof Error
            ? caught.message
            : 'Status paket gagal dimuat.',
        );
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <Card className="mt-4 items-center justify-center px-5 py-8">
        <Loader2 className="size-5 animate-spin text-primary" />
      </Card>
    );
  }

  const admin = Boolean(data?.admin_bypass);
  const active = admin || data?.status === 'active';
  const days = remainingDays(data?.expires_at);

  return (
    <Card className="mt-4 flex-row items-center gap-4 px-5 py-5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <PackageCheck className="size-5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            Paket CRM
          </h2>

          <span
            className={
              'rounded-full px-2.5 py-1 text-xs font-semibold ' +
              (active
                ? 'bg-emerald-500/10 text-emerald-600'
                : 'bg-amber-500/10 text-amber-600')
            }
          >
            {admin
              ? 'Akses administrator'
              : active
                ? 'Aktif'
                : data?.status === 'expired'
                  ? 'Berakhir'
                  : 'Belum aktif'}
          </span>
        </div>

        {error ? (
          <p className="mt-1.5 text-xs text-destructive">
            {error}
          </p>
        ) : (
          <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {admin
                ? 'Administrator'
                : data?.plan_name ||
                  data?.plan ||
                  'Tanpa paket'}
            </span>

            {data?.billing_cycle && (
              <span>
                {data.billing_cycle === 'yearly'
                  ? 'Tahunan'
                  : 'Bulanan'}
              </span>
            )}

            {data?.expires_at && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="size-3.5" />
                Berakhir {formatDate(data.expires_at)}
                {days !== null && ` · ${days} hari tersisa`}
              </span>
            )}
          </div>
        )}
      </div>

      {!admin && (
        <a
          href="https://nexapa.app/pricing.html?product=crm"
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
        >
          {active ? 'Kelola paket' : 'Pilih paket'}
        </a>
      )}
    </Card>
  );
}
