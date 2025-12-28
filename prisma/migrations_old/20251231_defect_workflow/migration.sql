-- Defect workflow: comments, events, assignment

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DefectEventType') THEN
    CREATE TYPE "DefectEventType" AS ENUM ('CREATED', 'STATUS_CHANGED', 'ASSIGNED', 'UNASSIGNED', 'COMMENTED');
  END IF;
END$$;

-- Add assignee column
ALTER TABLE defects
  ADD COLUMN IF NOT EXISTS assigned_to_user_id integer REFERENCES users(id);

-- Comments table
CREATE TABLE IF NOT EXISTS defect_comments (
  id text PRIMARY KEY,
  company_id integer NOT NULL REFERENCES companies(id),
  defect_id text NOT NULL REFERENCES defects(id),
  user_id integer NOT NULL REFERENCES users(id),
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS defect_comments_company_defect_idx ON defect_comments (company_id, defect_id);

-- Events table
CREATE TABLE IF NOT EXISTS defect_events (
  id text PRIMARY KEY,
  company_id integer NOT NULL REFERENCES companies(id),
  defect_id text NOT NULL REFERENCES defects(id),
  type "DefectEventType" NOT NULL,
  actor_user_id integer NOT NULL REFERENCES users(id),
  data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS defect_events_company_defect_idx ON defect_events (company_id, defect_id);
