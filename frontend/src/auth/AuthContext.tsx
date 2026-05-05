import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getMe, login as apiLogin, logout as apiLogout, MeResponse } from "../api/auth";
import { clearToken } from "./token";
import { ApiError } from "../api/http";
import { setCompanySlug } from "./companySlug";

type AuthContextType = {
  user: MeResponse["user"] | null;
  company: MeResponse["company"] | null;
  role: string | null;
  loading: boolean;
  error: string | null;
  login: (companySlug: string, identifier: string, password: string) => Promise<MeResponse>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<MeResponse["user"] | null>(null);
  const [company, setCompany] = useState<MeResponse["company"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getMe();
        setUser(res.user);
        setCompany(res.company);
        if (res.company?.slug) {
          setCompanySlug(res.company.slug);
        }
      } catch (err) {
        clearToken();
        if (!(err instanceof ApiError && err.status === 401)) {
          const msg = err instanceof ApiError ? err.message : "Session expired";
          setError(msg);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const login = async (companySlug: string, identifier: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiLogin(companySlug, identifier, password);
      const slugToStore = res.company?.slug || companySlug;
      if (slugToStore) setCompanySlug(slugToStore);
      const me = await getMe();
      setUser(me.user);
      setCompany(me.company);
      return me;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Login failed";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearToken();
    void apiLogout().catch(() => {});
    setUser(null);
    setCompany(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        role: user?.role || null,
        loading,
        error,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
