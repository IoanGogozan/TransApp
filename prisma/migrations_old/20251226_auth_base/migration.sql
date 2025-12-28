-- Add OWNER role and enforce unique email across users, ensure UTC timestamptz already applied.

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'OWNER';

-- Ensure email unique (previously scoped by company)
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON users (email);

-- Ensure company_id indexed (if not existing)
CREATE INDEX IF NOT EXISTS users_company_id_idx ON users (company_id);
