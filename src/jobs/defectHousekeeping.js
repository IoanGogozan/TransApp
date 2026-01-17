const path = require("path");
const cron = require("node-cron");
const fsp = require("fs/promises");
const prisma = require("../config/prismaClient");
const logger = require("../config/logger");

const getAdminActorMap = async (companyIds) => {
  if (!companyIds || companyIds.length === 0) return new Map();
  const admins = await prisma.user.findMany({
    where: {
      companyId: { in: companyIds },
      role: { in: ["ADMIN", "PLATFORM_ADMIN"] },
    },
    select: { id: true, companyId: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  const map = new Map();
  for (const admin of admins) {
    if (!map.has(admin.companyId)) {
      map.set(admin.companyId, admin.id);
    }
  }
  return map;
};

const runDefectHousekeepingOnce = async () => {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - 6);

  const defectsToArchive = await prisma.defect.findMany({
    where: {
      archivedAt: null,
      resolvedAt: { not: null, lte: cutoff },
    },
    select: {
      id: true,
      companyId: true,
    },
  });

  const result = await prisma.defect.updateMany({
    where: {
      archivedAt: null,
      resolvedAt: { not: null, lte: cutoff },
    },
    data: { archivedAt: now },
  });

  const attachmentsToPurge = await prisma.defectAttachment.findMany({
    where: {
      purgedAt: null,
      storagePath: { not: null },
      defect: {
        resolvedAt: { lte: cutoff },
      },
    },
    select: {
      id: true,
      companyId: true,
      defectId: true,
      storagePath: true,
    },
  });

  const companyIds = Array.from(
    new Set([
      ...defectsToArchive.map((defect) => defect.companyId),
      ...attachmentsToPurge.map((attachment) => attachment.companyId),
    ]),
  );
  const actorMap = await getAdminActorMap(companyIds);

  if (defectsToArchive.length > 0) {
    const events = defectsToArchive.flatMap((defect) => {
      const actorUserId = actorMap.get(defect.companyId);
      if (!actorUserId) {
        logger.warn(
          { companyId: defect.companyId, defectId: defect.id },
          "[defectHousekeeping] no admin actor for archived defect; skipping event",
        );
        return [];
      }
      return [{
        companyId: defect.companyId,
        defectId: defect.id,
        actorUserId,
        type: "ARCHIVED",
        data: { archivedAt: now },
      }];
    });

    if (events.length > 0) {
      await prisma.defectEvent.createMany({ data: events });
    }
  }

  let purgedCount = 0;
  for (const attachment of attachmentsToPurge) {
    if (attachment.storagePath) {
      const absolutePath = path.join(process.cwd(), attachment.storagePath);
      await fsp.unlink(absolutePath).catch(() => null);
    }

    const updated = await prisma.defectAttachment.updateMany({
      where: { id: attachment.id },
      data: { storagePath: null, purgedAt: now },
    });
    purgedCount += updated.count;

    if (updated.count > 0) {
      const actorUserId = actorMap.get(attachment.companyId);
      if (!actorUserId) {
        logger.warn(
          { companyId: attachment.companyId, defectId: attachment.defectId, attachmentId: attachment.id },
          "[defectHousekeeping] no admin actor for purged attachment; skipping event",
        );
        continue;
      }
      await prisma.defectEvent.create({
        data: {
          companyId: attachment.companyId,
          defectId: attachment.defectId,
          actorUserId,
          type: "ATTACHMENT_PURGED",
          data: { attachmentId: attachment.id },
        },
      });
    }
  }

  logger.info(
    { archivedCount: result.count, purgedCount },
    "[defectHousekeeping] completed",
  );
};

const runDefectHousekeeping = async () => {
  if (process.env.NODE_ENV === "test") return;
  await runDefectHousekeepingOnce();
};

const startDefectHousekeeping = () => {
  if (process.env.NODE_ENV === "test") return;

  cron.schedule(
    "20 3 * * *",
    () => {
      runDefectHousekeepingOnce().catch((err) => {
        logger.error({ err }, "[defectHousekeeping] failed");
      });
    },
    { timezone: "Europe/Oslo" },
  );
};

module.exports = { startDefectHousekeeping, runDefectHousekeeping, runDefectHousekeepingOnce };
