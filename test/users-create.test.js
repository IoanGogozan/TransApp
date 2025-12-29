const request = require("supertest");
const app = require("../src/app");
const { createCompany, createUser } = require("./helpers/testData");
const { loginWithSlug } = require("./helpers/auth");

describe("User creation rules", () => {
  const ownerPassword = "Password123!";
  const driverPassword = "driverpw";

  it("creates driver with phone, enforces mustChangePassword and no temporary password", async () => {
    const company = await createCompany({ name: "Driver Co" });
    const owner = await createUser({ companyId: company.id, role: "PLATFORM_ADMIN", email: "owner.driver@example.com", passwordPlain: ownerPassword });

    const ownerLogin = await loginWithSlug({ companySlug: company.slug, identifier: owner.email, password: ownerPassword });
    const ownerToken = ownerLogin.body.token;

    const createRes = await request(app)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ phone: "+1 222 333 4444", email: "driver@example.com", role: "DRIVER", password: driverPassword });

    expect(createRes.status).toBe(201);
    expect(createRes.body.temporaryPassword).toBeUndefined();
    expect(createRes.body.user.mustChangePassword).toBe(true);

    const loginRes = await loginWithSlug({
      companySlug: company.slug,
      identifier: "+1 (222) 333-4444",
      password: driverPassword,
    });
    expect(loginRes.status).toBe(200);
  });

  it("rejects creating driver without phone", async () => {
    const company = await createCompany({ name: "Driver Without Phone Co" });
    const owner = await createUser({ companyId: company.id, role: "PLATFORM_ADMIN", email: "owner.nophone@example.com", passwordPlain: ownerPassword });
    const ownerToken = (await loginWithSlug({ companySlug: company.slug, identifier: owner.email, password: ownerPassword })).body.token;

    const res = await request(app)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: "driver.nophone@example.com", role: "DRIVER", password: driverPassword });

    expect(res.status).toBe(400);
  });

  it("rejects creating driver with password shorter than 6 characters", async () => {
    const company = await createCompany({ name: "Driver Short Pass Co" });
    const owner = await createUser({ companyId: company.id, role: "PLATFORM_ADMIN", email: "owner.shortpass@example.com", passwordPlain: ownerPassword });
    const ownerToken = (await loginWithSlug({ companySlug: company.slug, identifier: owner.email, password: ownerPassword })).body.token;

    const res = await request(app)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ phone: "+1234567890", role: "DRIVER", password: "short" });

    expect(res.status).toBe(400);
  });

  it("allows same phone in different companies", async () => {
    const companyA = await createCompany({ name: "Phone Company A" });
    const companyB = await createCompany({ name: "Phone Company B" });
    const ownerA = await createUser({ companyId: companyA.id, role: "PLATFORM_ADMIN", email: "owner.a@example.com", passwordPlain: ownerPassword });
    const ownerB = await createUser({ companyId: companyB.id, role: "PLATFORM_ADMIN", email: "owner.b@example.com", passwordPlain: ownerPassword });

    const tokenA = (await loginWithSlug({ companySlug: companyA.slug, identifier: ownerA.email, password: ownerPassword })).body.token;
    const tokenB = (await loginWithSlug({ companySlug: companyB.slug, identifier: ownerB.email, password: ownerPassword })).body.token;

    const phone = "+1 (555) 000-1111";

    const createA = await request(app)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ phone, password: driverPassword, role: "DRIVER" });
    expect(createA.status).toBe(201);

    const createB = await request(app)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ phone, password: driverPassword, role: "DRIVER" });

    expect(createB.status).toBe(201);
  });
});
