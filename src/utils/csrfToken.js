const crypto = require("crypto");

const CSRF_COOKIE_NAME = "transapp_csrf";
const CSRF_HEADER_NAME = "x-csrf-token";

const createCsrfToken = () => crypto.randomBytes(32).toString("base64url");

const parseDurationMs = (value) => {
  if (!value) return 60 * 60 * 1000;
  if (/^\d+$/.test(String(value))) return Number(value) * 1000;

  const match = /^(\d+)([smhd])$/.exec(String(value).trim());
  if (!match) return 60 * 60 * 1000;

  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return amount * multipliers[unit];
};

const getCookieOptions = () => ({
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: parseDurationMs(process.env.JWT_EXPIRES_IN),
});

const getCookieValue = (req, name) => {
  const cookieHeader = req.headers.cookie || "";
  const cookies = cookieHeader.split(";").map((part) => part.trim()).filter(Boolean);
  for (const cookie of cookies) {
    const separatorIndex = cookie.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = cookie.slice(0, separatorIndex);
    if (key !== name) continue;
    return decodeURIComponent(cookie.slice(separatorIndex + 1));
  }
  return null;
};

const timingSafeEqualString = (a, b) => {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
};

const setCsrfCookie = (res) => {
  const token = createCsrfToken();
  res.cookie(CSRF_COOKIE_NAME, token, getCookieOptions());
  return token;
};

const clearCsrfCookie = (res) => {
  res.clearCookie(CSRF_COOKIE_NAME, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
};

const validateCsrfRequest = (req) => {
  const cookieToken = getCookieValue(req, CSRF_COOKIE_NAME);
  const headerToken = req.headers[CSRF_HEADER_NAME];
  return timingSafeEqualString(cookieToken, Array.isArray(headerToken) ? headerToken[0] : headerToken);
};

module.exports = {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  clearCsrfCookie,
  setCsrfCookie,
  validateCsrfRequest,
};
