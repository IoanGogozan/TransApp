-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "vipps_agreement_id" TEXT,
ADD COLUMN     "vipps_agreement_status" TEXT;

-- CreateTable
CREATE TABLE "vipps_charges" (
    "id" SERIAL NOT NULL,
    "subscription_id" INTEGER NOT NULL,
    "agreement_id" TEXT NOT NULL,
    "charge_id" TEXT,
    "external_id" TEXT NOT NULL,
    "due_date" TIMESTAMPTZ NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NOK',
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "vipps_charges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vipps_charges_subscription_id_idx" ON "vipps_charges"("subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "vipps_charges_agreement_id_external_id_key" ON "vipps_charges"("agreement_id", "external_id");

-- AddForeignKey
ALTER TABLE "vipps_charges" ADD CONSTRAINT "vipps_charges_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
