import { http } from "./http";

export type LoginResponse = {
  token: string;
  user: {
    id: number;
    email: string | null;
    phone: string | null;
    username: string | null;
    role: string;
  };
  company: {
    id: number;
    name: string;
    slug: string;
  };
};

export type MeResponse = {
  user: {
    id: number;
    email: string | null;
    role: string;
    active: boolean;
    mustChangePassword: boolean;
  };
  company: {
    id: number;
    name: string;
    slug?: string;
  };
};

export type PublicCompanyResponse = {
  company: {
    id: number;
    name: string;
    slug: string;
    plan: string;
    defaultLanguage: string;
  };
};

export const login = (companySlug: string, identifier: string, password: string) =>
  http<LoginResponse>(`/api/v1/c/${companySlug}/auth/login`, {
    method: "POST",
    body: { identifier, password },
  });

export const getPublicCompany = (companySlug: string) => http<PublicCompanyResponse>(`/api/v1/c/${companySlug}/public`);

export const getMe = () => http<MeResponse>("/api/v1/me");
