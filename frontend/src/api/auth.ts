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
    phone: string | null;
    username: string | null;
    role: string;
    active: boolean;
    mustChangePassword: boolean;
  };
  company: {
    id: number;
    name: string;
    slug: string;
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

export type RegisterCompanyResponse = {
  company: {
    id: number;
    name: string;
    slug: string;
  };
};

export const login = (companySlug: string, identifier: string, password: string) =>
  http<LoginResponse>(`/api/v1/c/${companySlug}/auth/login`, {
    method: "POST",
    body: { identifier, password },
  });

export const getPublicCompany = (companySlug: string) => http<PublicCompanyResponse>(`/api/v1/c/${companySlug}/public`);

export const registerCompany = (input: {
  companyName: string;
  companySlug: string;
  adminEmail: string;
  adminPassword: string;
}) =>
  http<RegisterCompanyResponse>("/api/v1/public/register", {
    method: "POST",
    body: input,
  });

export const getMe = () => http<MeResponse>("/api/v1/me");

export const requestPasswordReset = (companySlug: string, email: string) =>
  http<{ ok: true; message: string }>("/api/v1/auth/forgot-password", {
    method: "POST",
    body: { companySlug, email },
  });

export const validatePasswordResetToken = (companySlug: string, token: string) =>
  http<{ valid: true }>(
    `/api/v1/auth/reset-password/validate?companySlug=${encodeURIComponent(companySlug)}&token=${encodeURIComponent(token)}`
  );

export const resetPasswordWithToken = (companySlug: string, token: string, password: string) =>
  http<{ ok: true }>("/api/v1/auth/reset-password", {
    method: "POST",
    body: { companySlug, token, password },
  });
