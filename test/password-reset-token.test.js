const crypto = require("crypto");
const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/config/prismaClient");
const { createCompany, createUser } = require("./helpers/testData");

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const createResetToken = async ({ companyId, userId, token = "reset-token-value" }) => {
  await prisma.passwordResetToken.create({
    data: {
      companyId,
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  return token;
};

describe("Password reset token validation", () => {
  it("validates reset token through POST body", async () => {
    const company = await createCompany({ name: "Reset Token POST Co" });
    const user = await createUser({
      companyId: company.id,
      role: "ADMIN",
      email: "reset.post@example.com",
    });
    const token = await createResetToken({ companyId: company.id, userId: user.id });

    const res = await request(app)
      .post("/api/v1/auth/reset-password/validate")
      .send({ companySlug: company.slug, token });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ valid: true });
  });

  it("does not accept reset token validation through query string", async () => {
    const company = await createCompany({ name: "Reset Token GET Co" });
    const user = await createUser({
      companyId: company.id,
      role: "ADMIN",
      email: "reset.get@example.com",
    });
    const token = await createResetToken({ companyId: company.id, userId: user.id });

    const res = await request(app)
      .get(
        `/api/v1/auth/reset-password/validate?companySlug=${encodeURIComponent(company.slug)}&token=${encodeURIComponent(token)}`,
      );

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("AUTH_MISSING_TOKEN");
  });

  it("rejects POST validation when token is sent only in query string", async () => {
    const company = await createCompany({ name: "Reset Token Query Only Co" });
    const user = await createUser({
      companyId: company.id,
      role: "ADMIN",
      email: "reset.query.only@example.com",
    });
    const token = await createResetToken({ companyId: company.id, userId: user.id });

    const res = await request(app)
      .post(
        `/api/v1/auth/reset-password/validate?companySlug=${encodeURIComponent(company.slug)}&token=${encodeURIComponent(token)}`,
      )
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
