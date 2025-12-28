-- Defects module

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DefectStatus') THEN
    CREATE TYPE "DefectStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DefectSource') THEN
    CREATE TYPE "DefectSource" AS ENUM ('MANUAL', 'CHECKLIST');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS defects (
  id text PRIMARY KEY,
  company_id integer NOT NULL REFERENCES companies(id),
  vehicle_id integer NOT NULL REFERENCES vehicles(id),
  reported_by_user_id integer NOT NULL REFERENCES users(id),
  checklist_instance_id text REFERENCES checklist_instances(id),
  checklist_question_key text,
  source "DefectSource" NOT NULL DEFAULT 'MANUAL',
  status "DefectStatus" NOT NULL DEFAULT 'OPEN',
  title text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CONSTRAINT defects_unique_checklist UNIQUE (company_id, checklist_instance_id, checklist_question_key)
);

CREATE INDEX IF NOT EXISTS defects_company_status_idx ON defects (company_id, status);
CREATE INDEX IF NOT EXISTS defects_company_vehicle_idx ON defects (company_id, vehicle_id);
CREATE INDEX IF NOT EXISTS defects_company_created_idx ON defects (company_id, created_at);
