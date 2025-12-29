const request = require("supertest");
const app = require("../src/app");
const { createCompany, createUser, createVehicle } = require("./helpers/testData");

const login = async ({ companySlug, email, password }) => {
  const res = await request(app).post(`/api/v1/c/${companySlug}/auth/login`).send({ identifier: email, password });
  expect(res.status).toBe(200);
  return res.body.token;
};

describe("Tenant isolation", () => {
  it("restricts vehicle listing and access to company scope", async () => {
    const companyA = await createCompany({ name: "Tenant A" });
    const companyB = await createCompany({ name: "Tenant B" });

    const password = "Password123!";
    const adminA = await createUser({
      companyId: companyA.id,
      email: `admin.a+${Date.now()}@example.com`,
      role: "ADMIN",
      passwordPlain: password,
    });
    const adminB = await createUser({
      companyId: companyB.id,
      email: `admin.b+${Date.now()}@example.com`,
      role: "ADMIN",
      passwordPlain: password,
    });

    const vehicleA = await createVehicle({
      companyId: companyA.id,
      regNumber: `A${Math.floor(Math.random() * 100000)}`,
      name: "Vehicle A",
      type: "Truck",
    });
    const vehicleB = await createVehicle({
      companyId: companyB.id,
      regNumber: `B${Math.floor(Math.random() * 100000)}`,
      name: "Vehicle B",
      type: "Van",
    });

    const tokenA = await login({ companySlug: companyA.slug, email: adminA.email, password });

    const listRes = await request(app).get("/api/v1/vehicles").set("Authorization", `Bearer ${tokenA}`);
    expect(listRes.status).toBe(200);
    const vehicles = listRes.body.vehicles || [];
    const ids = vehicles.map((v) => v.id);

    expect(ids).toContain(vehicleA.id);
    expect(ids).not.toContain(vehicleB.id);

    const otherRes = await request(app)
      .get(`/api/v1/vehicles/${vehicleB.id}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect([403, 404]).toContain(otherRes.status);
  });
});
