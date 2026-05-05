const request = require("supertest");
const app = require("../src/app");
const { createCompany, createUser } = require("./helpers/testData");
const { loginWithSlug } = require("./helpers/auth");

const password = "Password123!";

describe("Plan limits", () => {
  it("blocks creating an admin beyond BASIC plan limit", async () => {
    const company = await createCompany({ name: "Basic Admin Co", plan: "BASIC" });
    const admin = await createUser({ companyId: company.id, role: "ADMIN", email: "admin.basic@example.com", passwordPlain: password });

    const loginRes = await loginWithSlug({ companySlug: company.slug, identifier: admin.email, password });
    const token = loginRes.body.token;
    const res = await request(app)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "second.admin@example.com", password, role: "ADMIN" });

    expect(res.status).toBe(409);
    expect(res.body.error?.code).toBe("PLAN_LIMIT_REACHED");
    expect(res.body.error?.details?.plan).toBe("BASIC");
    expect(res.body.error?.details?.role).toBe("ADMIN");
  });

  it("blocks creating a driver beyond BASIC plan limit", async () => {
    const company = await createCompany({ name: "Basic Driver Co", plan: "BASIC" });
    const owner = await createUser({ companyId: company.id, role: "PLATFORM_ADMIN", email: "owner.basic.driver@example.com", passwordPlain: password });
    for (let i = 0; i < 5; i++) {
      await createUser({
        companyId: company.id,
        role: "DRIVER",
        email: `driver${i}.basic@example.com`,
        passwordPlain: password,
      });
    }

    const loginRes = await loginWithSlug({ companySlug: company.slug, identifier: owner.email, password });
    const token = loginRes.body.token;
    const res = await request(app)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "driver5.basic@example.com", phone: "+1 301 555 0005", password: "driverpw", role: "DRIVER" });

    expect(res.status).toBe(409);
    expect(res.body.error?.code).toBe("PLAN_LIMIT_REACHED");
    expect(res.body.error?.details?.plan).toBe("BASIC");
    expect(res.body.error?.details?.role).toBe("DRIVER");
  });

  it("blocks creating a driver beyond MEDIUM plan limit", async () => {
    const company = await createCompany({ name: "Medium Driver Co", plan: "MEDIUM" });
    const owner = await createUser({ companyId: company.id, role: "PLATFORM_ADMIN", email: "owner.medium.driver@example.com", passwordPlain: password });
    for (let i = 0; i < 10; i++) {
      await createUser({
        companyId: company.id,
        role: "DRIVER",
        email: `driver${i}.medium@example.com`,
        passwordPlain: password,
      });
    }

    const loginRes = await loginWithSlug({ companySlug: company.slug, identifier: owner.email, password });
    const token = loginRes.body.token;
    const res = await request(app)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "driver10.medium@example.com", phone: "+1 302 555 0010", password: "driverpw", role: "DRIVER" });

    expect(res.status).toBe(409);
    expect(res.body.error?.code).toBe("PLAN_LIMIT_REACHED");
    expect(res.body.error?.details?.plan).toBe("MEDIUM");
    expect(res.body.error?.details?.role).toBe("DRIVER");
  });

  it("blocks creating an admin beyond PRO plan limit", async () => {
    const company = await createCompany({ name: "Pro Admin Co", plan: "PRO" });
    const owner = await createUser({ companyId: company.id, role: "PLATFORM_ADMIN", email: "owner.pro.admin@example.com", passwordPlain: password });
    await createUser({ companyId: company.id, role: "ADMIN", email: "admin1.pro@example.com", passwordPlain: password });
    await createUser({ companyId: company.id, role: "ADMIN", email: "admin2.pro@example.com", passwordPlain: password });
    await createUser({ companyId: company.id, role: "ADMIN", email: "admin3.pro@example.com", passwordPlain: password });
    await createUser({ companyId: company.id, role: "ADMIN", email: "admin4.pro@example.com", passwordPlain: password });
    await createUser({ companyId: company.id, role: "ADMIN", email: "admin5.pro@example.com", passwordPlain: password });

    const loginRes = await loginWithSlug({ companySlug: company.slug, identifier: owner.email, password });
    const token = loginRes.body.token;
    const res = await request(app)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "admin6.pro@example.com", password, role: "ADMIN" });

    expect(res.status).toBe(409);
    expect(res.body.error?.code).toBe("PLAN_LIMIT_REACHED");
    expect(res.body.error?.details?.plan).toBe("PRO");
    expect(res.body.error?.details?.role).toBe("ADMIN");
  });

  it("blocks reactivating an admin beyond plan limit", async () => {
    const company = await createCompany({ name: "Reactivate Admin Co", plan: "BASIC" });
    const owner = await createUser({ companyId: company.id, role: "PLATFORM_ADMIN", email: "owner.reactivate.admin@example.com", passwordPlain: password });
    await createUser({ companyId: company.id, role: "ADMIN", email: "active.admin@example.com", passwordPlain: password });
    const inactiveAdmin = await createUser({ companyId: company.id, role: "ADMIN", email: "inactive.admin@example.com", passwordPlain: password, active: false });

    const token = (await loginWithSlug({ companySlug: company.slug, identifier: owner.email, password })).body.token;
    const res = await request(app)
      .patch(`/api/v1/users/${inactiveAdmin.id}/active`)
      .set("Authorization", `Bearer ${token}`)
      .send({ active: true });

    expect(res.status).toBe(409);
    expect(res.body.error?.code).toBe("PLAN_LIMIT_REACHED");
    expect(res.body.error?.details?.role).toBe("ADMIN");
  });

  it("blocks reactivating a driver beyond plan limit", async () => {
    const company = await createCompany({ name: "Reactivate Driver Co", plan: "BASIC" });
    const owner = await createUser({ companyId: company.id, role: "PLATFORM_ADMIN", email: "owner.reactivate.driver@example.com", passwordPlain: password });
    for (let i = 0; i < 5; i++) {
      await createUser({
        companyId: company.id,
        role: "DRIVER",
        email: `driver${i}.reactivate@example.com`,
        passwordPlain: password,
      });
    }
    const inactiveDriver = await createUser({
      companyId: company.id,
      role: "DRIVER",
      email: "driver.inactive@example.com",
      passwordPlain: password,
      active: false,
    });

    const token = (await loginWithSlug({ companySlug: company.slug, identifier: owner.email, password })).body.token;
    const res = await request(app)
      .patch(`/api/v1/users/${inactiveDriver.id}/active`)
      .set("Authorization", `Bearer ${token}`)
      .send({ active: true });

    expect(res.status).toBe(409);
    expect(res.body.error?.code).toBe("PLAN_LIMIT_REACHED");
    expect(res.body.error?.details?.role).toBe("DRIVER");
  });
});
