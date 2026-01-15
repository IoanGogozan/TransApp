const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/config/prismaClient");
const { createCompany, createUser, createVehicle } = require("./helpers/testData");

const password = "Password123!";
const today = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
const daysAgo = (days) => {
  const now = new Date();
  now.setDate(now.getDate() - days);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const login = async ({ companySlug, identifier }) => {
  const res = await request(app).post(`/api/v1/c/${companySlug}/auth/login`).send({ identifier, password });
  expect(res.status).toBe(200);
  return res.body.token;
};

const createRoute = async ({ companyId, name }) =>
  prisma.routeOption.create({ data: { companyId, name } });
const createCustomer = async ({ companyId, name, active = true }) =>
  prisma.customerOption.create({ data: { companyId, name, active } });

describe("Work entries", () => {
  it("allows driver to create an entry and list entries", async () => {
    const company = await createCompany({ name: "Runs Co" });
    const route = await createRoute({ companyId: company.id, name: "Route 1" });
    const customer = await createCustomer({ companyId: company.id, name: "Customer 1" });
    const vehicle = await createVehicle({ companyId: company.id, regNumber: "RUN111", name: "Run Van" });
    const driver = await createUser({ companyId: company.id, role: "DRIVER", email: "driver.runs@example.com", passwordPlain: password });
    const token = await login({ companySlug: company.slug, identifier: driver.email });

    const checkInRes = await request(app)
      .post("/api/v1/me/vehicle-checkins")
      .set("Authorization", `Bearer ${token}`)
      .send({ vehicleId: vehicle.id });
    expect(checkInRes.status).toBe(201);

    const createRes = await request(app)
      .post("/api/v1/me/entries")
      .set("Authorization", `Bearer ${token}`)
      .send({
        date: today(),
        activityType: "DRIVING",
        durationMin: 120,
        customerOptionId: customer.id,
        routeOptionId: route.id,
        vehicleId: vehicle.id,
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.activityType).toBe("DRIVING");
    expect(createRes.body.durationMin).toBe(120);

    const listActive = await request(app)
      .get(`/api/v1/me/entries?date=${today()}`)
      .set("Authorization", `Bearer ${token}`);
    expect(listActive.status).toBe(200);
    expect(listActive.body.items).toHaveLength(1);
    expect(listActive.body.items[0].activityType).toBe("DRIVING");
  });

  it("allows admin to list entries for their company", async () => {
    const company = await createCompany({ name: "Runs Admin Co" });
    const admin = await createUser({ companyId: company.id, role: "ADMIN", email: "admin.runs@example.com", passwordPlain: password });
    const token = await login({ companySlug: company.slug, identifier: admin.email });

    const res = await request(app)
      .get(`/api/v1/me/entries?date=${today()}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toBeDefined();
  });

  it("requires customer for driving activity", async () => {
    const company = await createCompany({ name: "Runs Co 2" });
    const route = await createRoute({ companyId: company.id, name: "Route 2" });
    const driver = await createUser({ companyId: company.id, role: "DRIVER", email: "driver.run2@example.com", passwordPlain: password });
    const token = await login({ companySlug: company.slug, identifier: driver.email });

    const res = await request(app)
      .post("/api/v1/me/entries")
      .set("Authorization", `Bearer ${token}`)
      .send({ date: today(), activityType: "DRIVING", durationMin: 30, routeOptionId: route.id });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe("VALIDATION_ERROR");
  });

  it("rejects driving entry with vehicle without recent check-in", async () => {
    const company = await createCompany({ name: "Runs Checkin Required" });
    const route = await createRoute({ companyId: company.id, name: "Route Checkin" });
    const customer = await createCustomer({ companyId: company.id, name: "Customer Checkin" });
    const vehicle = await createVehicle({ companyId: company.id, regNumber: "CHK999", name: "Check Van" });
    const driver = await createUser({ companyId: company.id, role: "DRIVER", email: "driver.checkin@example.com", passwordPlain: password });
    const token = await login({ companySlug: company.slug, identifier: driver.email });

    const res = await request(app)
      .post("/api/v1/me/entries")
      .set("Authorization", `Bearer ${token}`)
      .send({
        date: today(),
        activityType: "DRIVING",
        durationMin: 45,
        customerOptionId: customer.id,
        routeOptionId: route.id,
        vehicleId: vehicle.id,
      });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("VEHICLE_CHECKIN_REQUIRED");
  });

  it("allows driving entry with vehicle for past date without check-in", async () => {
    const company = await createCompany({ name: "Runs Past Date" });
    const route = await createRoute({ companyId: company.id, name: "Route Past" });
    const customer = await createCustomer({ companyId: company.id, name: "Customer Past" });
    const vehicle = await createVehicle({ companyId: company.id, regNumber: "PAST111", name: "Past Van" });
    const driver = await createUser({ companyId: company.id, role: "DRIVER", email: "driver.past@example.com", passwordPlain: password });
    const token = await login({ companySlug: company.slug, identifier: driver.email });

    const res = await request(app)
      .post("/api/v1/me/entries")
      .set("Authorization", `Bearer ${token}`)
      .send({
        date: daysAgo(2),
        activityType: "DRIVING",
        durationMin: 60,
        customerOptionId: customer.id,
        routeOptionId: route.id,
        vehicleId: vehicle.id,
      });

    expect(res.status).toBe(201);
    expect(res.body.activityType).toBe("DRIVING");
  });

  it("enforces tenant scoping for route and vehicle", async () => {
    const companyA = await createCompany({ name: "Runs A" });
    const companyB = await createCompany({ name: "Runs B" });
    const routeA = await createRoute({ companyId: companyA.id, name: "Route A" });
    const routeB = await createRoute({ companyId: companyB.id, name: "Route B" });
    const customerA = await createCustomer({ companyId: companyA.id, name: "Customer A" });
    const vehicleA = await createVehicle({ companyId: companyA.id, regNumber: "AAA111", name: "A Van" });
    const vehicleB = await createVehicle({ companyId: companyB.id, regNumber: "BBB222", name: "B Van" });
    const driverA = await createUser({ companyId: companyA.id, role: "DRIVER", email: "driver.scope@example.com", passwordPlain: password });
    const tokenA = await login({ companySlug: companyA.slug, identifier: driverA.email });

    const wrongRoute = await request(app)
      .post("/api/v1/me/entries")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        date: today(),
        activityType: "DRIVING",
        durationMin: 30,
        customerOptionId: customerA.id,
        routeOptionId: routeB.id,
      });
    expect(wrongRoute.status).toBe(400);
    expect(wrongRoute.body.error?.code).toBe("INVALID_ROUTE_OPTION");

    const wrongVehicle = await request(app)
      .post("/api/v1/me/entries")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        date: today(),
        activityType: "DRIVING",
        durationMin: 30,
        customerOptionId: customerA.id,
        routeOptionId: routeA.id,
        vehicleId: vehicleB.id,
      });
    expect(wrongVehicle.status).toBe(400);
    expect(wrongVehicle.body.error?.code).toBe("INVALID_VEHICLE");
  });

  it("rejects entry with invalid customer option", async () => {
    const companyA = await createCompany({ name: "Runs Customer A" });
    const companyB = await createCompany({ name: "Runs Customer B" });
    const routeA = await createRoute({ companyId: companyA.id, name: "Route C" });
    const customerB = await createCustomer({ companyId: companyB.id, name: "Customer B" });
    const driverA = await createUser({ companyId: companyA.id, role: "DRIVER", email: "driver.customer@example.com", passwordPlain: password });
    const tokenA = await login({ companySlug: companyA.slug, identifier: driverA.email });

    const res = await request(app)
      .post("/api/v1/me/entries")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        date: today(),
        activityType: "DRIVING",
        durationMin: 30,
        customerOptionId: customerB.id,
        routeOptionId: routeA.id,
      });

    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe("INVALID_CUSTOMER_OPTION");
  });
});
