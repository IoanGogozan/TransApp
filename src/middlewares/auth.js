const AppError = require("../utils/AppError");
const prisma = require("../config/prismaClient");
const { verifyToken } = require("../utils/jwt");
const { getAuthCookie } = require("../utils/authCookie");

const auth = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const [scheme, bearerToken] = authHeader.split(" ");
  const token = scheme === "Bearer" && bearerToken ? bearerToken : getAuthCookie(req);
  const authSource = scheme === "Bearer" && bearerToken ? "bearer" : "cookie";

  if (!token) {
    return next(new AppError(401, "Unauthorized", "AUTH_MISSING_TOKEN"));
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    return next(new AppError(401, "Unauthorized", "AUTH_INVALID_TOKEN"));
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        id: payload.userId,
        companyId: payload.companyId,
      },
      select: {
        id: true,
        companyId: true,
        role: true,
        isActive: true,
        tokenVersion: true,
      },
    });

    if (!user) {
      return next(new AppError(401, "Unauthorized", "AUTH_INVALID_TOKEN"));
    }

    if (!user.isActive) {
      return next(new AppError(403, "User is disabled", "AUTH_USER_DISABLED"));
    }

    if (payload.tokenVersion !== user.tokenVersion) {
      return next(new AppError(401, "Unauthorized", "AUTH_TOKEN_REVOKED"));
    }

    req.user = {
      id: user.id,
      companyId: user.companyId,
      role: user.role,
      isActive: user.isActive,
      tokenVersion: user.tokenVersion,
    };
    req.authSource = authSource;
    return next();
  } catch (err) {
    return next(err);
  }
};

module.exports = auth;
