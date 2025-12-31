const request = require("supertest");
const app = require("../src/app");
const { createCompany, createUser } = require("./helpers/testData");

const password = "Password123!";

const login = async ({ companySlug, identifier }) => {
  const res = await request(app).post(`/api/v1/c/${companySlug}/auth/login`).send({ identifier, password });
  expect(res.status).toBe(200);
  return res.body.token;
};

describe("Vehicle permissions", () => {
  it("forbids driver from creating vehicle and allows admin", async () => {
    const company = await createCompany({ name: "Vehicle Permission Co" });
    const admin = await createUser({ companyId: company.id, role: "ADMIN", email: "admin.vehicle@example.com", passwordPlain: password });
    const driver = await createUser({ companyId: company.id, role: "DRIVER", email: "driver.vehicle@example.com", passwordPlain: password });

    const adminToken = await login({ companySlug: company.slug, identifier: admin.email });
    const driverToken = await login({ companySlug: company.slug, identifier: driver.email });

    const driverRes = await request(app)
      .post("/api/v1/vehicles")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ regNumber: "DRIV123", name: "Driver Car", type: "Van" });
    expect(driverRes.status).toBe(403);

    const adminRes = await request(app)
      .post("/api/v1/vehicles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ regNumber: "ADM123", name: "Admin Truck", type: "Truck" });
    expect(adminRes.status).toBe(201);
    expect(adminRes.body.vehicle.regNumber).toBe("ADM123");
  });
});

