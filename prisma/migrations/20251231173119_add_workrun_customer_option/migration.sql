-- Add customer option relation to work_runs
ALTER TABLE "work_runs" ADD COLUMN "customer_option_id" TEXT;

ALTER TABLE "work_runs" ADD CONSTRAINT "work_runs_customer_option_id_fkey" FOREIGN KEY ("customer_option_id") REFERENCES "customer_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
