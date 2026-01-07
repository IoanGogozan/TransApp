const request = require("supertest");
const prisma = require("../src/config/prismaClient");
const { createCompany } = require("./helpers/testData");
const Stripe = require("stripe");

process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "whsec_test";
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "sk_test_dummy";

const uniqueEventId = () => `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
const app = require("../src/app");

describe("Stripe webhooks", () => {
  it("updates subscription status to ACTIVE on subscription.updated", async () => {
    const company = await createCompany({ name: "Stripe Webhook Co" });
    await prisma.subscription.update({
      where: { companyId: company.id },
      data: { stripeSubscriptionId: "sub_123" },
    });

    const eventId = uniqueEventId();
    const payload = JSON.stringify({
      id: eventId,
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_123",
          status: "active",
        },
      },
    });
    const sig = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET,
    });

    const res = await request(app)
      .post("/api/v1/webhooks/stripe")
      .set("stripe-signature", sig)
      .set("Content-Type", "application/json")
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });

    const subscription = await prisma.subscription.findUnique({ where: { companyId: company.id } });
    expect(subscription.status).toBe("ACTIVE");

    const webhookEvent = await prisma.webhookEvent.findFirst({
      where: { provider: "STRIPE", eventId },
    });
    expect(webhookEvent).not.toBeNull();
    expect(webhookEvent.processedAt).not.toBeNull();
  });

  it("is idempotent for the same event id", async () => {
    const company = await createCompany({ name: "Stripe Webhook Idempotent Co" });
    await prisma.subscription.update({
      where: { companyId: company.id },
      data: { stripeSubscriptionId: "sub_456" },
    });

    const eventId = uniqueEventId();
    const payload = JSON.stringify({
      id: eventId,
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_456",
          status: "active",
        },
      },
    });
    const sig = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET,
    });

    const sendWebhook = () =>
      request(app)
        .post("/api/v1/webhooks/stripe")
        .set("stripe-signature", sig)
        .set("Content-Type", "application/json")
        .send(payload);

    const first = await sendWebhook();
    expect(first.status).toBe(200);

    const second = await sendWebhook();
    expect(second.status).toBe(200);

    const count = await prisma.webhookEvent.count({
      where: { provider: "STRIPE", eventId },
    });
    expect(count).toBe(1);
  });
});
