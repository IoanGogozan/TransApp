const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/config/prismaClient");
const { createCompany, createUser, createVehicle } = require("./helpers/testData");
const { loginWithSlug } = require("./helpers/auth");

describe("Vehicle admin updates", () => {
  const password = "Password123!";

  it("prevents cross-tenant vehicle updates", async () => {
    const companyA = await createCompany({ name: "Vehicle Update Tenant A" });
    const companyB = await createCompany({ name: "Vehicle Update Tenant B" });

    const adminB = await createUser({
      companyId: companyB.id,
      role: "ADMIN",
      email: "admin.b.vehicle@example.com",
      passwordPlain: password,
    });

    const vehicleA = await createVehicle({
      companyId: companyA.id,
      regNumber: "A-UPDATE-1",
      name: "Vehicle A",
      type: "Truck",
    });

    const beforeUpdate = await prisma.vehicle.findFirst({ where: { id: vehicleA.id } });
    expect(beforeUpdate).toBeTruthy();

    const tokenB = (await loginWithSlug({
      companySlug: companyB.slug,
      identifier: adminB.email,
      password,
    })).body.token;

    const res = await request(app)
      .patch(`/api/v1/vehicles/${vehicleA.id}`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ name: "Hacked Name" });

    expect(res.status).toBe(404);

    const persisted = await prisma.vehicle.findFirst({ where: { id: vehicleA.id } });
    expect(persisted).toBeTruthy();
    expect(persisted.name).toBe(beforeUpdate.name);
    expect(persisted.regNumber).toBe(beforeUpdate.regNumber);
  });
});
