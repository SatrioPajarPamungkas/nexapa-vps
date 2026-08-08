import { FileQuestion, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
        <FileQuestion className="h-6 w-6" aria-hidden="true" />
      </div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-blue-600">
        404 — Not found
      </p>
      <h1 className="mt-2 text-[24px] font-semibold tracking-tight text-slate-900">
        This page does not exist
      </h1>
      <p className="mt-2 max-w-[420px] text-[14px] leading-6 text-slate-600">
        The route you attempted is not part of the Nexapa navigation shell.
        If you typed the URL manually, check the spelling or return to the
        workspace.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-medium text-white shadow-sm hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Dashboard
        </Link>
        <Link
          to="/login"
          className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          Sign-in view
        </Link>
      </div>

      <div className="mt-8 text-[11px] text-slate-400">
        Available routes: /login, /dashboard, /downloader, /library, /accounts,
        /publisher, /scheduler, /affiliate, /history, /settings
      </div>
    </div>
  );
}
