const express = require("express");
const path = require("path");
const apiV1Router = require("./routes/apiV1");
const AppError = require("./utils/AppError");
const errorHandler = require("./middlewares/errorHandler");
const requestId = require("./middlewares/requestId");
const requestLogger = require("./middlewares/requestLogger");

const app = express();

// Disable HTTP caching for APIs and etag generation
app.set("etag", false);
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

// Basic middleware setup
app.use(requestId);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
