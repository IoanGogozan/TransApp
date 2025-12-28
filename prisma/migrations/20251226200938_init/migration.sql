-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'DRIVER');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('DRIVING', 'OTHER_WORK', 'PAUSE', 'AVAILABILITY', 'OVERTIME_100');

-- CreateEnum
CREATE TYPE "DefectStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ChecklistAnswerValue" AS ENUM ('OK', 'DEVIATION', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "DefectSource" AS ENUM ('MANUAL', 'CHECKLIST');

-- CreateEnum
CREATE TYPE "DefectEventType" AS ENUM ('CREATED', 'STATUS_CHANGED', 'ASSIGNED', 'UNASSIGNED', 'COMMENTED');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('no', 'en', 'ro', 'pl', 'lt');

-- CreateTable
CREATE TABLE "companies" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "org_number" TEXT,
    "default_language" "Language" NOT NULL DEFAULT 'no',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'DRIVER',
    "language" "Language",
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "reg_number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "vehicle_id" INTEGER,
    "start_at" TIMESTAMPTZ NOT NULL,
    "end_at" TIMESTAMPTZ,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_instances" (
    "id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "checklist_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_answers" (
    "id" TEXT NOT NULL,
    "checklist_instance_id" TEXT NOT NULL,
    "question_key" TEXT NOT NULL,
    "answer" "ChecklistAnswerValue" NOT NULL,
    "comment" TEXT,
    "has_deviation" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "defects" (
    "id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "reported_by_user_id" INTEGER NOT NULL,
    "assigned_to_user_id" INTEGER,
    "checklist_instance_id" TEXT,
    "checklist_question_key" TEXT,
    "source" "DefectSource" NOT NULL DEFAULT 'MANUAL',
    "status" "DefectStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "resolved_at" TIMESTAMPTZ,

    CONSTRAINT "defects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "defect_comments" (
    "id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "defect_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "defect_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "defect_events" (
    "id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "defect_id" TEXT NOT NULL,
    "type" "DefectEventType" NOT NULL,
    "actor_user_id" INTEGER NOT NULL,
    "data" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "defect_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "users_company_id_idx" ON "users"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "vehicles_company_id_idx" ON "vehicles"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_company_id_reg_number_key" ON "vehicles"("company_id", "reg_number");

-- CreateIndex
CREATE INDEX "shifts_company_id_user_id_idx" ON "shifts"("company_id", "user_id");

-- CreateIndex
CREATE INDEX "shifts_company_id_start_at_idx" ON "shifts"("company_id", "start_at");

-- CreateIndex
CREATE INDEX "checklist_instances_company_id_date_idx" ON "checklist_instances"("company_id", "date");

-- CreateIndex
CREATE INDEX "checklist_instances_company_id_vehicle_id_date_idx" ON "checklist_instances"("company_id", "vehicle_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_instances_company_id_vehicle_id_date_key" ON "checklist_instances"("company_id", "vehicle_id", "date");

-- CreateIndex
CREATE INDEX "checklist_answers_checklist_instance_id_idx" ON "checklist_answers"("checklist_instance_id");

-- CreateIndex
CREATE INDEX "defects_company_id_status_idx" ON "defects"("company_id", "status");

-- CreateIndex
CREATE INDEX "defects_company_id_vehicle_id_idx" ON "defects"("company_id", "vehicle_id");

-- CreateIndex
CREATE INDEX "defects_company_id_created_at_idx" ON "defects"("company_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "defects_company_id_checklist_instance_id_checklist_question_key" ON "defects"("company_id", "checklist_instance_id", "checklist_question_key");

-- CreateIndex
CREATE INDEX "defect_comments_company_id_defect_id_idx" ON "defect_comments"("company_id", "defect_id");

-- CreateIndex
CREATE INDEX "defect_events_company_id_defect_id_idx" ON "defect_events"("company_id", "defect_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_instances" ADD CONSTRAINT "checklist_instances_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_instances" ADD CONSTRAINT "checklist_instances_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_instances" ADD CONSTRAINT "checklist_instances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_answers" ADD CONSTRAINT "checklist_answers_checklist_instance_id_fkey" FOREIGN KEY ("checklist_instance_id") REFERENCES "checklist_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defects" ADD CONSTRAINT "defects_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defects" ADD CONSTRAINT "defects_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defects" ADD CONSTRAINT "defects_reported_by_user_id_fkey" FOREIGN KEY ("reported_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defects" ADD CONSTRAINT "defects_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defects" ADD CONSTRAINT "defects_checklist_instance_id_fkey" FOREIGN KEY ("checklist_instance_id") REFERENCES "checklist_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defect_comments" ADD CONSTRAINT "defect_comments_defect_id_fkey" FOREIGN KEY ("defect_id") REFERENCES "defects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defect_comments" ADD CONSTRAINT "defect_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defect_events" ADD CONSTRAINT "defect_events_defect_id_fkey" FOREIGN KEY ("defect_id") REFERENCES "defects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defect_events" ADD CONSTRAINT "defect_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
