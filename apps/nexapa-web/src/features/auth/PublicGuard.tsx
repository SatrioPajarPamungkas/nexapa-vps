import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { safeLocalRedirect } from "@/lib/safe-redirect";

export function PublicGuard({ children }: { children: ReactNode }) {
  const { authenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  if (authenticated) {
    const requested = new URLSearchParams(location.search).get(
      "redirect",
    );
    const source = (
      location.state as {
        from?: {
          pathname?: string;
          search?: string;
          hash?: string;
        };
      } | null
    )?.from;
    const stateRedirect = source?.pathname
      ? `${source.pathname}${source.search || ""}${source.hash || ""}`
      : null;
    const destination = safeLocalRedirect(
      requested || stateRedirect,
    );

    if (user && !user.email_verified) {
      return (
        <Navigate
          to={
            "/verify-email?redirect=" +
            encodeURIComponent(destination)
          }
          replace
        />
      );
    }

    return <Navigate to={destination} replace />;
  }

  return <>{children}</>;
}
