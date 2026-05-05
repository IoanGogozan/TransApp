const auth = require("../src/middlewares/auth");

describe("Bearer auth policy", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAllowBearerAuth = process.env.ALLOW_BEARER_AUTH;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalAllowBearerAuth === undefined) {
      delete process.env.ALLOW_BEARER_AUTH;
    } else {
      process.env.ALLOW_BEARER_AUTH = originalAllowBearerAuth;
    }
  });

  it("allows Bearer auth outside production for tests and development", () => {
    process.env.NODE_ENV = "test";
    delete process.env.ALLOW_BEARER_AUTH;

    expect(auth.isBearerAuthAllowed()).toBe(true);
  });

  it("disables Bearer auth by default in production", () => {
    process.env.NODE_ENV = "production";
    delete process.env.ALLOW_BEARER_AUTH;

    expect(auth.isBearerAuthAllowed()).toBe(false);
  });

  it("allows Bearer auth in production only when explicitly enabled", () => {
    process.env.NODE_ENV = "production";
    process.env.ALLOW_BEARER_AUTH = "true";

    expect(auth.isBearerAuthAllowed()).toBe(true);
  });
});
