import { useState, useEffect } from "react";
import { Layers, Mail, RefreshCw, LogOut, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import * as verificationApi from "@/lib/api/verification";

type VerifyStatus = "pending" | "verifying" | "verified" | "invalid" | "resent";

export function VerifyEmailPage() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<VerifyStatus>("pending");
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [message, setMessage] = useState<string>("");

  const verifyUrl = searchParams.get("verify_url");

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    if (user.email_verified) {
      setStatus("verified");
      setMessage("Email already verified. Redirecting...");
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 2000);
      return;
    }

    if (verifyUrl) {
      handleVerifyEmail(verifyUrl);
    }
  }, [user, verifyUrl, navigate]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  async function handleVerifyEmail(url: string) {
    setStatus("verifying");
    try {
      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      const result = await response.json();

      if (result.success) {
        setStatus("verified");
        setMessage("Email verified successfully! Redirecting...");
        await refreshUser();
        setTimeout(() => {
          navigate("/dashboard", { replace: true });
        }, 2000);
      } else {
        setStatus("invalid");
        setMessage(result.message || "Invalid or expired verification link.");
      }
    } catch (error) {
      setStatus("invalid");
      setMessage("Verification failed. Please request a new verification email.");
    }
  }

  async function handleResend() {
    if (countdown > 0) return;

    setIsResending(true);
    try {
      await verificationApi.resendVerificationEmail();
      setStatus("resent");
      setMessage("Verification email sent. Please check your inbox and spam folder.");
      setCountdown(60);
    } catch (error: any) {
      setMessage(error?.message || "Failed to send verification email.");
    } finally {
      setIsResending(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-sm text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[420px]">
      <div className="mb-8 flex items-center gap-3 lg:hidden">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
          <Layers className="h-5 w-5" aria-hidden="true" />
        </div>
        <span className="text-sm font-semibold tracking-widest text-slate-900">
          NEXAPA
        </span>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
            <Mail className="h-6 w-6 text-blue-600" aria-hidden="true" />
          </div>
          <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">
            Verify Your Email
          </h1>
        </div>

        <div className="mb-6 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-700">
              We've sent a verification email to:
            </p>
            <p className="mt-1.5 font-medium text-slate-900">{user.email}</p>
          </div>

          {status === "pending" && (
            <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-3 text-[13px] leading-5 text-blue-900">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium">Check your inbox</p>
                <p className="mt-0.5 text-blue-800">
                  Click the verification link in the email to continue. Also check your spam folder.
                </p>
              </div>
            </div>
          )}

          {status === "verifying" && (
            <div className="flex items-center gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-3 text-[13px] leading-5 text-blue-900">
              <RefreshCw className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
              <div>Verifying your email...</div>
            </div>
          )}

          {status === "verified" && (
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-[13px] leading-5 text-emerald-900">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium">Email verified!</p>
                <p className="mt-0.5 text-emerald-800">{message}</p>
              </div>
            </div>
          )}

          {status === "invalid" && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] leading-5 text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium">Verification link invalid or expired</p>
                <p className="mt-0.5 text-amber-800">{message}</p>
              </div>
            </div>
          )}

          {status === "resent" && (
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-[13px] leading-5 text-emerald-900">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium">Email sent</p>
                <p className="mt-0.5 text-emerald-800">{message}</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <button
            onClick={handleResend}
            disabled={isResending || countdown > 0 || status === "verified"}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isResending ? "animate-spin" : ""}`} aria-hidden="true" />
            {countdown > 0 ? `Resend in ${countdown}s` : isResending ? "Sending..." : "Resend Verification Email"}
          </button>

          <button
            onClick={handleLogout}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-[13px] font-medium text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Logout
          </button>
        </div>

        <div className="mt-6 text-center text-[12px] text-slate-500">
          <p>Didn't receive the email?</p>
          <p className="mt-1">Check your spam folder or request a new verification email.</p>
        </div>
      </div>
    </div>
  );
}