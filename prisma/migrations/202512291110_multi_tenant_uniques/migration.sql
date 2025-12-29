-- Create new enum for user roles
CREATE TYPE "UserRole_new" AS ENUM ('PLATFORM_ADMIN', 'ADMIN', 'DRIVER');

-- Add slug column to companies
ALTER TABLE "companies" ADD COLUMN "slug" TEXT;

-- Backfill slug values with a simple slugify + collision handling
DO $$
DECLARE
  rec RECORD;
  base TEXT;
  slug_candidate TEXT;
  suffix INT;
BEGIN
  FOR rec IN SELECT id, name FROM "companies" LOOP
    base := lower(regexp_replace(COALESCE(rec.name, ''), '[^a-zA-Z0-9]+', '-', 'g'));
    base := trim(both '-' FROM base);
    IF base = '' THEN
      base := 'company';
    END IF;

    slug_candidate := base;
    suffix := 1;

    WHILE EXISTS (SELECT 1 FROM "companies" WHERE slug = slug_candidate AND id <> rec.id) LOOP
      slug_candidate := base || '-' || suffix::text;
      suffix := suffix + 1;
    END LOOP;

    UPDATE "companies" SET slug = slug_candidate WHERE id = rec.id;
  END LOOP;
END $$;

-- Make slug required and unique
ALTER TABLE "companies" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- Allow platform admins to have no company
ALTER TABLE "users" ALTER COLUMN "company_id" DROP NOT NULL;

-- Migrate role enum values (OWNER -> PLATFORM_ADMIN)
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new" USING
  (CASE "role"
     WHEN 'OWNER' THEN 'PLATFORM_ADMIN'
     WHEN 'ADMIN' THEN 'ADMIN'
     ELSE 'DRIVER'
   END)::"UserRole_new";
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "UserRole_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'DRIVER';

-- Drop global unique indexes
DROP INDEX IF EXISTS "User_email_key";
DROP INDEX IF EXISTS "User_phone_key";
DROP INDEX IF EXISTS "User_username_key";
DROP INDEX IF EXISTS "users_email_key";
DROP INDEX IF EXISTS "users_phone_key";
DROP INDEX IF EXISTS "users_username_key";

-- Add per-company unique constraints
CREATE UNIQUE INDEX "users_company_id_email_key" ON "users"("company_id", "email");
CREATE UNIQUE INDEX "users_company_id_phone_key" ON "users"("company_id", "phone");
CREATE UNIQUE INDEX "users_company_id_username_key" ON "users"("company_id", "username");
