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

  it("rejects an existing token after the user is disabled", async () => {
    const company = await createCompany({ name: "Auth Disabled Token" });
    const password = "Password123!";
    const user = await createUser({
      companyId: company.id,
      email: `driver+disabled${Date.now()}@example.com`,
      role: "DRIVER",
      passwordPlain: password,
    });

    const loginRes = await request(app)
      .post(`/api/v1/c/${company.slug}/auth/login`)
      .send({ identifier: user.email, password });

    expect(loginRes.status).toBe(200);
    const token = loginRes.body.token;

    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    });

    const meRes = await request(app).get("/api/v1/me").set("Authorization", `Bearer ${token}`);

    expect(meRes.status).toBe(403);
    expect(meRes.body.error.code).toBe("AUTH_USER_DISABLED");
  });

  it("uses the current database role instead of the role stored in an existing token", async () => {
    const company = await createCompany({ name: "Auth Role Downgrade" });
    const password = "Password123!";
    const admin = await createUser({
      companyId: company.id,
      email: `admin+downgrade${Date.now()}@example.com`,
      role: "ADMIN",
      passwordPlain: password,
    });

    const loginRes = await request(app)
      .post(`/api/v1/c/${company.slug}/auth/login`)
      .send({ identifier: admin.email, password });

    expect(loginRes.status).toBe(200);
    const token = loginRes.body.token;

    await prisma.user.update({
      where: { id: admin.id },
      data: { role: "DRIVER" },
    });

    const createUserRes = await request(app)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${token}`)
      .send({
        email: "should.not.create@example.com",
        role: "DRIVER",
        password: "Password123!",
      });

    expect(createUserRes.status).toBe(403);

    const meRes = await request(app).get("/api/v1/me").set("Authorization", `Bearer ${token}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.role).toBe("DRIVER");
  });
});
