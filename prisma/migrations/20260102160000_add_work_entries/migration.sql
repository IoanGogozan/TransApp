-- Create WorkEntrySource enum if missing
DO $$
BEGIN
  CREATE TYPE "WorkEntrySource" AS ENUM ('MANUAL', 'TACHOGRAPH');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Remove legacy tables
DROP TABLE IF EXISTS "timesheet_entries" CASCADE;
DROP TABLE IF EXISTS "timesheet_days" CASCADE;
DROP TABLE IF EXISTS "work_runs" CASCADE;

-- Create work_entries table
CREATE TABLE "work_entries" (
    "id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "activity_type" "ActivityType" NOT NULL,
    "duration_min" INTEGER NOT NULL,
    "customer_option_id" TEXT,
    "route_option_id" TEXT,
    "vehicle_id" INTEGER,
    "note" TEXT,
    "source" "WorkEntrySource" NOT NULL DEFAULT 'MANUAL',
    "external_ref" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "work_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "work_entries_company_id_user_id_date_idx" ON "work_entries"("company_id", "user_id", "date");
CREATE INDEX "work_entries_company_id_date_idx" ON "work_entries"("company_id", "date");
CREATE INDEX "work_entries_user_id_date_idx" ON "work_entries"("user_id", "date");
CREATE INDEX "work_entries_company_id_source_idx" ON "work_entries"("company_id", "source");

ALTER TABLE "work_entries" ADD CONSTRAINT "work_entries_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_entries" ADD CONSTRAINT "work_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_entries" ADD CONSTRAINT "work_entries_customer_option_id_fkey" FOREIGN KEY ("customer_option_id") REFERENCES "customer_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_entries" ADD CONSTRAINT "work_entries_route_option_id_fkey" FOREIGN KEY ("route_option_id") REFERENCES "route_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_entries" ADD CONSTRAINT "work_entries_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;