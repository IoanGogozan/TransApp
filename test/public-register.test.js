const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/config/prismaClient");

describe("Public company registration", () => {
  const password = "Password123!";

  it("registers a new company and admin", async () => {
    const slug = `demo-${Date.now()}`;
    const res = await request(app).post("/api/v1/public/register").send({
      companyName: "New Demo Transport",
      companySlug: slug,
      adminEmail: "Admin@NewDemo.no",
      adminPassword: password,
    });

    expect(res.status).toBe(201);
    expect(res.body.company.slug).toBe(slug);

    const admin = await prisma.user.findFirst({ where: { company: { slug }, role: "ADMIN" } });
    expect(admin).not.toBeNull();
    expect(admin.email).toBe("admin@newdemo.no");
  });

  it("rejects duplicate slug", async () => {
    const slug = `dupslug-${Date.now()}`;
    await request(app).post("/api/v1/public/register").send({
      companyName: "Company One",
      companySlug: slug,
      adminEmail: "first@example.com",
      adminPassword: password,
    });

    const res = await request(app).post("/api/v1/public/register").send({
      companyName: "Company Two",
      companySlug: slug,
      adminEmail: "second@example.com",
      adminPassword: password,
    });

    expect(res.status).toBe(409);
    expect(res.body.error?.code).toBe("COMPANY_SLUG_TAKEN");
  });

  it("rejects invalid slug", async () => {
    const res = await request(app).post("/api/v1/public/register").send({
      companyName: "Invalid Slug Co",
      companySlug: "BAD SLUG",
      adminEmail: "invalid@example.com",
      adminPassword: password,
    });

    expect(res.status).toBe(400);
  });

  it("rejects weak admin password", async () => {
    const res = await request(app).post("/api/v1/public/register").send({
      companyName: "Weak Pass Co",
      companySlug: `weak-${Date.now()}`,
      adminEmail: "weak@example.com",
      adminPassword: "short",
    });

    expect(res.status).toBe(400);
  });

  it("returns only login-safe company fields from the tenant public endpoint", async () => {
    const slug = `public-safe-${Date.now()}`;
    await request(app).post("/api/v1/public/register").send({
      companyName: "Public Safe Transport",
      companySlug: slug,
      adminEmail: "public-safe@example.com",
      adminPassword: password,
    });

    const res = await request(app).get(`/api/v1/c/${slug}/public`);

    expect(res.status).toBe(200);
    expect(res.body.company).toEqual({
      name: "Public Safe Transport",
      slug,
      defaultLanguage: "no",
    });
    expect(res.body.company).not.toHaveProperty("id");
    expect(res.body.company).not.toHaveProperty("plan");
  });

  it("keeps the legacy public company endpoint minimized", async () => {
    const slug = `public-legacy-safe-${Date.now()}`;
    await request(app).post("/api/v1/public/register").send({
      companyName: "Public Legacy Safe Transport",
      companySlug: slug,
      adminEmail: "public-legacy-safe@example.com",
      adminPassword: password,
    });

    const res = await request(app).get(`/api/v1/public/c/${slug}/public`);

    expect(res.status).toBe(200);
    expect(res.body.company).toEqual({
      name: "Public Legacy Safe Transport",
      slug,
      defaultLanguage: "no",
    });
    expect(res.body.company).not.toHaveProperty("id");
    expect(res.body.company).not.toHaveProperty("plan");
  });
});
