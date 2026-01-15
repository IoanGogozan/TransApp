-- DropIndex
DROP INDEX "checklist_instances_company_id_vehicle_id_date_key";

-- CreateIndex
CREATE UNIQUE INDEX "checklist_instances_company_id_vehicle_id_user_id_date_key" ON "checklist_instances"("company_id", "vehicle_id", "user_id", "date");