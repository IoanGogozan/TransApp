/*
  Warnings:

  - The values [PAUSE,OVERTIME_100] on the enum `ActivityType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ActivityType_new" AS ENUM ('DRIVING', 'OTHER_WORK', 'BREAK', 'AVAILABILITY');
ALTER TABLE "timesheet_entries" ALTER COLUMN "activity_type" TYPE "ActivityType_new" USING ("activity_type"::text::"ActivityType_new");
ALTER TABLE "work_runs" ALTER COLUMN "activity_type" TYPE "ActivityType_new" USING ("activity_type"::text::"ActivityType_new");
ALTER TYPE "ActivityType" RENAME TO "ActivityType_old";
ALTER TYPE "ActivityType_new" RENAME TO "ActivityType";
DROP TYPE "public"."ActivityType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_company_id_fkey";

-- AlterTable
ALTER TABLE "route_options" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "timesheet_days" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "timesheet_entries" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "work_runs" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "customer_options" (
    "id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "customer_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_options_company_id_active_idx" ON "customer_options"("company_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "customer_options_company_id_name_key" ON "customer_options"("company_id", "name");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_options" ADD CONSTRAINT "customer_options_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
