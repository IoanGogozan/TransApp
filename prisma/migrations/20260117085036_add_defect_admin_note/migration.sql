-- AlterTable
ALTER TABLE "defects" ADD COLUMN     "admin_note" TEXT,
ADD COLUMN     "admin_note_updated_at" TIMESTAMPTZ,
ADD COLUMN     "admin_note_updated_by_user_id" INTEGER;

-- AddForeignKey
ALTER TABLE "defects" ADD CONSTRAINT "defects_admin_note_updated_by_user_id_fkey" FOREIGN KEY ("admin_note_updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
