const AUTH_COOKIE_NAME = "transapp_session";

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
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: parseDurationMs(process.env.JWT_EXPIRES_IN),
});

const setAuthCookie = (res, token) => {
  res.cookie(AUTH_COOKIE_NAME, token, getCookieOptions());
};

const clearAuthCookie = (res) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
};

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

const getAuthCookie = (req) => getCookieValue(req, AUTH_COOKIE_NAME);

module.exports = {
  AUTH_COOKIE_NAME,
  clearAuthCookie,
  getAuthCookie,
  setAuthCookie,
};
