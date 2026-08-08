import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Layers } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";

export function GoogleCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const status = searchParams.get("status");
    const googleError = searchParams.get("google_error");

    if (googleError) {
      handleGoogleError(googleError);
      return;
    }

    if (status === "success") {
      handleSuccess();
    } else {
      navigate("/login", { replace: true });
    }
  }, [searchParams, navigate]);

  async function handleSuccess() {
    try {
      await refreshUser();
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      setError("Failed to complete authentication");
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 2000);
    }
  }

  function handleGoogleError(googleError: string) {
    let message = "Authentication failed";

    switch (googleError) {
      case "access_denied":
        message = "You cancelled the Google authentication";
        break;
      case "email_unavailable":
        message = "Email address is not available";
        break;
      case "email_not_verified":
        message = "Please verify your email with Google first";
        break;
      case "account_conflict":
        message = "This email is already associated with another account";
        break;
      case "not_configured":
        message = "Google authentication is not configured";
        break;
      default:
        message = "Authentication failed";
    }

    setError(message);
    setTimeout(() => {
      navigate("/login", { replace: true });
    }, 3000);
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50">
      <div className="w-full max-w-[420px] px-4">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Layers className="h-5 w-5" aria-hidden="true" />
          </div>
          <span className="text-sm font-semibold tracking-widest text-slate-900">
            NEXAPA
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          {error ? (
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                  <svg
                    className="h-6 w-6 text-amber-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
              </div>
              <h2 className="mb-2 text-lg font-semibold text-slate-900">
                Authentication Failed
              </h2>
              <p className="text-sm text-slate-600">{error}</p>
              <p className="mt-4 text-xs text-slate-500">
                Redirecting to login...
              </p>
            </div>
          ) : (
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex h-12 w-12 animate-spin items-center justify-center rounded-full bg-blue-100">
                  <svg
                    className="h-6 w-6 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </div>
              </div>
              <h2 className="mb-2 text-lg font-semibold text-slate-900">
                Completing Sign In
              </h2>
              <p className="text-sm text-slate-600">
                Please wait while we complete your authentication...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
