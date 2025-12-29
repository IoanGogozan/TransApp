const request = require("supertest");
const app = require("../src/app");
const { createCompany, createUser } = require("./helpers/testData");
const { loginWithSlug } = require("./helpers/auth");
const loginRateLimit = require("../src/middleware/loginRateLimit");

describe("Auth login identifiers", () => {
  const password = "Password123!";

  beforeEach(() => {
    if (loginRateLimit && typeof loginRateLimit._resetLoginRateLimit === "function") {
      loginRateLimit._resetLoginRateLimit();
    }
  });

  it("allows login with mixed-case email", async () => {
    const company = await createCompany({ name: "Company A" });
    await createUser({ companyId: company.id, email: "test@example.com", passwordPlain: password });

    const res = await loginWithSlug({ companySlug: company.slug, identifier: "Test@Example.com", password });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe("test@example.com");
  });

  it("rejects creating duplicate user with different email casing", async () => {
    const company = await createCompany({ name: "Company A" });
    const owner = await createUser({ companyId: company.id, role: "PLATFORM_ADMIN", email: "owner@example.com", passwordPlain: password });

    const loginRes = await loginWithSlug({ companySlug: company.slug, identifier: "Owner@Example.com", password });
    expect(loginRes.status).toBe(200);
    const token = loginRes.body.token;

    const firstCreate = await request(app)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "test@example.com", phone: "+1 111 111 1111", password, role: "DRIVER" });
    expect(firstCreate.status).toBe(201);

    const dupCreate = await request(app)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "Test@Example.com", phone: "+1 111 222 3333", password, role: "DRIVER" });

    expect(dupCreate.status).toBe(409);
  });

  it("allows driver login with phone", async () => {
    const company = await createCompany({ name: "Company Phone" });
    const phone = "+1 234-567-8901";
    await createUser({ companyId: company.id, phone, email: null, role: "DRIVER", passwordPlain: "abcd" });

    const res = await loginWithSlug({ companySlug: company.slug, identifier: " +1 (234) 567-8901 ", password: "abcd" });
    expect(res.status).toBe(200);
  });

  it("allows driver login with username", async () => {
    const company = await createCompany({ name: "Company Username" });
    await createUser({ companyId: company.id, username: "driverOne", email: null, role: "DRIVER", passwordPlain: "abcd" });

    const res = await loginWithSlug({ companySlug: company.slug, identifier: "DriverOne", password: "abcd" });
    expect(res.status).toBe(200);
  });

  it("allows user to change own password and clears mustChangePassword", async () => {
    const company = await createCompany({ name: "Password Change Co" });
    const driver = await createUser({
      companyId: company.id,
      email: "driver.change@example.com",
      role: "DRIVER",
      passwordPlain: "temp1234",
      mustChangePassword: true,
    });

    const loginRes = await loginWithSlug({ companySlug: company.slug, identifier: driver.email, password: "temp1234" });
    expect(loginRes.status).toBe(200);
    const token = loginRes.body.token;

    const patchRes = await request(app)
      .patch("/api/v1/me/password")
      .set("Authorization", `Bearer ${token}`)
      .send({ password: "newpass123" });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.user.mustChangePassword).toBe(false);

    const meRes = await request(app).get("/api/v1/me").set("Authorization", `Bearer ${token}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.mustChangePassword).toBe(false);

    const oldLogin = await loginWithSlug({ companySlug: company.slug, identifier: driver.email, password: "temp1234", expectedStatus: 401 });
    expect(oldLogin.status).toBe(401);

    const newLogin = await loginWithSlug({ companySlug: company.slug, identifier: driver.email, password: "newpass123" });
    expect(newLogin.status).toBe(200);
  });

  it("rejects creating admin with short password", async () => {
    const company = await createCompany({ name: "Company Admin" });
    const owner = await createUser({ companyId: company.id, role: "PLATFORM_ADMIN", email: "owner-admin@example.com", passwordPlain: password });

    const loginRes = await loginWithSlug({ companySlug: company.slug, identifier: owner.email, password });
    expect(loginRes.status).toBe(200);
    const token = loginRes.body.token;

    const createAdminRes = await request(app)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "admin@example.com", password: "short", role: "ADMIN" });

    expect(createAdminRes.status).toBe(400);
  });

  it("rejects login without identifier", async () => {
    const company = await createCompany({ name: "No Identifier Co" });
    const res = await request(app).post(`/api/v1/c/${company.slug}/auth/login`).send({ password: "Password123!" });

    expect(res.status).toBe(400);
  });

  it("rate limits repeated failed logins by identifier", async () => {
    const company = await createCompany({ name: "Rate Limit Co" });
    await createUser({ companyId: company.id, email: "ratelimit2@example.com", passwordPlain: password });

    for (let i = 0; i < 5; i++) {
      const res = await request(app).post(`/api/v1/c/${company.slug}/auth/login`).send({ identifier: "ratelimit2@example.com", password: "wrong" });
      expect(res.status).toBe(401);
    }

    const limited = await request(app).post(`/api/v1/c/${company.slug}/auth/login`).send({ identifier: "ratelimit2@example.com", password: "wrong" });
    expect(limited.status).toBe(429);
    expect(limited.body.code).toBe("AUTH_RATE_LIMITED");
  });
});
