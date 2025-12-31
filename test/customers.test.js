const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/config/prismaClient");
const { createCompany, createUser } = require("./helpers/testData");
const { loginWithSlug } = require("./helpers/auth");

describe("Customer options", () => {
  const password = "Password123!";

  const loginAdmin = async (company, admin) => {
    const res = await loginWithSlug({ companySlug: company.slug, identifier: admin.email, password });
    return res.body.token;
  };

  it("allows admin to create a customer", async () => {
    const company = await createCompany({ name: "Customers Co" });
    const admin = await createUser({ companyId: company.id, role: "ADMIN", email: "admin.customers@example.com", passwordPlain: password });
    const token = await loginAdmin(company, admin);

    const res = await request(app)
      .post("/api/v1/customers")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Customer A" });

    expect(res.status).toBe(201);
    expect(res.body.customer.name).toBe("Customer A");
  });

  it("forbids driver from creating a customer", async () => {
    const company = await createCompany({ name: "Driver Forbid Customer" });
    const driver = await createUser({ companyId: company.id, role: "DRIVER", email: "driver.customer@example.com", passwordPlain: password });
    const token = (await loginWithSlug({ companySlug: company.slug, identifier: driver.email, password })).body.token;

    const res = await request(app)
      .post("/api/v1/customers")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Customer Driver" });

    expect(res.status).toBe(403);
  });

  it("rejects duplicate customer name in same company (case-insensitive)", async () => {
    const company = await createCompany({ name: "Dup Customer Co" });
    const admin = await createUser({ companyId: company.id, role: "ADMIN", email: "admin.dupcustomer@example.com", passwordPlain: password });
    const token = await loginAdmin(company, admin);

    const first = await request(app)
      .post("/api/v1/customers")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Customer X" });
    expect(first.status).toBe(201);

    const dup = await request(app)
      .post("/api/v1/customers")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "customer x" });

    expect(dup.status).toBe(409);
  });

  it("lists only active customers for current company via /me/customers", async () => {
    const companyA = await createCompany({ name: "Customer Me A" });
    const companyB = await createCompany({ name: "Customer Me B" });
    const driverA = await createUser({ companyId: companyA.id, role: "DRIVER", email: "driver.customers@example.com", passwordPlain: password });
    const tokenA = (await loginWithSlug({ companySlug: companyA.slug, identifier: driverA.email, password })).body.token;

    await prisma.customerOption.create({ data: { companyId: companyA.id, name: "Active A", active: true } });
    await prisma.customerOption.create({ data: { companyId: companyA.id, name: "Inactive A", active: false } });
    await prisma.customerOption.create({ data: { companyId: companyB.id, name: "Active B", active: true } });

    const res = await request(app)
      .get("/api/v1/me/customers")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.customers).toHaveLength(1);
    expect(res.body.customers[0].name).toBe("Active A");
  });
});
