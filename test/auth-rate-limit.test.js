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

  it("scopes identifier limits by company slug", async () => {
    const companyA = await createCompany({ name: "Rate Limit Company A" });
    const companyB = await createCompany({ name: "Rate Limit Company B" });
    await createUser({ companyId: companyA.id, email: "shared-rate@example.com", passwordPlain: password });
    await createUser({ companyId: companyB.id, email: "shared-rate@example.com", passwordPlain: password });

    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post(`/api/v1/c/${companyA.slug}/auth/login`)
        .send({ identifier: "shared-rate@example.com", password: "wrongpass" });
      expect(res.status).toBe(401);
    }

    const companyARes = await request(app)
      .post(`/api/v1/c/${companyA.slug}/auth/login`)
      .send({ identifier: "shared-rate@example.com", password: "wrongpass" });
    expect(companyARes.status).toBe(429);

    const companyBRes = await request(app)
      .post(`/api/v1/c/${companyB.slug}/auth/login`)
      .send({ identifier: "shared-rate@example.com", password: "wrongpass" });
    expect(companyBRes.status).toBe(401);
  });
});
