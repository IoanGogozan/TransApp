const request = require("supertest");

const loadAppWithNodeEnv = (nodeEnv) => {
  delete require.cache[require.resolve("../src/app")];
  process.env.NODE_ENV = nodeEnv;
  return require("../src/app");
};

describe("security headers", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    delete require.cache[require.resolve("../src/app")];
  });

  it("sets strict CSP and hardening headers in production", async () => {
    const app = loadAppWithNodeEnv("production");

    const res = await request(app).get("/").expect(200);

    expect(res.headers["content-security-policy"]).toContain("default-src 'self'");
    expect(res.headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(res.headers["content-security-policy"]).toContain("object-src 'none'");
    expect(res.headers["strict-transport-security"]).toContain("max-age=31536000");
    expect(res.headers["strict-transport-security"]).toContain("includeSubDomains");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("DENY");
    expect(res.headers["referrer-policy"]).toBe("no-referrer");
    expect(res.headers["permissions-policy"]).toBe("camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  });

  it("keeps CSP and HSTS disabled outside production", async () => {
    const app = loadAppWithNodeEnv("test");

    const res = await request(app).get("/").expect(200);

    expect(res.headers["content-security-policy"]).toBeUndefined();
    expect(res.headers["strict-transport-security"]).toBeUndefined();
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("DENY");
    expect(res.headers["referrer-policy"]).toBe("no-referrer");
    expect(res.headers["permissions-policy"]).toBe("camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  });
});
