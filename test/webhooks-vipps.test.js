const request = require("supertest");
const prisma = require("../src/config/prismaClient");
const { createCompany } = require("./helpers/testData");

process.env.VIPPS_WEBHOOK_ALLOW_UNSIGNED_TEST = "true";

const app = require("../src/app");

describe("Vipps webhooks", () => {
  it("updates agreement status to ACTIVE on agreement activated", async () => {
    const company = await createCompany({ name: "Vipps Agreement Co" });
    const agreementId = `agr_${company.id}`;
    await prisma.subscription.update({
      where: { companyId: company.id },
      data: { vippsAgreementId: agreementId },
    });

    const payload = JSON.stringify({
      eventType: "recurring.agreement-activated.v1",
      agreementId,
      occurred: "2026-01-04T00:00:00Z",
    });

    const res = await request(app)
      .post("/api/v1/webhooks/vipps")
      .set("Content-Type", "application/json")
      .send(payload);

    expect(res.status).toBe(200);

    const subscription = await prisma.subscription.findUnique({
      where: { companyId: company.id },
    });
    expect(subscription.vippsAgreementStatus).toBe("ACTIVE");
  });

  it("updates subscription status to ACTIVE on charge captured", async () => {
    const company = await createCompany({ name: "Vipps Charge Co" });
    const agreementId = `agr_${company.id}`;
    await prisma.subscription.update({
      where: { companyId: company.id },
      data: { vippsAgreementId: agreementId },
    });

    const payload = JSON.stringify({
      eventType: "recurring.charge-captured.v1",
      agreementId,
      chargeId: "ch_1",
      occurred: "2026-01-04T00:00:00Z",
      amount: 1000,
    });

    const res = await request(app)
      .post("/api/v1/webhooks/vipps")
      .set("Content-Type", "application/json")
      .send(payload);

    expect(res.status).toBe(200);

    const subscription = await prisma.subscription.findUnique({
      where: { companyId: company.id },
    });
    expect(subscription.status).toBe("ACTIVE");
  });
});
