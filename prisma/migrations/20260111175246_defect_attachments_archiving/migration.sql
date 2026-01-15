-- AlterEnum
ALTER TYPE "DefectEventType" ADD VALUE 'ATTACHMENT_PURGED';

-- AlterTable
ALTER TABLE "defect_attachments" ADD COLUMN     "purged_at" TIMESTAMPTZ,
ALTER COLUMN "storage_path" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "defect_attachments_company_id_purged_at_idx" ON "defect_attachments"("company_id", "purged_at");
