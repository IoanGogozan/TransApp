export const CSRF_COOKIE_NAME = "transapp_csrf";
export const CSRF_HEADER_NAME = "X-CSRF-Token";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const isUnsafeMethod = (method = "GET") => UNSAFE_METHODS.has(method.toUpperCase());

export const getCsrfToken = (): string | null => {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie.split(";").map((part) => part.trim()).filter(Boolean);
  for (const cookie of cookies) {
    const separatorIndex = cookie.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = cookie.slice(0, separatorIndex);
    if (key !== CSRF_COOKIE_NAME) continue;
    return decodeURIComponent(cookie.slice(separatorIndex + 1));
  }
  return null;
};

export const addCsrfHeader = (headers: Record<string, string>, method = "GET") => {
  if (!isUnsafeMethod(method)) return headers;
  const token = getCsrfToken();
  if (token) {
    headers[CSRF_HEADER_NAME] = token;
  }
  return headers;
};
