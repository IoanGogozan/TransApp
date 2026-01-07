const express = require("express");
const path = require("path");
const helmet = require("helmet");
const cors = require("cors");
const apiV1Router = require("./routes/apiV1");
const AppError = require("./utils/AppError");
const errorHandler = require("./middlewares/errorHandler");
const requestId = require("./middlewares/requestId");
const requestLogger = require("./middlewares/requestLogger");

const app = express();

app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: false,
    hsts: false,
  }),
);
if (process.env.NODE_ENV === "production") {
  app.use(helmet.hsts({ maxAge: 15552000 }));
}

// Disable HTTP caching for APIs and etag generation
app.set("etag", false);
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

const normalizeOrigin = (value) => {
  if (!value) return null;
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    return url.origin;
  } catch {
    return trimmed;
  }
};

const allowedOrigins = new Set(
  [
    normalizeOrigin(process.env.PUBLIC_APP_URL),
    ...(process.env.CORS_ALLOWED_ORIGINS || "")
      .split(",")
      .map((origin) => normalizeOrigin(origin))
      .filter(Boolean),
  ].filter(Boolean),
);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalized = normalizeOrigin(origin);
    if (normalized && allowedOrigins.has(normalized)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type", "X-Request-Id"],
  credentials: false,
};

app.use("/api", cors(corsOptions));
app.use("/api", (req, res, next) => {
  req.setTimeout(30000);
  res.setTimeout(30000);
  next();
});

// Basic middleware setup
app.use(requestId);
const jsonParser = express.json({ limit: "200kb" });
const rawParser = express.raw({ type: "application/json" });
app.use((req, res, next) => {
  if (
    req.originalUrl.startsWith("/api/v1/webhooks/stripe") ||
    req.originalUrl.startsWith("/api/v1/webhooks/vipps")
  ) {
    return rawParser(req, res, next);
  }
  return jsonParser(req, res, next);
});
app.use(express.urlencoded({ extended: true, limit: "200kb" }));
app.use(requestLogger);

// View engine configuration
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Simple health/test route
app.get("/", (req, res) => {
  res.send("App is running");
});

// API routes
app.use("/api/v1", apiV1Router);

// 404 handler
app.use((req, res, next) => {
  next(new AppError(404, "Route not found", "NOT_FOUND"));
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
