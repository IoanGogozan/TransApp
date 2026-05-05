const express = require("express");
const request = require("supertest");
const createRateLimiter = require("../src/middleware/rateLimiterGeneral");

describe("general rate limiter", () => {
  it("does not use spoofed X-Forwarded-For when trust proxy is disabled", async () => {
    const app = express();
    const limiter = createRateLimiter({
      windowMs: 60 * 1000,
      max: 1,
      prefix: `test-spoof-${Date.now()}`,
    });

    app.get("/limited", limiter, (req, res) => {
      res.json({ ok: true });
    });

    await request(app).get("/limited").set("X-Forwarded-For", "203.0.113.10").expect(200);

    const res = await request(app).get("/limited").set("X-Forwarded-For", "203.0.113.20");

    expect(res.status).toBe(429);
    expect(res.body.code).toBe("RATE_LIMITED");
  });
});
