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

    await prisma.workEntry.create({
      data: {
        companyId: company.id,
        userId: driver.id,
        activityType: "DRIVING",
        routeOptionId: route.id,
        vehicleId: null,
        date: new Date("2024-05-01T00:00:00.000Z"),
        durationMin: 60,
        source: "MANUAL",
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
    expect(res.body.timesheets[0].entriesCount).toBe(1);
    expect(res.body.timesheets[0].totalsMinutes.DRIVING).toBe(60);
  });

  it("scopes to company and does not show other company work-runs", async () => {
    const companyA = await createCompany({ name: "WorkRun Scope A" });
    const companyB = await createCompany({ name: "WorkRun Scope B" });
    const adminA = await createUser({ companyId: companyA.id, role: "ADMIN", email: "admin.wra@example.com", passwordPlain: password });
    const driverB = await createUser({ companyId: companyB.id, role: "DRIVER", email: "driver.wrb@example.com", passwordPlain: password });
    const routeB = await prisma.routeOption.create({ data: { companyId: companyB.id, name: "WR Route B" } });

    await prisma.workEntry.create({
      data: {
        companyId: companyB.id,
        userId: driverB.id,
        activityType: "DRIVING",
        routeOptionId: routeB.id,
        vehicleId: null,
        date: new Date("2024-06-01T00:00:00.000Z"),
        durationMin: 30,
        source: "MANUAL",
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

  it("allows access for a valid trial subscription", async () => {
    const company = await createCompany({ name: "WorkRun Trial OK" });
    const admin = await createUser({ companyId: company.id, role: "ADMIN", email: "admin.wrtrial@example.com", passwordPlain: password });

    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.subscription.update({
      where: { companyId: company.id },
      data: { status: "TRIALING", trialEnd: future },
    });

    const token = (await loginWithSlug({ companySlug: company.slug, identifier: admin.email, password })).body.token;
    const res = await request(app)
      .get("/api/v1/timesheets/work-runs?from=2024-08-01&to=2024-08-01")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it("allows access during past-due grace period", async () => {
    const company = await createCompany({ name: "WorkRun Past Due Grace" });
    const admin = await createUser({ companyId: company.id, role: "ADMIN", email: "admin.wrgrace@example.com", passwordPlain: password });

    const pastDueAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    await prisma.subscription.update({
      where: { companyId: company.id },
      data: { status: "PAST_DUE", pastDueAt },
    });

    const token = (await loginWithSlug({ companySlug: company.slug, identifier: admin.email, password })).body.token;
    const res = await request(app)
      .get("/api/v1/timesheets/work-runs?from=2024-08-01&to=2024-08-01")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it("denies access after past-due grace period", async () => {
    const company = await createCompany({ name: "WorkRun Past Due Expired" });
    const admin = await createUser({ companyId: company.id, role: "ADMIN", email: "admin.wrgraceexpired@example.com", passwordPlain: password });

    const pastDueAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    await prisma.subscription.update({
      where: { companyId: company.id },
      data: { status: "PAST_DUE", pastDueAt },
    });

    const token = (await loginWithSlug({ companySlug: company.slug, identifier: admin.email, password })).body.token;
    const res = await request(app)
      .get("/api/v1/timesheets/work-runs?from=2024-08-01&to=2024-08-01")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(402);
    expect(res.body.error.code).toBe("SUBSCRIPTION_INACTIVE");
    expect(res.body.error.details.status).toBe("PAST_DUE");
  });

  it("denies access when subscription is inactive", async () => {
    const company = await createCompany({ name: "WorkRun Trial Expired" });
    const admin = await createUser({ companyId: company.id, role: "ADMIN", email: "admin.wrexpired@example.com", passwordPlain: password });

    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await prisma.subscription.update({
      where: { companyId: company.id },
      data: { status: "TRIALING", trialEnd: past },
    });

    const token = (await loginWithSlug({ companySlug: company.slug, identifier: admin.email, password })).body.token;
    const res = await request(app)
      .get("/api/v1/timesheets/work-runs?from=2024-08-01&to=2024-08-01")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(402);
    expect(res.body.error.code).toBe("SUBSCRIPTION_INACTIVE");
    expect(res.body.error.details.status).toBe("TRIALING");
  });
});
