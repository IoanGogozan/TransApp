-- Update ActivityType enum and add OvertimeType (idempotent for shadow)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ActivityType') THEN
    CREATE TYPE "ActivityType" AS ENUM ('DRIVING', 'OTHER_WORK', 'BREAK', 'AVAILABILITY');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OvertimeType') THEN
    CREATE TYPE "OvertimeType" AS ENUM ('OT_50', 'OT_100');
  END IF;
END $$;

-- Route options per company
CREATE TABLE "route_options" (
  "id" TEXT NOT NULL,
  "company_id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "route_options_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "route_options_company_id_name_key" ON "route_options"("company_id", "name");
CREATE INDEX "route_options_company_id_active_idx" ON "route_options"("company_id", "active");

ALTER TABLE "route_options" ADD CONSTRAINT "route_options_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Timesheet days
CREATE TABLE "timesheet_days" (
  "id" TEXT NOT NULL,
  "company_id" INTEGER NOT NULL,
  "user_id" INTEGER NOT NULL,
  "date" DATE NOT NULL,
  "route_option_id" TEXT,
  "note" TEXT,
  "overtime_type" "OvertimeType",
  "overtime_reason" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "timesheet_days_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "timesheet_days_user_id_date_key" ON "timesheet_days"("user_id", "date");
CREATE INDEX "timesheet_days_company_id_date_idx" ON "timesheet_days"("company_id", "date");

ALTER TABLE "timesheet_days" ADD CONSTRAINT "timesheet_days_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "timesheet_days" ADD CONSTRAINT "timesheet_days_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "timesheet_days" ADD CONSTRAINT "timesheet_days_route_option_id_fkey" FOREIGN KEY ("route_option_id") REFERENCES "route_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Timesheet entries
CREATE TABLE "timesheet_entries" (
  "id" TEXT NOT NULL,
  "timesheet_day_id" TEXT NOT NULL,
  "activity_type" "ActivityType" NOT NULL,
  "start_min" INTEGER NOT NULL,
  "end_min" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "timesheet_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "timesheet_entries_timesheet_day_id_idx" ON "timesheet_entries"("timesheet_day_id");

ALTER TABLE "timesheet_entries" ADD CONSTRAINT "timesheet_entries_timesheet_day_id_fkey" FOREIGN KEY ("timesheet_day_id") REFERENCES "timesheet_days"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
