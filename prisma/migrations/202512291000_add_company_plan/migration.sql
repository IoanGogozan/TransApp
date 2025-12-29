-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('BASIC', 'MEDIUM', 'PRO');

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "plan" "Plan" NOT NULL DEFAULT 'BASIC';
