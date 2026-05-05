const request = require("supertest");
const app = require("../src/app");
const logger = require("../src/config/logger");
const requestLogger = require("../src/middlewares/requestLogger");

describe("requestLogger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("redacts sensitive query string values", () => {
    const sanitized = requestLogger.sanitizeUrl(
      "/reset-password/validate?token=reset-token&companySlug=acme&clientSecret=secret-value&code=abc123",
    );

    expect(sanitized).toBe(
      "/reset-password/validate?token=[REDACTED]&companySlug=acme&clientSecret=[REDACTED]&code=[REDACTED]",
    );
    expect(sanitized).not.toContain("reset-token");
    expect(sanitized).not.toContain("secret-value");
    expect(sanitized).not.toContain("abc123");
  });

  it("keeps non-sensitive query string values readable", () => {
    expect(requestLogger.sanitizeUrl("/api/v1/companies/public?companySlug=acme&page=2")).toBe(
      "/api/v1/companies/public?companySlug=acme&page=2",
    );
  });

  it("logs the sanitized path instead of the raw URL", async () => {
    const infoSpy = vi.spyOn(logger, "info").mockImplementation(() => {});

    await request(app).get("/?token=reset-token&companySlug=acme&clientSecret=secret-value").expect(200);

    const requestLogCall = infoSpy.mock.calls.find((call) => call[1] === "request");
    expect(requestLogCall).toBeDefined();
    expect(requestLogCall[0].path).toBe("/?token=[REDACTED]&companySlug=acme&clientSecret=[REDACTED]");
    expect(requestLogCall[0].path).not.toContain("reset-token");
    expect(requestLogCall[0].path).not.toContain("secret-value");
  });
});
