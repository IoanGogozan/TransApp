const prisma = require("../config/prismaClient");
const AppError = require("../utils/AppError");
const { hashPassword } = require("../utils/password");

const normalizeEmail = (s) => s.trim().toLowerCase();

const createCompanyWithAdmin = async ({ companyName, companySlug, adminEmail, adminPassword }) => {
  const slug = companySlug.trim().toLowerCase();
  const email = normalizeEmail(adminEmail);
  const passwordHash = await hashPassword(adminPassword);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: { name: companyName, slug },
        select: { id: true, name: true, slug: true },
      });

      await tx.user.create({
        data: {
          companyId: company.id,
          email,
          passwordHash,
          role: "ADMIN",
        },
      });

      return company;
    });

    return result;
  } catch (err) {
    if (err?.code === "P2002") {
      const targets = Array.isArray(err.meta?.target) ? err.meta.target : [];
      if (targets.some((t) => String(t).toLowerCase().includes("email"))) {
        throw new AppError(409, "Email already registered", "AUTH_EMAIL_TAKEN");
      }
      throw new AppError(409, "Company slug already taken", "COMPANY_SLUG_TAKEN");
    }
    throw err;
  }
};

module.exports = { createCompanyWithAdmin };
