const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/config/prismaClient");
const { createCompany, createUser } = require("./helpers/testData");

describe("Auth + Me", () => {
  it("logs in and returns profile for driver", async () => {
    const company = await createCompany({ name: "Auth Demo Co" });
    const password = "Password123!";
    const user = await createUser({
      companyId: company.id,
      email: `driver+${Date.now()}@example.com`,
      role: "DRIVER",
      passwordPlain: password,
    });

    const loginRes = await request(app)
      .post(`/api/v1/c/${company.slug}/auth/login`)
      .send({ identifier: user.email, password });

    expect(loginRes.status).toBe(200);
    expect(typeof loginRes.body.token).toBe("string");
    expect(loginRes.body.token.length).toBeGreaterThan(10);

    const token = loginRes.body.token;
    const meRes = await request(app).get("/api/v1/me").set("Authorization", `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe(user.email);
    expect(meRes.body.user.role).toBe("DRIVER");
    expect(meRes.body.company.name).toBe(company.name);
  });

  it("allows access when subscription is TRIALING", async () => {
    const company = await createCompany({ name: "Auth Trial Access" });
    const password = "Password123!";
    const user = await createUser({
      companyId: company.id,
      email: `driver+trial${Date.now()}@example.com`,
      role: "DRIVER",
      passwordPlain: password,
    });

    const loginRes = await request(app)
      .post(`/api/v1/c/${company.slug}/auth/login`)
      .send({ identifier: user.email, password });

    const token = loginRes.body.token;
    const meRes = await request(app).get("/api/v1/me").set("Authorization", `Bearer ${token}`);

    expect(meRes.status).toBe(200);
  });

  it("allows access when subscription is CANCELED", async () => {
    const company = await createCompany({ name: "Auth Canceled Access" });
    const password = "Password123!";
    const user = await createUser({
      companyId: company.id,
      email: `driver+canceled${Date.now()}@example.com`,
      role: "DRIVER",
      passwordPlain: password,
    });

    await prisma.subscription.update({
      where: { companyId: company.id },
      data: { status: "CANCELED", canceledAt: new Date() },
    });

    const loginRes = await request(app)
      .post(`/api/v1/c/${company.slug}/auth/login`)
      .send({ identifier: user.email, password });

    const token = loginRes.body.token;
    const meRes = await request(app).get("/api/v1/me").set("Authorization", `Bearer ${token}`);

    expect(meRes.status).toBe(200);
  });
});
