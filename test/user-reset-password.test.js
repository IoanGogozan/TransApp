const request = require("supertest");
const app = require("../src/app");
const { createCompany, createUser } = require("./helpers/testData");

const login = async ({ companySlug, email, password }) => {
  const res = await request(app).post(`/api/v1/c/${companySlug}/auth/login`).send({ identifier: email, password });
  expect(res.status).toBe(200);
  return res.body.token;
};

describe("User reset password", () => {
  const password = "Password123!";

  it("allows admin to reset password for user in same company", async () => {
    const company = await createCompany({ name: "Company A" });
    const admin = await createUser({ companyId: company.id, role: "ADMIN", passwordPlain: password });
    const driver = await createUser({ companyId: company.id, role: "DRIVER", passwordPlain: password });

    const token = await login({ companySlug: company.slug, email: admin.email, password });
    const driverToken = await login({ companySlug: company.slug, email: driver.email, password });
    const newPassword = "NewPassword123!";

    const res = await request(app)
      .patch(`/api/v1/users/${driver.id}/password`)
      .set("Authorization", `Bearer ${token}`)
      .send({ password: newPassword });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.id).toBe(driver.id);

    const oldTokenRes = await request(app).get("/api/v1/me").set("Authorization", `Bearer ${driverToken}`);
    expect(oldTokenRes.status).toBe(401);
    expect(oldTokenRes.body.error.code).toBe("AUTH_TOKEN_REVOKED");

    const loginRes = await request(app)
      .post(`/api/v1/c/${company.slug}/auth/login`)
      .send({ identifier: driver.email, password: newPassword });
    expect(loginRes.status).toBe(200);
  });

  it("returns 404 when targeting user in another company", async () => {
    const companyA = await createCompany({ name: "Company A" });
    const companyB = await createCompany({ name: "Company B" });
    const adminA = await createUser({ companyId: companyA.id, role: "ADMIN", passwordPlain: password });
    const driverB = await createUser({ companyId: companyB.id, role: "DRIVER", passwordPlain: password });

    const tokenA = await login({ companySlug: companyA.slug, email: adminA.email, password });
    const res = await request(app)
      .patch(`/api/v1/users/${driverB.id}/password`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ password: "AnotherPass123!" });

    expect(res.status).toBe(404);
  });

  it("rejects driver attempting to reset another user's password", async () => {
    const company = await createCompany({ name: "Company A" });
    const admin = await createUser({ companyId: company.id, role: "ADMIN", passwordPlain: password });
    const driver = await createUser({ companyId: company.id, role: "DRIVER", passwordPlain: password });

    const tokenDriver = await login({ companySlug: company.slug, email: driver.email, password });
    const res = await request(app)
      .patch(`/api/v1/users/${admin.id}/password`)
      .set("Authorization", `Bearer ${tokenDriver}`)
      .send({ password: "AnotherPass123!" });

    expect(res.status).toBe(403);
  });

  it("rejects admin attempting to reset own password", async () => {
    const company = await createCompany({ name: "Company A" });
    const admin = await createUser({ companyId: company.id, role: "ADMIN", passwordPlain: password });

    const token = await login({ companySlug: company.slug, email: admin.email, password });
    const res = await request(app)
      .patch(`/api/v1/users/${admin.id}/password`)
      .set("Authorization", `Bearer ${token}`)
      .send({ password: "NewPassword123!" });

    expect(res.status).toBe(403);

    const loginRes = await request(app)
      .post(`/api/v1/c/${company.slug}/auth/login`)
      .send({ identifier: admin.email, password });
    expect(loginRes.status).toBe(200);
  });

  it("rejects admin attempting to reset owner password in same company", async () => {
    const company = await createCompany({ name: "Company A" });
    const admin = await createUser({ companyId: company.id, role: "ADMIN", passwordPlain: password });
    const owner = await createUser({ companyId: company.id, role: "PLATFORM_ADMIN", passwordPlain: password });

    const token = await login({ companySlug: company.slug, email: admin.email, password });
    const res = await request(app)
      .patch(`/api/v1/users/${owner.id}/password`)
      .set("Authorization", `Bearer ${token}`)
      .send({ password: "AnotherPass123!" });

    expect(res.status).toBe(403);

    const loginRes = await request(app)
      .post(`/api/v1/c/${company.slug}/auth/login`)
      .send({ identifier: owner.email, password });
    expect(loginRes.status).toBe(200);
  });

  it("validates request body", async () => {
    const company = await createCompany({ name: "Company A" });
    const admin = await createUser({ companyId: company.id, role: "ADMIN", passwordPlain: password });
    const driver = await createUser({ companyId: company.id, role: "DRIVER", passwordPlain: password });
    const token = await login({ companySlug: company.slug, email: admin.email, password });

    const res = await request(app)
      .patch(`/api/v1/users/${driver.id}/password`)
      .set("Authorization", `Bearer ${token}`)
      .send({ password: "short" });

    expect(res.status).toBe(400);
  });

  it("rejects driver password shorter than 8 characters", async () => {
    const company = await createCompany({ name: "Company A" });
    const admin = await createUser({ companyId: company.id, role: "ADMIN", passwordPlain: password });
    const driver = await createUser({ companyId: company.id, role: "DRIVER", passwordPlain: password });

    const token = await login({ companySlug: company.slug, email: admin.email, password });
    const newPassword = "123456";

    const res = await request(app)
      .patch(`/api/v1/users/${driver.id}/password`)
      .set("Authorization", `Bearer ${token}`)
      .send({ password: newPassword });

    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe("VALIDATION_ERROR");
    expect(res.body.error?.message).toContain("at least 8");
  });

  it("rejects short password for admin users", async () => {
    const company = await createCompany({ name: "Company A" });
    const admin = await createUser({ companyId: company.id, role: "ADMIN", passwordPlain: password });
    const targetAdmin = await createUser({ companyId: company.id, role: "ADMIN", passwordPlain: password });

    const token = await login({ companySlug: company.slug, email: admin.email, password });
    const res = await request(app)
      .patch(`/api/v1/users/${targetAdmin.id}/password`)
      .set("Authorization", `Bearer ${token}`)
      .send({ password: "1234567" });

    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe("VALIDATION_ERROR");
    expect(res.body.error?.message).toContain("at least 8");
  });

  it("returns 400 when password is missing", async () => {
    const company = await createCompany({ name: "Company A" });
    const admin = await createUser({ companyId: company.id, role: "ADMIN", passwordPlain: password });
    const driver = await createUser({ companyId: company.id, role: "DRIVER", passwordPlain: password });
    const token = await login({ companySlug: company.slug, email: admin.email, password });

    const res = await request(app)
      .patch(`/api/v1/users/${driver.id}/password`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });
});
