"use client";

import {
  Suspense,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import {
  CheckCircle,
  Info,
  LoaderCircle,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

type Status =
  | "loading"
  | "success"
  | "error";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailPageInner />
    </Suspense>
  );
}

function VerifyEmailPageInner() {
  const searchParams = useSearchParams();
  const verifyUrl =
    searchParams.get("verify_url");

  const [status, setStatus] =
    useState<Status>("loading");
  const [message, setMessage] = useState(
    "Memverifikasi alamat email...",
  );

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      if (!verifyUrl) {
        setStatus("error");
        setMessage(
          "Tautan verifikasi tidak lengkap.",
        );
        return;
      }

      let parsedUrl: URL;

      try {
        parsedUrl = new URL(verifyUrl);
      } catch {
        setStatus("error");
        setMessage(
          "Tautan verifikasi tidak valid.",
        );
        return;
      }

      const validUrl =
        parsedUrl.protocol === "https:" &&
        parsedUrl.hostname ===
          "api.nexapa.app" &&
        parsedUrl.pathname.startsWith(
          "/api/v1/auth/email/verify/",
        );

      if (!validUrl) {
        setStatus("error");
        setMessage(
          "Tujuan verifikasi tidak diizinkan.",
        );
        return;
      }

      try {
        const response = await fetch(
          "/api/auth/nexapa-verify",
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              verify_url:
                parsedUrl.toString(),
            }),
            cache: "no-store",
          },
        );

        const result = await response
          .json()
          .catch(() => ({
            success: false,
            message:
              "Respons verifikasi tidak valid.",
          }));

        if (cancelled) return;

        if (!response.ok || !result.success) {
          setStatus("error");
          setMessage(
            result.message ??
              "Verifikasi email gagal.",
          );
          return;
        }

        setStatus("success");
        setMessage(
          "Email berhasil diverifikasi. Silakan masuk menggunakan akun Nexapa.",
        );
      } catch {
        if (cancelled) return;

        setStatus("error");
        setMessage(
          "Layanan verifikasi tidak dapat dihubungi.",
        );
      }
    }

    verify();

    return () => {
      cancelled = true;
    };
  }, [verifyUrl]);

  return (
    <div className="w-full max-w-[420px]">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <div
          className={[
            "mx-auto flex h-12 w-12 items-center justify-center rounded-xl",
            status === "success"
              ? "bg-emerald-50 text-emerald-600"
              : status === "error"
                ? "bg-red-50 text-red-600"
                : "bg-blue-50 text-blue-600",
          ].join(" ")}
        >
          {status === "success" ? (
            <CheckCircle className="h-6 w-6" />
          ) : status === "error" ? (
            <Info className="h-6 w-6" />
          ) : (
            <LoaderCircle className="h-6 w-6 animate-spin" />
          )}
        </div>

        <h1 className="mt-5 text-[22px] font-semibold tracking-tight text-slate-900">
          {status === "success"
            ? "Email verified"
            : status === "error"
              ? "Verification failed"
              : "Verifying email"}
        </h1>

        <p className="mt-2 text-[13px] leading-6 text-slate-500">
          {message}
        </p>

        {status !== "loading" && (
          <Link
            href="/login"
            className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-lg bg-slate-900 px-4 text-[13px] font-medium text-white transition hover:bg-slate-800"
          >
            {status === "success"
              ? "Sign in to CRM"
              : "Back to sign in"}
          </Link>
        )}
      </div>
    </div>
  );
}
