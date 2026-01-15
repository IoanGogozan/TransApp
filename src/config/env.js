const dotenv = require("dotenv");

const resolveEnvPath = () => {
  if (process.env.DOTENV_CONFIG_PATH) return process.env.DOTENV_CONFIG_PATH;
  if (process.env.NODE_ENV === "test") return ".env.test";
  return ".env";
};

dotenv.config({ path: resolveEnvPath() });

const requiredVars = ["PORT", "DATABASE_URL", "NODE_ENV", "JWT_SECRET", "JWT_EXPIRES_IN", "BCRYPT_ROUNDS"];
const missing = requiredVars.filter((key) => !process.env[key]);

if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

const validateDatabaseUrl = (url) => {
  if (!/^postgres(ql)?:\/\//i.test(url)) {
    throw new Error("DATABASE_URL must start with postgres:// or postgresql://");
  }
  let parsed;
  try {
    parsed = new URL(url);
  } catch (error) {
    throw new Error("DATABASE_URL must be a valid URL");
  }
  if (!parsed.hostname) {
    throw new Error("DATABASE_URL must include a hostname");
  }
  const dbName = parsed.pathname ? parsed.pathname.replace(/^\//, "") : "";
  if (!dbName) {
    throw new Error("DATABASE_URL must include a database name");
  }
};

const port = Number(process.env.PORT);
if (!Number.isFinite(port) || port <= 0) {
  throw new Error("PORT must be a positive number");
}

const bcryptRounds = Number(process.env.BCRYPT_ROUNDS);
if (!Number.isInteger(bcryptRounds) || bcryptRounds <= 0) {
  throw new Error("BCRYPT_ROUNDS must be a positive integer");
}

const databaseUrl = process.env.DATABASE_URL;
validateDatabaseUrl(databaseUrl);

const env = Object.freeze({
  port,
  nodeEnv: process.env.NODE_ENV,
  databaseUrl,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1h",
  bcryptRounds,
  appPublicUrl: process.env.APP_PUBLIC_URL || "http://localhost:5173",
  emailFrom: process.env.EMAIL_FROM || "no-reply@transapp.local",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
});

module.exports = env;
