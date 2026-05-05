const request = require("supertest");
const app = require("../src/app");
const { createCompany, createUser } = require("./helpers/testData");
const { loginWithSlug } = require("./helpers/auth");

describe("Company URL context", () => {
  const password = "Password123!";

  it("rejects tenant-aware routes when URL slug does not match the authenticated company", async () => {
    const companyA = await createCompany({ name: "Context Company A" });
    const companyB = await createCompany({ name: "Context Company B" });
    const adminA = await createUser({
      companyId: companyA.id,
      role: "ADMIN",
      email: "admin.context.a@example.com",
      passwordPlain: password,
    });

    const tokenA = (await loginWithSlug({
      companySlug: companyA.slug,
      identifier: adminA.email,
      password,
    })).body.token;

    const res = await request(app)
      .get(`/api/v1/c/${companyB.slug}/billing/status`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("COMPANY_CONTEXT_MISMATCH");
  });

  it("allows tenant-aware routes when URL slug matches the authenticated company", async () => {
    const company = await createCompany({ name: "Context Company Match" });
    const admin = await createUser({
      companyId: company.id,
      role: "ADMIN",
      email: "admin.context.match@example.com",
      passwordPlain: password,
    });

    const token = (await loginWithSlug({
      companySlug: company.slug,
      identifier: admin.email,
      password,
    })).body.token;

    const res = await request(app)
      .get(`/api/v1/c/${company.slug}/billing/status`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.companyId).toBe(company.id);
  });

  it("returns not found when tenant-aware route uses an unknown slug", async () => {
    const company = await createCompany({ name: "Context Unknown Slug Co" });
    const admin = await createUser({
      companyId: company.id,
      role: "ADMIN",
      email: "admin.context.unknown@example.com",
      passwordPlain: password,
    });

    const token = (await loginWithSlug({
      companySlug: company.slug,
      identifier: admin.email,
      password,
    })).body.token;

    const res = await request(app)
      .get("/api/v1/c/unknown-company-slug/billing/status")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("COMPANY_NOT_FOUND");
  });
});
