const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/config/prismaClient");
const { createCompany, createUser, createVehicle } = require("./helpers/testData");

const password = "Password123!";

const login = async ({ companySlug, identifier }) => {
  const res = await request(app).post(`/api/v1/c/${companySlug}/auth/login`).send({ identifier, password });
  expect(res.status).toBe(200);
  return res.body.token;
};

describe("Me dropdown data", () => {
  it("returns only current company routes and vehicles for driver", async () => {
    const companyA = await createCompany({ name: "Dropdown A" });
    const companyB = await createCompany({ name: "Dropdown B" });
    const driverA = await createUser({ companyId: companyA.id, role: "DRIVER", email: "driver.dropa@example.com", passwordPlain: password });
    await createUser({ companyId: companyB.id, role: "DRIVER", email: "driver.dropb@example.com", passwordPlain: password });

    await prisma.routeOption.createMany({
      data: [
        { companyId: companyA.id, name: "Route A1" },
        { companyId: companyB.id, name: "Route B1" },
      ],
    });
    await createVehicle({ companyId: companyA.id, regNumber: "AAA111", name: "A1" });
    await createVehicle({ companyId: companyB.id, regNumber: "BBB222", name: "B1" });

    const tokenA = await login({ companySlug: companyA.slug, identifier: driverA.email });

    const routesRes = await request(app).get("/api/v1/me/routes").set("Authorization", `Bearer ${tokenA}`);
    expect(routesRes.status).toBe(200);
    const routeNames = (routesRes.body.routes || []).map((r) => r.name);
    expect(routeNames).toContain("Route A1");
    expect(routeNames).not.toContain("Route B1");

    const vehiclesRes = await request(app).get("/api/v1/me/vehicles").set("Authorization", `Bearer ${tokenA}`);
    expect(vehiclesRes.status).toBe(200);
    const regNumbers = (vehiclesRes.body.vehicles || []).map((v) => v.regNumber);
    expect(regNumbers).toContain("AAA111");
    expect(regNumbers).not.toContain("BBB222");
  });

  it("allows admin to fetch routes and vehicles for their company only", async () => {
    const companyA = await createCompany({ name: "Dropdown Admin A" });
    const companyB = await createCompany({ name: "Dropdown Admin B" });
    const adminA = await createUser({ companyId: companyA.id, role: "ADMIN", email: "admin.dropa@example.com", passwordPlain: password });

    await prisma.routeOption.createMany({
      data: [
        { companyId: companyA.id, name: "Route Admin A1" },
        { companyId: companyB.id, name: "Route Admin B1" },
      ],
    });
    await createVehicle({ companyId: companyA.id, regNumber: "ADA111", name: "AdminA1" });
    await createVehicle({ companyId: companyB.id, regNumber: "ADB222", name: "AdminB1" });

    const tokenA = await login({ companySlug: companyA.slug, identifier: adminA.email });

    const routesRes = await request(app).get("/api/v1/me/routes").set("Authorization", `Bearer ${tokenA}`);
    expect(routesRes.status).toBe(200);
    const routeNames = (routesRes.body.routes || []).map((r) => r.name);
    expect(routeNames).toContain("Route Admin A1");
    expect(routeNames).not.toContain("Route Admin B1");

    const vehiclesRes = await request(app).get("/api/v1/me/vehicles").set("Authorization", `Bearer ${tokenA}`);
    expect(vehiclesRes.status).toBe(200);
    const regNumbers = (vehiclesRes.body.vehicles || []).map((v) => v.regNumber);
    expect(regNumbers).toContain("ADA111");
    expect(regNumbers).not.toContain("ADB222");
  });
});
