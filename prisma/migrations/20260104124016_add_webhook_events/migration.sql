-- CreateEnum
CREATE TYPE "WebhookProvider" AS ENUM ('STRIPE', 'VIPPS');

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" SERIAL NOT NULL,
    "provider" "WebhookProvider" NOT NULL,
    "event_id" TEXT NOT NULL,
    "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ,
    "payload" JSONB NOT NULL,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_provider_event_id_key" ON "webhook_events"("provider", "event_id");
