const request = require("supertest");
const app = require("../src/app");
const { createCompany, createUser } = require("./helpers/testData");
const { loginWithSlug } = require("./helpers/auth");

describe("Route options", () => {
  const password = "Password123!";

  const loginAdmin = async (company, admin) => {
    const res = await loginWithSlug({ companySlug: company.slug, identifier: admin.email, password });
    return res.body.token;
  };

  it("allows admin to create a route", async () => {
    const company = await createCompany({ name: "Routes Co" });
    const admin = await createUser({ companyId: company.id, role: "ADMIN", email: "admin.routes@example.com", passwordPlain: password });
    const token = await loginAdmin(company, admin);

    const res = await request(app)
      .post("/api/v1/routes")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Route A" });

    expect(res.status).toBe(201);
    expect(res.body.route.name).toBe("Route A");
  });

  it("forbids driver from creating a route", async () => {
    const company = await createCompany({ name: "Driver Forbid Route" });
    const driver = await createUser({ companyId: company.id, role: "DRIVER", email: "driver.route@example.com", passwordPlain: password });
    const token = (await loginWithSlug({ companySlug: company.slug, identifier: driver.email, password })).body.token;

    const res = await request(app)
      .post("/api/v1/routes")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Route Driver" });

    expect(res.status).toBe(403);
  });

  it("rejects duplicate route name in same company", async () => {
    const company = await createCompany({ name: "Dup Route Co" });
    const admin = await createUser({ companyId: company.id, role: "ADMIN", email: "admin.duproute@example.com", passwordPlain: password });
    const token = await loginAdmin(company, admin);

    const first = await request(app)
      .post("/api/v1/routes")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Route X" });
    expect(first.status).toBe(201);

    const dup = await request(app)
      .post("/api/v1/routes")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Route X" });

    expect(dup.status).toBe(409);
  });

  it("allows same route name in different companies", async () => {
    const companyA = await createCompany({ name: "Route A Company" });
    const companyB = await createCompany({ name: "Route B Company" });
    const adminA = await createUser({ companyId: companyA.id, role: "ADMIN", email: "admin.routea@example.com", passwordPlain: password });
    const adminB = await createUser({ companyId: companyB.id, role: "ADMIN", email: "admin.routeb@example.com", passwordPlain: password });

    const tokenA = await loginAdmin(companyA, adminA);
    const tokenB = await loginAdmin(companyB, adminB);

    const resA = await request(app)
      .post("/api/v1/routes")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "Shared Route" });
    expect(resA.status).toBe(201);

    const resB = await request(app)
      .post("/api/v1/routes")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ name: "Shared Route" });
    expect(resB.status).toBe(201);
  });
});
