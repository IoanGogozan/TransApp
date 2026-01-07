var mockStripe = {
  subscriptions: {
    retrieve: vi.fn(),
    update: vi.fn(),
  },
};

const request = require("supertest");
const prisma = require("../src/config/prismaClient");
const { createCompany, createUser } = require("./helpers/testData");
const { loginWithSlug } = require("./helpers/auth");
describe("Billing Stripe plan changes", () => {
  const password = "Password123!";

  beforeAll(() => {
    process.env.STRIPE_PRICE_PRO = "price_pro_123";
  });

  it("updates plan on existing Stripe subscription", async () => {
    const app = require("../src/app");
    global.__stripeMock = mockStripe;

    const company = await createCompany({ name: "Stripe Plan Change Co" });
    const admin = await createUser({
      companyId: company.id,
      role: "ADMIN",
      email: "admin.stripe.plan@example.com",
      passwordPlain: password,
    });

    await prisma.subscription.update({
      where: { companyId: company.id },
      data: {
        stripeCustomerId: "cus_1",
        stripeSubscriptionId: "sub_1",
        plan: "BASIC",
      },
    });

    mockStripe.subscriptions.retrieve.mockResolvedValue({
      items: { data: [{ id: "si_1" }] },
    });
    mockStripe.subscriptions.update.mockResolvedValue({
      id: "sub_1",
      status: "active",
      items: { data: [{ id: "si_1" }] },
    });

    const token = (await loginWithSlug({
      companySlug: company.slug,
      identifier: admin.email,
      password,
    })).body.token;

    const res = await request(app)
      .post(`/api/v1/c/${company.slug}/billing/stripe/subscribe`)
      .set("Authorization", `Bearer ${token}`)
      .send({ plan: "PRO" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      subscriptionId: "sub_1",
      status: "active",
      updated: true,
    });

    const updated = await prisma.subscription.findUnique({
      where: { companyId: company.id },
      select: { plan: true },
    });
    expect(updated.plan).toBe("PRO");
    delete global.__stripeMock;
  });
});
