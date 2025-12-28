-- Checklist module migration

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ChecklistAnswerValue') THEN
    CREATE TYPE "ChecklistAnswerValue" AS ENUM ('OK', 'DEVIATION', 'NOT_APPLICABLE');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS checklist_instances (
  id text PRIMARY KEY,
  company_id integer NOT NULL REFERENCES companies(id),
  vehicle_id integer NOT NULL REFERENCES vehicles(id),
  user_id integer NOT NULL REFERENCES users(id),
  date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, vehicle_id, date)
);

CREATE INDEX IF NOT EXISTS checklist_instances_company_date_idx ON checklist_instances (company_id, date);
CREATE INDEX IF NOT EXISTS checklist_instances_company_vehicle_date_idx ON checklist_instances (company_id, vehicle_id, date);

CREATE TABLE IF NOT EXISTS checklist_answers (
  id text PRIMARY KEY,
  checklist_instance_id text NOT NULL REFERENCES checklist_instances(id) ON DELETE CASCADE,
  question_key text NOT NULL,
  answer "ChecklistAnswerValue" NOT NULL,
  comment text,
  has_deviation boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS checklist_answers_instance_idx ON checklist_answers (checklist_instance_id);

ALTER TABLE defects DROP CONSTRAINT IF EXISTS defects_checklistinstanceid_fkey;
ALTER TABLE defects ALTER COLUMN checklist_instance_id TYPE text;
ALTER TABLE defects
  ADD CONSTRAINT defects_checklistinstanceid_fkey FOREIGN KEY (checklist_instance_id)
    REFERENCES checklist_instances(id) ON DELETE SET NULL;
