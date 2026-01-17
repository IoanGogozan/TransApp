const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/config/prismaClient");
const { createCompany, createUser } = require("./helpers/testData");
const { loginWithSlug } = require("./helpers/auth");

const pngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==";
const pngBuffer = Buffer.from(pngBase64, "base64");

const createDefect = async ({ token, vehicleId }) => {
  const res = await request(app)
    .post("/api/v1/defects")
    .set("Authorization", `Bearer ${token}`)
    .send({
      vehicleId,
      title: "Test defect",
      description: "Test description",
    });
  return res;
};

describe("Defects and attachments", () => {
  const password = "Password123!";
  let companyA;
  let companyB;
  let vehicleA;
  let tokenAAdmin;
  let tokenADriver;
  let tokenBAdmin;

  const createDefectAsDriver = async () => {
    const res = await createDefect({ token: tokenADriver, vehicleId: vehicleA.id });
    return res.body.defect?.id;
  };

  beforeEach(async () => {
    companyA = await createCompany({ name: "Defects Co A" });
    companyB = await createCompany({ name: "Defects Co B" });

    const adminA = await createUser({
      companyId: companyA.id,
      role: "ADMIN",
      email: "admin.defect.a@example.com",
      passwordPlain: password,
    });
    const driverA = await createUser({
      companyId: companyA.id,
      role: "DRIVER",
      email: "driver.defect.a@example.com",
      passwordPlain: password,
    });
    const adminB = await createUser({
      companyId: companyB.id,
      role: "ADMIN",
      email: "admin.defect.b@example.com",
      passwordPlain: password,
    });

    vehicleA = await prisma.vehicle.create({
      data: { companyId: companyA.id, regNumber: "DEF-A-1", name: "Truck A", type: "Truck" },
    });

    tokenAAdmin = (await loginWithSlug({ companySlug: companyA.slug, identifier: adminA.email, password })).body.token;
    tokenADriver = (await loginWithSlug({ companySlug: companyA.slug, identifier: driverA.email, password })).body.token;
    tokenBAdmin = (await loginWithSlug({ companySlug: companyB.slug, identifier: adminB.email, password })).body.token;
  });

  it("driver can create defect in own company", async () => {
    const res = await createDefect({ token: tokenADriver, vehicleId: vehicleA.id });

    expect(res.status).toBe(201);
    expect(res.body.defect?.id).toBeDefined();
  });

  it("tenant isolation: company B cannot read company A defect", async () => {
    const defectId = await createDefectAsDriver();
    expect(defectId).toBeDefined();

    const res = await request(app)
      .get(`/api/v1/defects/${defectId}`)
      .set("Authorization", `Bearer ${tokenBAdmin}`);

    expect([403, 404]).toContain(res.status);
    if (res.body?.error?.code) {
      expect(["FORBIDDEN", "DEFECT_NOT_FOUND", "NOT_FOUND"]).toContain(res.body.error.code);
    }
  });

  it("admin can change defect status; driver cannot", async () => {
    const defectId = await createDefectAsDriver();
    expect(defectId).toBeDefined();

    const adminRes = await request(app)
      .patch(`/api/v1/defects/${defectId}/status`)
      .set("Authorization", `Bearer ${tokenAAdmin}`)
      .send({ status: "IN_PROGRESS" });
    expect(adminRes.status).toBe(200);

    const driverRes = await request(app)
      .patch(`/api/v1/defects/${defectId}/status`)
      .set("Authorization", `Bearer ${tokenADriver}`)
      .send({ status: "RESOLVED" });
    expect(driverRes.status).toBe(403);
    if (driverRes.body?.error?.code) {
      expect(driverRes.body.error.code).toBe("FORBIDDEN");
    }
  });

  it("attachment upload rejects invalid file type", async () => {
    const defectId = await createDefectAsDriver();

    const res = await request(app)
      .post(`/api/v1/defects/${defectId}/attachments`)
      .set("Authorization", `Bearer ${tokenAAdmin}`)
      .attach("file", Buffer.from("bad file"), { filename: "test.txt", contentType: "text/plain" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("UPLOAD_FILE_TYPE_NOT_ALLOWED");
  });

  it("attachment limit reached at 5", async () => {
    const defectId = await createDefectAsDriver();

    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post(`/api/v1/defects/${defectId}/attachments`)
        .set("Authorization", `Bearer ${tokenAAdmin}`)
        .attach("file", pngBuffer, { filename: `image-${i}.png`, contentType: "image/png" });
      expect(res.status).toBe(201);
    }

    const sixth = await request(app)
      .post(`/api/v1/defects/${defectId}/attachments`)
      .set("Authorization", `Bearer ${tokenAAdmin}`)
      .attach("file", pngBuffer, { filename: "image-6.png", contentType: "image/png" });

    expect(sixth.status).toBe(409);
    expect(sixth.body.error.code).toBe("ATTACHMENT_LIMIT_REACHED");
  });
});
