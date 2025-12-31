const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/config/prismaClient");
const { createCompany, createUser } = require("./helpers/testData");
const { loginWithSlug } = require("./helpers/auth");

describe("Driver timesheets", () => {
  const password = "Password123!";

  const loginDriver = async (company, driver) => {
    const res = await loginWithSlug({ companySlug: company.slug, identifier: driver.email || driver.phone, password });
    return res.body.token;
  };

  it("lets driver upsert a valid timesheet day and retrieve it", async () => {
    const company = await createCompany({ name: "Timesheet Co" });
    const driver = await createUser({ companyId: company.id, role: "DRIVER", email: "driver.timesheet@example.com", passwordPlain: password });
    const route = await prisma.routeOption.create({
      data: { companyId: company.id, name: "Morning Route" },
    });
    const token = await loginDriver(company, driver);

    const putRes = await request(app)
      .put("/api/v1/me/timesheet/2024-01-01")
      .set("Authorization", `Bearer ${token}`)
      .send({
        routeOptionId: route.id,
        note: "Day one",
        entries: [
          { activityType: "DRIVING", start: "08:00", end: "10:00" },
          { activityType: "BREAK", start: "10:00", end: "10:15" },
        ],
      });

    expect(putRes.status).toBe(200);
    expect(putRes.body.entries).toHaveLength(2);
    expect(putRes.body.routeOptionId).toBe(route.id);

    const getRes = await request(app)
      .get("/api/v1/me/timesheet/2024-01-01")
      .set("Authorization", `Bearer ${token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.entries[0]).toMatchObject({ activityType: "DRIVING", start: "08:00", end: "10:00" });
    expect(getRes.body.entries[1]).toMatchObject({ activityType: "BREAK", start: "10:00", end: "10:15" });
  });

  it("rejects overlapping segments", async () => {
    const company = await createCompany({ name: "Timesheet Overlap" });
    const driver = await createUser({ companyId: company.id, role: "DRIVER", email: "driver.overlap@example.com", passwordPlain: password });
    const token = await loginDriver(company, driver);

    const res = await request(app)
      .put("/api/v1/me/timesheet/2024-02-01")
      .set("Authorization", `Bearer ${token}`)
      .send({
        entries: [
          { activityType: "DRIVING", start: "08:00", end: "10:00" },
          { activityType: "OTHER_WORK", start: "09:30", end: "11:00" },
        ],
      });

    expect(res.status).toBe(400);
  });

  it("requires overtime reason when overtime type is provided", async () => {
    const company = await createCompany({ name: "Timesheet Overtime" });
    const driver = await createUser({ companyId: company.id, role: "DRIVER", email: "driver.overtime@example.com", passwordPlain: password });
    const token = await loginDriver(company, driver);

    const res = await request(app)
      .put("/api/v1/me/timesheet/2024-03-01")
      .set("Authorization", `Bearer ${token}`)
      .send({
        overtimeType: "OT_50",
        entries: [{ activityType: "DRIVING", start: "07:00", end: "08:00" }],
      });

    expect(res.status).toBe(400);
  });

  it("forbids non-driver access", async () => {
    const company = await createCompany({ name: "Timesheet Forbidden" });
    const admin = await createUser({ companyId: company.id, role: "ADMIN", email: "admin.timesheet@example.com", passwordPlain: password });
    const token = (await loginWithSlug({ companySlug: company.slug, identifier: admin.email, password })).body.token;

    const res = await request(app)
      .get("/api/v1/me/timesheet/2024-04-01")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});
