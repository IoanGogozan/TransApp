const request = require("supertest");
const app = require("../src/app");
const { createCompany, createUser } = require("./helpers/testData");
const { loginWithSlug } = require("./helpers/auth");

describe("User phone update", () => {
  const password = "Password123!";

  const login = async (companySlug, identifier) => {
    const res = await loginWithSlug({ companySlug, identifier, password });
    return res.body.token;
  };

  it("allows admin to update driver phone in same company", async () => {
    const company = await createCompany({ name: "Update Driver Phone Co" });
    const admin = await createUser({ companyId: company.id, role: "ADMIN", email: "admin.update@example.com", passwordPlain: password });
    const driver = await createUser({ companyId: company.id, role: "DRIVER", phone: "+1 200 000 0000", email: null, passwordPlain: password });

    const token = await login(company.slug, admin.email);
    const res = await request(app)
      .patch(`/api/v1/users/${driver.id}/phone`)
      .set("Authorization", `Bearer ${token}`)
      .send({ phone: "+1 222 333 4444" });

    expect(res.status).toBe(200);
    expect(res.body.user.phone).toBe("+12223334444");
  });

  it("returns 404 when updating driver in another company", async () => {
    const companyA = await createCompany({ name: "Company A" });
    const companyB = await createCompany({ name: "Company B" });
    const adminA = await createUser({ companyId: companyA.id, role: "ADMIN", email: "adminA@example.com", passwordPlain: password });
    const driverB = await createUser({ companyId: companyB.id, role: "DRIVER", phone: "+1 300 000 0000", email: null, passwordPlain: password });

    const token = await login(companyA.slug, adminA.email);
    const res = await request(app)
      .patch(`/api/v1/users/${driverB.id}/phone`)
      .set("Authorization", `Bearer ${token}`)
      .send({ phone: "+1 300 111 2222" });

    expect(res.status).toBe(404);
  });

  it("rejects self-update", async () => {
    const company = await createCompany({ name: "Self Update Phone Co" });
    const admin = await createUser({ companyId: company.id, role: "ADMIN", email: "admin.self@example.com", passwordPlain: password });

    const token = await login(company.slug, admin.email);
    const res = await request(app)
      .patch(`/api/v1/users/${admin.id}/phone`)
      .set("Authorization", `Bearer ${token}`)
      .send({ phone: "+1 400 000 0000" });

    expect(res.status).toBe(403);
  });

  it("rejects updating phone for admin user", async () => {
    const company = await createCompany({ name: "Reject Admin Phone Co" });
    const owner = await createUser({ companyId: company.id, role: "PLATFORM_ADMIN", email: "owner.reject@example.com", passwordPlain: password });
    const admin = await createUser({ companyId: company.id, role: "ADMIN", email: "admin.reject@example.com", passwordPlain: password });

    const token = await login(company.slug, owner.email);
    const res = await request(app)
      .patch(`/api/v1/users/${admin.id}/phone`)
      .set("Authorization", `Bearer ${token}`)
      .send({ phone: "+1 500 000 0000" });

    expect(res.status).toBe(400);
  });

  it("rejects duplicate phone in same company", async () => {
    const company = await createCompany({ name: "Duplicate Phone Co" });
    const admin = await createUser({ companyId: company.id, role: "ADMIN", email: "admin.dup@example.com", passwordPlain: password });
    const driver1 = await createUser({ companyId: company.id, role: "DRIVER", phone: "+1 600 000 0000", email: null, passwordPlain: password });
    const driver2 = await createUser({ companyId: company.id, role: "DRIVER", phone: "+1 700 000 0000", email: null, passwordPlain: password });

    const token = await login(company.slug, admin.email);
    const res = await request(app)
      .patch(`/api/v1/users/${driver2.id}/phone`)
      .set("Authorization", `Bearer ${token}`)
      .send({ phone: driver1.phone });

    expect(res.status).toBe(409);
  });
});
