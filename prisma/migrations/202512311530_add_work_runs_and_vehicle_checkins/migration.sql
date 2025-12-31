-- Create work_runs table
CREATE TABLE "work_runs" (
    "id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "activity_type" "ActivityType" NOT NULL,
    "route_option_id" TEXT NOT NULL,
    "vehicle_id" INTEGER,
    "started_at" TIMESTAMPTZ NOT NULL,
    "ended_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "work_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "work_runs_company_id_user_id_idx" ON "work_runs"("company_id", "user_id");
CREATE INDEX "work_runs_company_id_started_at_idx" ON "work_runs"("company_id", "started_at");
CREATE INDEX "work_runs_user_id_ended_at_idx" ON "work_runs"("user_id", "ended_at");

ALTER TABLE "work_runs" ADD CONSTRAINT "work_runs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_runs" ADD CONSTRAINT "work_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_runs" ADD CONSTRAINT "work_runs_route_option_id_fkey" FOREIGN KEY ("route_option_id") REFERENCES "route_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_runs" ADD CONSTRAINT "work_runs_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Prevent multiple active runs per user
CREATE UNIQUE INDEX "work_runs_active_user_idx" ON "work_runs"("user_id") WHERE "ended_at" IS NULL;

-- Create vehicle_checkins table
CREATE TABLE "vehicle_checkins" (
    "id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "all_ok" BOOLEAN NOT NULL DEFAULT TRUE,
    "note" TEXT,
    "checked_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "vehicle_checkins_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "vehicle_checkins_company_id_checked_at_idx" ON "vehicle_checkins"("company_id", "checked_at");
CREATE INDEX "vehicle_checkins_user_id_checked_at_idx" ON "vehicle_checkins"("user_id", "checked_at");
CREATE INDEX "vehicle_checkins_company_id_vehicle_id_checked_at_idx" ON "vehicle_checkins"("company_id", "vehicle_id", "checked_at");

ALTER TABLE "vehicle_checkins" ADD CONSTRAINT "vehicle_checkins_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vehicle_checkins" ADD CONSTRAINT "vehicle_checkins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vehicle_checkins" ADD CONSTRAINT "vehicle_checkins_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
