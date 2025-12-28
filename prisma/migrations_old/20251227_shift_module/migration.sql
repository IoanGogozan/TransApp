-- Shift module migration: align shifts table to new shape and indexes.

ALTER TABLE shifts
  RENAME COLUMN driver_id TO user_id;

ALTER TABLE shifts
  RENAME COLUMN start_time TO start_at;

ALTER TABLE shifts
  RENAME COLUMN end_time TO end_at;

ALTER TABLE shifts
  ALTER COLUMN vehicle_id DROP NOT NULL;

ALTER TABLE shifts
  DROP COLUMN activity_type;

-- Indexes for common filters
CREATE INDEX IF NOT EXISTS shifts_company_user_idx ON shifts (company_id, user_id);
CREATE INDEX IF NOT EXISTS shifts_company_start_idx ON shifts (company_id, start_at);
