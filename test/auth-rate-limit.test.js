const request = require("supertest");
const app = require("../src/app");
const { createCompany, createUser } = require("./helpers/testData");
const loginRateLimit = require("../src/middleware/loginRateLimit");

describe("Auth login rate limit", () => {
  const password = "Password123!";

  beforeEach(() => {
    if (loginRateLimit._resetLoginRateLimit) {
      loginRateLimit._resetLoginRateLimit();
    }
  });

  it("rate limits repeated failed login attempts by identifier", async () => {
    const company = await createCompany({ name: "Rate Limit Co" });
    const user = await createUser({ companyId: company.id, email: "ratelimit@example.com", passwordPlain: password });

    for (let i = 0; i < 5; i++) {
      const res = await request(app).post(`/api/v1/c/${company.slug}/auth/login`).send({ identifier: user.email, password: "wrongpass" });
      expect(res.status).toBe(401);
    }

    const limited = await request(app).post(`/api/v1/c/${company.slug}/auth/login`).send({ identifier: user.email, password: "wrongpass" });
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe("AUTH_RATE_LIMITED");
  });
});
