import { http } from "./http";

export type LoginResponse = {
  token: string;
};

export type MeResponse = {
  user: {
    id: number;
    email: string;
    role: string;
    active: boolean;
  };
  company: {
    id: number;
    name: string;
  };
};

export const login = (email: string, password: string) =>
  http<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: { email, password },
  });

export const getMe = () => http<MeResponse>("/api/v1/me");
