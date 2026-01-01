const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/config/prismaClient");
const { createCompany, createUser } = require("./helpers/testData");
const { loginWithSlug } = require("./helpers/auth");

describe("Admin work-run timesheets listing", () => {
  const password = "Password123!";

  it("allows admin to list aggregated work-run timesheets in their company", async () => {
    const company = await createCompany({ name: "WorkRun Timesheet Co" });
    const admin = await createUser({ companyId: company.id, role: "ADMIN", email: "admin.wr@example.com", passwordPlain: password });
    const driver = await createUser({ companyId: company.id, role: "DRIVER", email: "driver.wr@example.com", passwordPlain: password });
    const route = await prisma.routeOption.create({ data: { companyId: company.id, name: "WR Route" } });

    await prisma.workRun.create({
      data: {
        companyId: company.id,
        userId: driver.id,
        activityType: "DRIVING",
        routeOptionId: route.id,
        vehicleId: null,
        startedAt: new Date("2024-05-01T08:00:00.000Z"),
        endedAt: new Date("2024-05-01T09:00:00.000Z"),
      },
    });

    const token = (await loginWithSlug({ companySlug: company.slug, identifier: admin.email, password })).body.token;
    const res = await request(app)
      .get("/api/v1/timesheets/work-runs?from=2024-05-01&to=2024-05-01")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.timesheets).toHaveLength(1);
    expect(res.body.timesheets[0].routes).toHaveLength(1);
    expect(res.body.timesheets[0].routes[0].name).toBe("WR Route");
    expect(res.body.timesheets[0].runsCount).toBe(1);
    expect(res.body.timesheets[0].totalsMinutes.DRIVING).toBe(60);
  });

  it("scopes to company and does not show other company work-runs", async () => {
    const companyA = await createCompany({ name: "WorkRun Scope A" });
    const companyB = await createCompany({ name: "WorkRun Scope B" });
    const adminA = await createUser({ companyId: companyA.id, role: "ADMIN", email: "admin.wra@example.com", passwordPlain: password });
    const driverB = await createUser({ companyId: companyB.id, role: "DRIVER", email: "driver.wrb@example.com", passwordPlain: password });
    const routeB = await prisma.routeOption.create({ data: { companyId: companyB.id, name: "WR Route B" } });

    await prisma.workRun.create({
      data: {
        companyId: companyB.id,
        userId: driverB.id,
        activityType: "DRIVING",
        routeOptionId: routeB.id,
        vehicleId: null,
        startedAt: new Date("2024-06-01T10:00:00.000Z"),
        endedAt: new Date("2024-06-01T10:30:00.000Z"),
      },
    });

    const token = (await loginWithSlug({ companySlug: companyA.slug, identifier: adminA.email, password })).body.token;
    const res = await request(app)
      .get("/api/v1/timesheets/work-runs?from=2024-06-01&to=2024-06-01")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.timesheets).toHaveLength(0);
  });

  it("forbids driver access", async () => {
    const company = await createCompany({ name: "WorkRun Forbid Driver" });
    const driver = await createUser({ companyId: company.id, role: "DRIVER", email: "driver.wrforbid@example.com", passwordPlain: password });
    const token = (await loginWithSlug({ companySlug: company.slug, identifier: driver.email, password })).body.token;

    const res = await request(app)
      .get("/api/v1/timesheets/work-runs?from=2024-07-01&to=2024-07-01")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});
