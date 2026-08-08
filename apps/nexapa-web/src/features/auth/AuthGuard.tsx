import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { authenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user && !user.email_verified && location.pathname !== "/verify-email") {
    return <Navigate to="/verify-email" replace />;
  }

  return <>{children}</>;
}
