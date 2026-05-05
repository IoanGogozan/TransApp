const fs = require("fs/promises");
const path = require("path");
const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/config/prismaClient");
const { createCompany, createUser } = require("./helpers/testData");
const { loginWithSlug } = require("./helpers/auth");

describe("Admin documents", () => {
  const password = "Password123!";

  const login = async ({ companySlug, identifier }) => {
    const res = await loginWithSlug({ companySlug, identifier, password });
    return res.body.token;
  };

  const cleanupDocumentFile = async (documentId) => {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { storagePath: true },
    });
    if (document?.storagePath) {
      await fs.unlink(path.join(process.cwd(), document.storagePath)).catch(() => null);
    }
  };

  it("allows admin to upload a valid document", async () => {
    const company = await createCompany({ name: "Document Upload Co" });
    const admin = await createUser({
      companyId: company.id,
      role: "ADMIN",
      email: "admin.documents@example.com",
      passwordPlain: password,
    });
    const token = await login({ companySlug: company.slug, identifier: admin.email });

    const res = await request(app)
      .post("/api/v1/admin/documents")
      .set("Authorization", `Bearer ${token}`)
      .field("title", "Driver handbook")
      .attach("file", Buffer.from("Document content"), {
        filename: "handbook.txt",
        contentType: "text/plain",
      });

    expect(res.status).toBe(201);
    expect(res.body.document).toMatchObject({
      title: "Driver handbook",
      mimeType: "text/plain",
      uploadedByUserId: admin.id,
    });
    expect(res.body.document.size).toBe(Buffer.byteLength("Document content"));

    const stored = await prisma.document.findFirst({
      where: { id: res.body.document.id, companyId: company.id },
    });
    expect(stored).toBeTruthy();
    expect(stored.storagePath).toContain(`uploads${path.sep}${company.id}${path.sep}documents`);

    const file = await fs.readFile(path.join(process.cwd(), stored.storagePath), "utf8");
    expect(file).toBe("Document content");

    await cleanupDocumentFile(res.body.document.id);
  });

  it("forbids driver from uploading admin document", async () => {
    const company = await createCompany({ name: "Document Driver Forbidden Co" });
    const driver = await createUser({
      companyId: company.id,
      role: "DRIVER",
      email: "driver.documents@example.com",
      passwordPlain: password,
    });
    const token = await login({ companySlug: company.slug, identifier: driver.email });

    const res = await request(app)
      .post("/api/v1/admin/documents")
      .set("Authorization", `Bearer ${token}`)
      .field("title", "Driver upload")
      .attach("file", Buffer.from("Document content"), {
        filename: "driver.txt",
        contentType: "text/plain",
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("returns validation error when file is missing", async () => {
    const company = await createCompany({ name: "Document Missing File Co" });
    const admin = await createUser({
      companyId: company.id,
      role: "ADMIN",
      email: "admin.documents.missing@example.com",
      passwordPlain: password,
    });
    const token = await login({ companySlug: company.slug, identifier: admin.email });

    const res = await request(app)
      .post("/api/v1/admin/documents")
      .set("Authorization", `Bearer ${token}`)
      .field("title", "No file");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects invalid MIME type", async () => {
    const company = await createCompany({ name: "Document Invalid Mime Co" });
    const admin = await createUser({
      companyId: company.id,
      role: "ADMIN",
      email: "admin.documents.mime@example.com",
      passwordPlain: password,
    });
    const token = await login({ companySlug: company.slug, identifier: admin.email });

    const res = await request(app)
      .post("/api/v1/admin/documents")
      .set("Authorization", `Bearer ${token}`)
      .field("title", "Invalid file")
      .attach("file", Buffer.from("bad file"), {
        filename: "bad.exe",
        contentType: "application/octet-stream",
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("UPLOAD_FILE_TYPE_NOT_ALLOWED");
  });

  it("rejects file content that does not match the declared MIME type", async () => {
    const company = await createCompany({ name: "Document Spoofed Mime Co" });
    const admin = await createUser({
      companyId: company.id,
      role: "ADMIN",
      email: "admin.documents.spoof@example.com",
      passwordPlain: password,
    });
    const token = await login({ companySlug: company.slug, identifier: admin.email });

    const res = await request(app)
      .post("/api/v1/admin/documents")
      .set("Authorization", `Bearer ${token}`)
      .field("title", "Spoofed file")
      .attach("file", Buffer.from("not a real png"), {
        filename: "spoofed.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("UPLOAD_FILE_TYPE_NOT_ALLOWED");
  });

  it("rejects files whose extension does not match the MIME type", async () => {
    const company = await createCompany({ name: "Document Extension Mismatch Co" });
    const admin = await createUser({
      companyId: company.id,
      role: "ADMIN",
      email: "admin.documents.extension@example.com",
      passwordPlain: password,
    });
    const token = await login({ companySlug: company.slug, identifier: admin.email });

    const res = await request(app)
      .post("/api/v1/admin/documents")
      .set("Authorization", `Bearer ${token}`)
      .field("title", "Extension mismatch")
      .attach("file", Buffer.from("plain text content"), {
        filename: "notes.pdf",
        contentType: "text/plain",
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("UPLOAD_FILE_TYPE_NOT_ALLOWED");
  });
});
