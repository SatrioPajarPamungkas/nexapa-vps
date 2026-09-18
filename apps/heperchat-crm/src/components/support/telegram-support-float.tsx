"use client";

import { useState } from "react";
import { ExternalLink, Send, X } from "lucide-react";

const TELEGRAM_URL = "https://t.me/trisnaaji29";

export function TelegramSupportFloat() {
  const [collapsed, setCollapsed] = useState(false);

  const collapse = () => {
    setCollapsed(true);
  };

  const expand = () => {
    setCollapsed(false);
  };

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={expand}
        aria-label="Buka bantuan Telegram"
        className="fixed right-5 bottom-5 z-50 flex size-14 items-center justify-center rounded-full bg-[#229ED9] text-white shadow-[0_18px_45px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:bg-[#1b8fc7] focus-visible:ring-2 focus-visible:ring-[#229ED9] focus-visible:ring-offset-2 focus-visible:outline-none sm:right-6 sm:bottom-6"
      >
        <Send className="size-6 -rotate-12" aria-hidden="true" />
      </button>
    );
  }

  return (
    <aside
      aria-label="Bantuan Nexapa melalui Telegram"
      className="fixed right-4 bottom-4 z-50 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-2xl border border-border/80 bg-card text-card-foreground shadow-[0_24px_70px_rgba(2,6,23,0.42)] sm:right-6 sm:bottom-6"
    >
      <div className="h-1 bg-gradient-to-r from-[#229ED9] via-cyan-400 to-blue-600" />
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#229ED9] text-white shadow-sm">
            <Send className="size-5 -rotate-12" aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">Butuh bantuan CRM?</p>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                  Chat admin Nexapa langsung melalui Telegram.
                </p>
              </div>
              <button
                type="button"
                onClick={collapse}
                aria-label="Tutup notifikasi bantuan"
                className="-mt-1 -mr-1 rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                Admin Nexapa · @trisnaaji29
              </span>
            </div>

            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#229ED9] px-4 text-sm font-semibold text-white transition hover:bg-[#1b8fc7] focus-visible:ring-2 focus-visible:ring-[#229ED9] focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Chat lewat Telegram
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
}
