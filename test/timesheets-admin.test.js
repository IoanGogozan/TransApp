const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/config/prismaClient");
const { createCompany, createUser } = require("./helpers/testData");
const { loginWithSlug } = require("./helpers/auth");

describe("Admin timesheet listing", () => {
  const password = "Password123!";

  const createEntries = async ({ companyId, userId, date, routeOptionId, entries }) =>
    prisma.workEntry.createMany({
      data: entries.map((entry) => ({
        companyId,
        userId,
        date: new Date(`${date}T00:00:00.000Z`),
        routeOptionId: routeOptionId ?? null,
        activityType: entry.activityType,
        durationMin: entry.durationMin,
        source: "MANUAL",
      })),
    });

  it("allows admin to list timesheets in their company", async () => {
    const company = await createCompany({ name: "Timesheet List Co" });
    const admin = await createUser({ companyId: company.id, role: "ADMIN", email: "admin.tlist@example.com", passwordPlain: password });
    const driver = await createUser({ companyId: company.id, role: "DRIVER", email: "driver.tlist@example.com", passwordPlain: password });
    const route = await prisma.routeOption.create({ data: { companyId: company.id, name: "Route L1" } });
    await createEntries({
      companyId: company.id,
      userId: driver.id,
      date: "2024-05-01",
      routeOptionId: route.id,
      entries: [
        { activityType: "DRIVING", durationMin: 60 },
        { activityType: "BREAK", durationMin: 30 },
      ],
    });

    const token = (await loginWithSlug({ companySlug: company.slug, identifier: admin.email, password })).body.token;
    const res = await request(app)
      .get("/api/v1/timesheets/work-runs?from=2024-05-01&to=2024-05-02")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.timesheets).toHaveLength(1);
    expect(res.body.timesheets[0].routes).toHaveLength(1);
    expect(res.body.timesheets[0].routes[0].name).toBe("Route L1");
    expect(res.body.timesheets[0].totalsMinutes.DRIVING).toBe(60);
  });

  it("scopes to company and does not show other company timesheets", async () => {
    const companyA = await createCompany({ name: "Timesheet Scope A" });
    const companyB = await createCompany({ name: "Timesheet Scope B" });
    const adminA = await createUser({ companyId: companyA.id, role: "ADMIN", email: "admin.scopea@example.com", passwordPlain: password });
    const driverA = await createUser({ companyId: companyA.id, role: "DRIVER", email: "driver.scopea@example.com", passwordPlain: password });
    const driverB = await createUser({ companyId: companyB.id, role: "DRIVER", email: "driver.scopeb@example.com", passwordPlain: password });

    await createEntries({
      companyId: companyA.id,
      userId: driverA.id,
      date: "2024-06-01",
      entries: [{ activityType: "DRIVING", durationMin: 30 }],
    });
    await createEntries({
      companyId: companyB.id,
      userId: driverB.id,
      date: "2024-06-01",
      entries: [{ activityType: "DRIVING", durationMin: 45 }],
    });

    const token = (await loginWithSlug({ companySlug: companyA.slug, identifier: adminA.email, password })).body.token;
    const res = await request(app)
      .get("/api/v1/timesheets/work-runs?from=2024-06-01&to=2024-06-02")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.timesheets).toHaveLength(1);
    expect(res.body.timesheets[0].totalsMinutes.DRIVING).toBe(30);
  });

  it("forbids driver access", async () => {
    const company = await createCompany({ name: "Timesheet Forbid Driver" });
    const driver = await createUser({ companyId: company.id, role: "DRIVER", email: "driver.forbid@example.com", passwordPlain: password });
    const token = (await loginWithSlug({ companySlug: company.slug, identifier: driver.email, password })).body.token;

    const res = await request(app)
      .get("/api/v1/timesheets/work-runs?from=2024-07-01&to=2024-07-02")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});
