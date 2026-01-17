const prisma = require("../src/config/prismaClient");
const { createCompany, createUser, createVehicle } = require("./helpers/testData");
const { runDefectHousekeepingOnce } = require("../src/jobs/defectHousekeeping");

const monthsAgo = (months) => {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date;
};

const createResolvedDefect = async ({ companyId, vehicleId, reportedByUserId, resolvedAt }) => {
  return prisma.defect.create({
    data: {
      companyId,
      vehicleId,
      reportedByUserId,
      title: "Old resolved defect",
      status: "RESOLVED",
      resolvedAt,
      createdAt: resolvedAt,
      updatedAt: resolvedAt,
    },
  });
};

describe("defectHousekeeping job", () => {
  it("archives old defects and creates DEFECT_ARCHIVED event with tenant-correct actor", async () => {
    const company = await createCompany({ name: "Housekeeping A" });
    const admin = await createUser({ companyId: company.id, role: "ADMIN" });
    const reporter = await createUser({ companyId: company.id, role: "DRIVER" });
    const vehicle = await createVehicle({ companyId: company.id, regNumber: "HK-A-1" });

    const resolvedAt = monthsAgo(7);
    const defect = await createResolvedDefect({
      companyId: company.id,
      vehicleId: vehicle.id,
      reportedByUserId: reporter.id,
      resolvedAt,
    });

    await runDefectHousekeepingOnce();

    const updated = await prisma.defect.findUnique({ where: { id: defect.id } });
    expect(updated.archivedAt).not.toBeNull();

    const event = await prisma.defectEvent.findFirst({
      where: { defectId: defect.id, type: "ARCHIVED" },
    });
    expect(event).toBeTruthy();
    expect(event.actorUserId).toBe(admin.id);
    expect(event.companyId).toBe(company.id);
  });

  it("purges old attachments and creates ATTACHMENT_PURGED event with tenant-correct actor", async () => {
    const company = await createCompany({ name: "Housekeeping Attachments" });
    const admin = await createUser({ companyId: company.id, role: "ADMIN" });
    const reporter = await createUser({ companyId: company.id, role: "DRIVER" });
    const vehicle = await createVehicle({ companyId: company.id, regNumber: "HK-A-2" });

    const resolvedAt = monthsAgo(7);
    const defect = await createResolvedDefect({
      companyId: company.id,
      vehicleId: vehicle.id,
      reportedByUserId: reporter.id,
      resolvedAt,
    });

    const attachment = await prisma.defectAttachment.create({
      data: {
        companyId: company.id,
        defectId: defect.id,
        uploadedByUserId: reporter.id,
        title: "Old attachment",
        mimeType: "image/png",
        size: 10,
        storagePath: "tmp/defect-attachment.png",
        createdAt: resolvedAt,
      },
    });

    await runDefectHousekeepingOnce();

    const updatedAttachment = await prisma.defectAttachment.findUnique({ where: { id: attachment.id } });
    expect(updatedAttachment.purgedAt).not.toBeNull();
    expect(updatedAttachment.storagePath).toBeNull();

    const event = await prisma.defectEvent.findFirst({
      where: { defectId: defect.id, type: "ATTACHMENT_PURGED" },
    });
    expect(event).toBeTruthy();
    expect(event.actorUserId).toBe(admin.id);
    expect(event.companyId).toBe(company.id);
  });

  it("if company has no admin, events are skipped but job does not crash", async () => {
    const company = await createCompany({ name: "Housekeeping No Admin" });
    const reporter = await createUser({ companyId: company.id, role: "DRIVER" });
    const vehicle = await createVehicle({ companyId: company.id, regNumber: "HK-B-1" });

    const resolvedAt = monthsAgo(7);
    const defect = await createResolvedDefect({
      companyId: company.id,
      vehicleId: vehicle.id,
      reportedByUserId: reporter.id,
      resolvedAt,
    });

    await runDefectHousekeepingOnce();

    const updated = await prisma.defect.findUnique({ where: { id: defect.id } });
    expect(updated.archivedAt).not.toBeNull();

    const event = await prisma.defectEvent.findFirst({
      where: { defectId: defect.id, type: "ARCHIVED" },
    });
    expect(event).toBeNull();
  });
});
