import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import * as authApi from "@/lib/api/auth";
import type { AuthUser } from "@/types/auth";

interface AuthContextProps {
  user: AuthUser | null;
  loading: boolean;
  authenticated: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | undefined>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const refreshUser = async () => {
    try {
      const resp = await authApi.getCurrentUser();
      setUser(resp.user);
      return resp.user;
    } catch (error: any) {
      if (error?.status === 401) {
        setUser(null);
        navigate("/login", { replace: true });
        return undefined;
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string, remember = false) => {
    setLoading(true);
    try {
      const resp = await authApi.login({ email, password, remember });
      setUser(resp.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authApi.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextProps = {
    user,
    loading,
    authenticated: !!user,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};
