-- Add vehicle_id to timesheet_days
ALTER TABLE "timesheet_days"
ADD COLUMN "vehicle_id" INTEGER;

ALTER TABLE "timesheet_days"
ADD CONSTRAINT "timesheet_days_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

