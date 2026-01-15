-- AlterEnum
ALTER TYPE "DefectEventType" ADD VALUE IF NOT EXISTS 'ATTACHMENT_ADDED';
ALTER TYPE "DefectEventType" ADD VALUE IF NOT EXISTS 'ATTACHMENT_DELETED';
ALTER TYPE "DefectEventType" ADD VALUE IF NOT EXISTS 'ARCHIVED';

-- AlterTable
ALTER TABLE "defects" ADD COLUMN "archived_at" TIMESTAMPTZ;

-- CreateTable
CREATE TABLE "defect_attachments" (
    "id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "defect_id" TEXT NOT NULL,
    "uploaded_by_user_id" INTEGER NOT NULL,
    "title" TEXT,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storage_path" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "defect_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "defect_attachments_company_id_defect_id_idx" ON "defect_attachments"("company_id", "defect_id");
CREATE INDEX "defect_attachments_company_id_created_at_idx" ON "defect_attachments"("company_id", "created_at");

-- AddForeignKey
ALTER TABLE "defect_attachments" ADD CONSTRAINT "defect_attachments_defect_id_fkey" FOREIGN KEY ("defect_id") REFERENCES "defects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "defect_attachments" ADD CONSTRAINT "defect_attachments_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
