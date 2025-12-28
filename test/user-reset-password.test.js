const request = require("supertest");
const app = require("../src/app");
const { createCompany, createUser } = require("./helpers/testData");

const login = async ({ email, password }) => {
  const res = await request(app).post("/api/v1/auth/login").send({ email, password });
  expect(res.status).toBe(200);
  return res.body.token;
};

describe("User reset password", () => {
  const password = "Password123!";

  it("allows admin to reset password for user in same company", async () => {
    const company = await createCompany({ name: "Company A" });
    const admin = await createUser({ companyId: company.id, role: "ADMIN", passwordPlain: password });
    const driver = await createUser({ companyId: company.id, role: "DRIVER", passwordPlain: password });

    const token = await login({ email: admin.email, password });
    const newPassword = "NewPassword123!";

    const res = await request(app)
      .patch(`/api/v1/users/${driver.id}/password`)
      .set("Authorization", `Bearer ${token}`)
      .send({ password: newPassword });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.id).toBe(driver.id);

    const loginRes = await request(app).post("/api/v1/auth/login").send({ email: driver.email, password: newPassword });
    expect(loginRes.status).toBe(200);
  });

  it("returns 404 when targeting user in another company", async () => {
    const companyA = await createCompany({ name: "Company A" });
    const companyB = await createCompany({ name: "Company B" });
    const adminA = await createUser({ companyId: companyA.id, role: "ADMIN", passwordPlain: password });
    const driverB = await createUser({ companyId: companyB.id, role: "DRIVER", passwordPlain: password });

    const tokenA = await login({ email: adminA.email, password });
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

    const tokenDriver = await login({ email: driver.email, password });
    const res = await request(app)
      .patch(`/api/v1/users/${admin.id}/password`)
      .set("Authorization", `Bearer ${tokenDriver}`)
      .send({ password: "AnotherPass123!" });

    expect(res.status).toBe(403);
  });

  it("validates request body", async () => {
    const company = await createCompany({ name: "Company A" });
    const admin = await createUser({ companyId: company.id, role: "ADMIN", passwordPlain: password });
    const driver = await createUser({ companyId: company.id, role: "DRIVER", passwordPlain: password });
    const token = await login({ email: admin.email, password });

    const res = await request(app)
      .patch(`/api/v1/users/${driver.id}/password`)
      .set("Authorization", `Bearer ${token}`)
      .send({ password: "short" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when password is missing", async () => {
    const company = await createCompany({ name: "Company A" });
    const admin = await createUser({ companyId: company.id, role: "ADMIN", passwordPlain: password });
    const driver = await createUser({ companyId: company.id, role: "DRIVER", passwordPlain: password });
    const token = await login({ email: admin.email, password });

    const res = await request(app)
      .patch(`/api/v1/users/${driver.id}/password`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });
});
