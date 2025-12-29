const request = require("supertest");
const app = require("../src/app");
const { createCompany, createUser, createVehicle } = require("./helpers/testData");

const login = async ({ companySlug, email, password }) => {
  const res = await request(app).post(`/api/v1/c/${companySlug}/auth/login`).send({ identifier: email, password });
  expect(res.status).toBe(200);
  return res.body.token;
};

describe("Shifts", () => {
  it("starts a shift and prevents starting a second active shift", async () => {
    const company = await createCompany({ name: "Shift Demo Co" });
    const password = "Password123!";
    const user = await createUser({
      companyId: company.id,
      email: `driver.shift+${Date.now()}@example.com`,
      role: "DRIVER",
      passwordPlain: password,
    });
    const vehicle = await createVehicle({
      companyId: company.id,
      regNumber: `REG${Math.floor(Math.random() * 100000)}`,
      name: "Shift Truck",
      type: "Truck",
    });

    const token = await login({ companySlug: company.slug, email: user.email, password });

    const startRes = await request(app)
      .post("/api/v1/shifts/start")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(startRes.status).toBe(201);
    expect(startRes.body.shift).toBeDefined();
    expect(startRes.body.shift.id).toBeDefined();

    const secondRes = await request(app)
      .post("/api/v1/shifts/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ vehicleId: vehicle.id });

    expect(secondRes.status).toBe(409);
    expect(secondRes.body.error).toBeDefined();
    expect(secondRes.body.error.code).toBeTruthy();
  });
});
