const request = require("supertest");
const app = require("../src/app");
const { osloDateOnly } = require("../src/utils/time");
const { createCompany, createUser, createVehicle } = require("./helpers/testData");

const login = async ({ email, password }) => {
  const res = await request(app).post("/api/v1/auth/login").send({ email, password });
  expect(res.status).toBe(200);
  return res.body.token;
};

const submitChecklist = async ({ token, vehicleId, date }) => {
  const res = await request(app)
    .post("/api/v1/checklists/submit")
    .set("Authorization", `Bearer ${token}`)
    .send({
      vehicleId,
      date,
      answers: [
        {
          questionKey: "lights_ok",
          answer: "OK",
        },
      ],
    });
  expect(res.status).toBe(201);
  return res.body.checklist;
};

describe("Checklist gate for starting shift", () => {
  it("requires checklist before starting shift with vehicle", async () => {
    const company = await createCompany({ name: "Checklist Gate Co" });
    const password = "Password123!";
    const user = await createUser({
      companyId: company.id,
      email: `driver.checklist+${Date.now()}@example.com`,
      role: "DRIVER",
      passwordPlain: password,
    });
    const vehicle = await createVehicle({
      companyId: company.id,
      regNumber: `REG${Math.floor(Math.random() * 100000)}`,
      name: "Checklist Van",
      type: "Van",
    });

    const token = await login({ email: user.email, password });

    const firstRes = await request(app)
      .post("/api/v1/shifts/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ vehicleId: vehicle.id });

    expect(firstRes.status).toBe(409);
    expect(firstRes.body.error.code).toBe("CHECKLIST_REQUIRED");

    const todayOslo = osloDateOnly(new Date());
    await submitChecklist({ token, vehicleId: vehicle.id, date: todayOslo });

    const secondRes = await request(app)
      .post("/api/v1/shifts/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ vehicleId: vehicle.id });

    expect(secondRes.status).toBe(201);
    expect(secondRes.body.shift).toBeDefined();
  });
});
