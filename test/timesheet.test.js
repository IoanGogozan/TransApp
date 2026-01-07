const request = require("supertest");
const app = require("../src/app");
const { createCompany, createUser } = require("./helpers/testData");
const { loginWithSlug } = require("./helpers/auth");

describe("Driver entries", () => {
  const password = "Password123!";

  const loginDriver = async (company, driver) => {
    const res = await loginWithSlug({ companySlug: company.slug, identifier: driver.email || driver.phone, password });
    return res.body.token;
  };

  it("lets driver create an entry and list it", async () => {
    const company = await createCompany({ name: "Timesheet Co" });
    const driver = await createUser({ companyId: company.id, role: "DRIVER", email: "driver.timesheet@example.com", passwordPlain: password });
    const token = await loginDriver(company, driver);

    const createRes = await request(app)
      .post("/api/v1/me/entries")
      .set("Authorization", `Bearer ${token}`)
      .send({
        date: "2024-01-01",
        activityType: "BREAK",
        durationMin: 15,
        note: "Day one",
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.activityType).toBe("BREAK");

    const listRes = await request(app)
      .get("/api/v1/me/entries?date=2024-01-01")
      .set("Authorization", `Bearer ${token}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.items).toHaveLength(1);
  });

  it("rejects invalid duration", async () => {
    const company = await createCompany({ name: "Timesheet Duration" });
    const driver = await createUser({ companyId: company.id, role: "DRIVER", email: "driver.duration@example.com", passwordPlain: password });
    const token = await loginDriver(company, driver);

    const res = await request(app)
      .post("/api/v1/me/entries")
      .set("Authorization", `Bearer ${token}`)
      .send({
        date: "2024-02-01",
        activityType: "BREAK",
        durationMin: 0,
      });

    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe("VALIDATION_ERROR");
  });

  it("requires customer for OTHER_WORK", async () => {
    const company = await createCompany({ name: "Timesheet Customer" });
    const driver = await createUser({ companyId: company.id, role: "DRIVER", email: "driver.customer@example.com", passwordPlain: password });
    const token = await loginDriver(company, driver);

    const res = await request(app)
      .post("/api/v1/me/entries")
      .set("Authorization", `Bearer ${token}`)
      .send({
        date: "2024-03-01",
        activityType: "OTHER_WORK",
        durationMin: 30,
      });

    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe("VALIDATION_ERROR");
  });

  it("rejects invalid date format", async () => {
    const company = await createCompany({ name: "Timesheet Date" });
    const driver = await createUser({ companyId: company.id, role: "DRIVER", email: "driver.date@example.com", passwordPlain: password });
    const token = await loginDriver(company, driver);

    const res = await request(app)
      .get("/api/v1/me/entries?date=2024-13-01")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe("VALIDATION_ERROR");
  });
});
