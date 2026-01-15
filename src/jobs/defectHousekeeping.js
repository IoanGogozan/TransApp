const path = require("path");
const cron = require("node-cron");
const fsp = require("fs/promises");
const prisma = require("../config/prismaClient");

const runDefectHousekeeping = async () => {
  if (process.env.NODE_ENV === "test") return;

  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - 6);

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
      storagePath: true,
    },
  });

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
  }

  console.info(
    `[defectHousekeeping] archived defects: ${result.count}, purged attachments: ${purgedCount}`,
  );
};

const startDefectHousekeeping = () => {
  if (process.env.NODE_ENV === "test") return;

  cron.schedule(
    "20 3 * * *",
    () => {
      runDefectHousekeeping().catch((err) => {
        console.info("[defectHousekeeping] failed", err);
      });
    },
    { timezone: "Europe/Oslo" },
  );
};

module.exports = { startDefectHousekeeping, runDefectHousekeeping };
