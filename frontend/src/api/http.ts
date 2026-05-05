import { addCsrfHeader } from "./csrf";

export type ApiErrorShape = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type HttpOptions = {
  method?: string;
  body?: unknown;
};

export async function http<T>(path: string, options: HttpOptions = {}): Promise<T> {
  const { method = "GET", body } = options;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  let payload: BodyInit | undefined;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (isFormData) {
    payload = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  addCsrfHeader(headers, method);

  const res = await fetch(path, {
    method,
    cache: "no-store",
    credentials: "include",
    headers,
    body: payload,
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data: ApiErrorShape | T | { error?: string; status?: string | null } | undefined =
    isJson ? await res.json() : undefined;

  if (!res.ok) {
    if (res.status === 402 && (data as { error?: string })?.error === "SUBSCRIPTION_INACTIVE") {
      const status = (data as { status?: string | null })?.status ?? null;
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("subscription-inactive", { detail: { status } }),
        );
      }
      throw new ApiError(
        res.status,
        "Subscription inactive",
        "SUBSCRIPTION_INACTIVE",
        { status },
      );
    }

    const apiErr = (data as ApiErrorShape)?.error;
    const message = apiErr?.message || res.statusText || "Request failed";
    const code = apiErr?.code;
    const details = apiErr?.details;
    throw new ApiError(res.status, message, code, details);
  }

  return data as T;
}
