-- Convert CLOSED statuses to RESOLVED before removing enum value
UPDATE "defects" SET "status" = 'RESOLVED' WHERE "status" = 'CLOSED';

-- Drop default to allow type change
ALTER TABLE "defects" ALTER COLUMN "status" DROP DEFAULT;

-- Create the new enum without CLOSED
CREATE TYPE "DefectStatus_new" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');

-- Switch column to the new enum
ALTER TABLE "defects" ALTER COLUMN "status" TYPE "DefectStatus_new" USING ("status"::text::"DefectStatus_new");

-- Replace old enum
ALTER TYPE "DefectStatus" RENAME TO "DefectStatus_old";
ALTER TYPE "DefectStatus_new" RENAME TO "DefectStatus";
DROP TYPE "DefectStatus_old";

-- Restore default
ALTER TABLE "defects" ALTER COLUMN "status" SET DEFAULT 'OPEN';
