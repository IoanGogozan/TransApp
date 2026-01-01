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

describe("Vehicle check-ins", () => {
  it("allows driver to check in a vehicle in same company", async () => {
    const company = await createCompany({ name: "Vehicle Check Co" });
    const vehicle = await createVehicle({ companyId: company.id, regNumber: "CHK123" });
    const driver = await createUser({ companyId: company.id, role: "DRIVER", email: "checkin@example.com", passwordPlain: password });
    const token = await login({ companySlug: company.slug, identifier: driver.email });

    const res = await request(app)
      .post("/api/v1/me/vehicle-checkins")
      .set("Authorization", `Bearer ${token}`)
      .send({ vehicleId: vehicle.id, allOk: true, note: "Pre-trip ok" });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.vehicleId).toBe(vehicle.id);
    expect(res.body.checkedAt).toBeTruthy();
  });

  it("forbids checking in vehicle from another company", async () => {
    const companyA = await createCompany({ name: "Checkin A" });
    const companyB = await createCompany({ name: "Checkin B" });
    const vehicleB = await createVehicle({ companyId: companyB.id, regNumber: "OTHER1" });
    const driverA = await createUser({ companyId: companyA.id, role: "DRIVER", email: "checkin-scope@example.com", passwordPlain: password });
    const tokenA = await login({ companySlug: companyA.slug, identifier: driverA.email });

    const res = await request(app)
      .post("/api/v1/me/vehicle-checkins")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ vehicleId: vehicleB.id, allOk: true });

    expect(res.status).toBe(404);
  });

  it("returns 404 when vehicle is inactive", async () => {
    const company = await createCompany({ name: "Inactive Check" });
    const vehicle = await createVehicle({ companyId: company.id, regNumber: "INACTIVE1" });
    await prisma.vehicle.update({ where: { id: vehicle.id }, data: { active: false } });
    const driver = await createUser({ companyId: company.id, role: "DRIVER", email: "inactive-check@example.com", passwordPlain: password });
    const token = await login({ companySlug: company.slug, identifier: driver.email });

    const res = await request(app)
      .post("/api/v1/me/vehicle-checkins")
      .set("Authorization", `Bearer ${token}`)
      .send({ vehicleId: vehicle.id, allOk: true });

    expect(res.status).toBe(404);
  });

  it("allows admin to check in", async () => {
    const company = await createCompany({ name: "Admin Forbid Check" });
    const vehicle = await createVehicle({ companyId: company.id, regNumber: "ADMINCHK" });
    const admin = await createUser({ companyId: company.id, role: "ADMIN", email: "admin-check@example.com", passwordPlain: password });
    const token = await login({ companySlug: company.slug, identifier: admin.email });

    const res = await request(app)
      .post("/api/v1/me/vehicle-checkins")
      .set("Authorization", `Bearer ${token}`)
      .send({ vehicleId: vehicle.id, allOk: true });

    expect(res.status).toBe(201);
  });

  it("lists recent check-ins scoped to user, company, and hours window", async () => {
    const companyA = await createCompany({ name: "Recent Checkins A" });
    const companyB = await createCompany({ name: "Recent Checkins B" });
    const vehicleA1 = await createVehicle({ companyId: companyA.id, regNumber: "REC111" });
    const vehicleA2 = await createVehicle({ companyId: companyA.id, regNumber: "REC222" });
    const vehicleB1 = await createVehicle({ companyId: companyB.id, regNumber: "REC333" });
    const driverA = await createUser({ companyId: companyA.id, role: "DRIVER", email: "recent-a@example.com", passwordPlain: password });
    const driverB = await createUser({ companyId: companyB.id, role: "DRIVER", email: "recent-b@example.com", passwordPlain: password });
    const tokenA = await login({ companySlug: companyA.slug, identifier: driverA.email });
    const tokenB = await login({ companySlug: companyB.slug, identifier: driverB.email });

    const recentA1 = await prisma.vehicleCheckIn.create({
      data: { companyId: companyA.id, userId: driverA.id, vehicleId: vehicleA1.id, checkedAt: new Date() },
      select: { id: true },
    });
    await prisma.vehicleCheckIn.create({
      data: { companyId: companyA.id, userId: driverA.id, vehicleId: vehicleA2.id, checkedAt: new Date() },
    });
    await prisma.vehicleCheckIn.create({
      data: { companyId: companyB.id, userId: driverB.id, vehicleId: vehicleB1.id, checkedAt: new Date() },
    });

    const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000);
    await prisma.vehicleCheckIn.update({ where: { id: recentA1.id }, data: { createdAt: oldDate } });

    const resA = await request(app)
      .get("/api/v1/me/vehicle-checkins/recent?hours=24")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(resA.status).toBe(200);
    expect(resA.body.checkIns).toHaveLength(1);
    expect(resA.body.checkIns[0].vehicleId).toBe(vehicleA2.id);

    const resB = await request(app)
      .get("/api/v1/me/vehicle-checkins/recent?hours=24")
      .set("Authorization", `Bearer ${tokenB}`);

    expect(resB.status).toBe(200);
    expect(resB.body.checkIns).toHaveLength(1);
    expect(resB.body.checkIns[0].vehicleId).toBe(vehicleB1.id);
  });
});
