const request = require("supertest");
const app = require("../src/app");
const { createCompany, createUser } = require("./helpers/testData");

const login = async ({ companySlug, email, password }) => {
  const res = await request(app).post(`/api/v1/c/${companySlug}/auth/login`).send({ identifier: email, password });
  expect(res.status).toBe(200);
  return res.body.token;
};

describe("User active toggle", () => {
  const password = "Password123!";

  it("allows admin to deactivate a user in the same company", async () => {
    const company = await createCompany({ name: "Company A" });
    const admin = await createUser({ companyId: company.id, role: "ADMIN", passwordPlain: password });
    const driver = await createUser({ companyId: company.id, role: "DRIVER", passwordPlain: password });

    const token = await login({ companySlug: company.slug, email: admin.email, password });
    const res = await request(app)
      .patch(`/api/v1/users/${driver.id}/active`)
      .set("Authorization", `Bearer ${token}`)
      .send({ active: false });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.id).toBe(driver.id);
    expect(res.body.user.isActive).toBe(false);
  });

  it("returns 404 when admin targets user in another company", async () => {
    const companyA = await createCompany({ name: "Company A" });
    const companyB = await createCompany({ name: "Company B" });
    const adminA = await createUser({ companyId: companyA.id, role: "ADMIN", passwordPlain: password });
    const driverB = await createUser({ companyId: companyB.id, role: "DRIVER", passwordPlain: password });

    const tokenA = await login({ companySlug: companyA.slug, email: adminA.email, password });
    const res = await request(app)
      .patch(`/api/v1/users/${driverB.id}/active`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ active: false });

    expect(res.status).toBe(404);
  });

  it("rejects driver attempting to change another user's active state", async () => {
    const company = await createCompany({ name: "Company A" });
    const admin = await createUser({ companyId: company.id, role: "ADMIN", passwordPlain: password });
    const driver = await createUser({ companyId: company.id, role: "DRIVER", passwordPlain: password });

    const tokenDriver = await login({ companySlug: company.slug, email: driver.email, password });
    const res = await request(app)
      .patch(`/api/v1/users/${admin.id}/active`)
      .set("Authorization", `Bearer ${tokenDriver}`)
      .send({ active: false });

    expect(res.status).toBe(403);
  });

  it("rejects admin attempting to change own active state", async () => {
    const company = await createCompany({ name: "Company A" });
    const admin = await createUser({ companyId: company.id, role: "ADMIN", passwordPlain: password });

    const token = await login({ companySlug: company.slug, email: admin.email, password });
    const res = await request(app)
      .patch(`/api/v1/users/${admin.id}/active`)
      .set("Authorization", `Bearer ${token}`)
      .send({ active: false });

    expect(res.status).toBe(403);
  });

  it("rejects admin attempting to deactivate owner in same company", async () => {
    const company = await createCompany({ name: "Company A" });
    const admin = await createUser({ companyId: company.id, role: "ADMIN", passwordPlain: password });
    const owner = await createUser({ companyId: company.id, role: "PLATFORM_ADMIN", passwordPlain: password });

    const token = await login({ companySlug: company.slug, email: admin.email, password });
    const res = await request(app)
      .patch(`/api/v1/users/${owner.id}/active`)
      .set("Authorization", `Bearer ${token}`)
      .send({ active: false });

    expect(res.status).toBe(403);
  });

  it("validates request body", async () => {
    const company = await createCompany({ name: "Company A" });
    const admin = await createUser({ companyId: company.id, role: "ADMIN", passwordPlain: password });
    const driver = await createUser({ companyId: company.id, role: "DRIVER", passwordPlain: password });
    const token = await login({ companySlug: company.slug, email: admin.email, password });

    const res = await request(app)
      .patch(`/api/v1/users/${driver.id}/active`)
      .set("Authorization", `Bearer ${token}`)
      .send({ active: "nope" });

    expect(res.status).toBe(400);
  });
});
