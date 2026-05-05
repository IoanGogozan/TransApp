const request = require("supertest");
const app = require("../src/app");
const { createCompany, createUser } = require("./helpers/testData");
const { loginWithSlug } = require("./helpers/auth");

describe("Billing permissions", () => {
  const password = "Password123!";

  const loginUser = async ({ companySlug, identifier }) => {
    const res = await loginWithSlug({
      companySlug,
      identifier,
      password,
    });
    return res.body.token;
  };

  it("denies billing actions to drivers", async () => {
    const company = await createCompany({ name: "Billing Driver Denied Co" });
    const driver = await createUser({
      companyId: company.id,
      role: "DRIVER",
      email: "driver.billing@example.com",
      passwordPlain: password,
    });
    const token = await loginUser({
      companySlug: company.slug,
      identifier: driver.email,
    });

    const endpoints = [
      { method: "get", path: `/api/v1/c/${company.slug}/billing/status` },
      { method: "post", path: `/api/v1/c/${company.slug}/billing/stripe/setup-intent` },
      { method: "post", path: `/api/v1/c/${company.slug}/billing/stripe/portal` },
      { method: "post", path: `/api/v1/c/${company.slug}/billing/stripe/subscribe`, body: { plan: "PRO" } },
      { method: "post", path: `/api/v1/c/${company.slug}/billing/vipps/agreements`, body: { plan: "PRO" } },
      { method: "post", path: `/api/v1/c/${company.slug}/billing/vipps/change-plan`, body: { plan: "PRO" } },
    ];

    for (const endpoint of endpoints) {
      const res = await request(app)
        [endpoint.method](endpoint.path)
        .set("Authorization", `Bearer ${token}`)
        .send(endpoint.body || {});

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    }
  });

  it("allows admins to read billing status", async () => {
    const company = await createCompany({ name: "Billing Admin Allowed Co" });
    const admin = await createUser({
      companyId: company.id,
      role: "ADMIN",
      email: "admin.billing@example.com",
      passwordPlain: password,
    });
    const token = await loginUser({
      companySlug: company.slug,
      identifier: admin.email,
    });

    const res = await request(app)
      .get(`/api/v1/c/${company.slug}/billing/status`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.subscription).toMatchObject({
      plan: "BASIC",
      status: "TRIALING",
    });
  });
});
