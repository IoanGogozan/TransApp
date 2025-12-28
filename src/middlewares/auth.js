const AppError = require("../utils/AppError");
const { verifyToken } = require("../utils/jwt");

const auth = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(new AppError(401, "Unauthorized", "AUTH_MISSING_TOKEN"));
  }

  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.userId,
      companyId: payload.companyId,
      role: payload.role,
    };
    return next();
  } catch (err) {
    return next(new AppError(401, "Unauthorized", "AUTH_INVALID_TOKEN"));
  }
};

module.exports = auth;
