const request = require("supertest");
const crypto = require("crypto");
const prisma = require("../src/config/prismaClient");
const { createCompany } = require("./helpers/testData");

process.env.VIPPS_WEBHOOK_ALLOW_UNSIGNED_TEST = "true";

const app = require("../src/app");

const createVippsSignatureHeaders = ({ payload, secret, path = "/api/v1/webhooks/vipps" }) => {
  const date = "Tue, 05 May 2026 16:00:00 GMT";
  const host = "vipps-webhook.test";
  const contentHash = crypto.createHash("sha256").update(Buffer.from(payload)).digest("base64");
  const signedString = `POST\n${path}\n${date};${host};${contentHash}`;
  const signature = crypto.createHmac("sha256", secret).update(signedString).digest("base64");

  return {
    Host: host,
    "x-ms-date": date,
    "x-ms-content-sha256": contentHash,
    Authorization: `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${signature}`,
  };
};

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

  it("accepts a valid signed Vipps webhook", async () => {
    const previousSecret = process.env.VIPPS_WEBHOOK_SECRET;
    process.env.VIPPS_WEBHOOK_SECRET = "signed_vipps_secret";

    try {
      const company = await createCompany({ name: "Vipps Signed Co" });
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
        .set(createVippsSignatureHeaders({ payload, secret: process.env.VIPPS_WEBHOOK_SECRET }))
        .set("Content-Type", "application/json")
        .send(payload);

      expect(res.status).toBe(200);

      const subscription = await prisma.subscription.findUnique({
        where: { companyId: company.id },
      });
      expect(subscription.vippsAgreementStatus).toBe("ACTIVE");
    } finally {
      if (previousSecret === undefined) {
        delete process.env.VIPPS_WEBHOOK_SECRET;
      } else {
        process.env.VIPPS_WEBHOOK_SECRET = previousSecret;
      }
    }
  });

  it("rejects an invalid signed Vipps webhook", async () => {
    const previousSecret = process.env.VIPPS_WEBHOOK_SECRET;
    process.env.VIPPS_WEBHOOK_SECRET = "signed_vipps_secret";

    try {
      const payload = JSON.stringify({
        eventType: "recurring.agreement-activated.v1",
        agreementId: "agr_invalid",
        occurred: "2026-01-04T00:00:00Z",
      });
      const headers = createVippsSignatureHeaders({ payload, secret: process.env.VIPPS_WEBHOOK_SECRET });
      headers.Authorization = `${headers.Authorization}tampered`;

      const res = await request(app)
        .post("/api/v1/webhooks/vipps")
        .set(headers)
        .set("Content-Type", "application/json")
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VIPPS_SIGNATURE_INVALID");
    } finally {
      if (previousSecret === undefined) {
        delete process.env.VIPPS_WEBHOOK_SECRET;
      } else {
        process.env.VIPPS_WEBHOOK_SECRET = previousSecret;
      }
    }
  });
});
