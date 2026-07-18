ALTER TABLE "attendance_sessions"
  ADD COLUMN IF NOT EXISTS "is_imported" BOOLEAN NOT NULL DEFAULT false;
