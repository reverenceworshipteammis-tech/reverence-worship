-- Discipline sessions contain one record for every member present that day.
-- Backfill records that were previously omitted only because status was "late".
WITH discipline_sessions AS (
  SELECT
    "created_at"::date AS "session_date",
    "title",
    MIN("recorded_by") AS "recorded_by",
    MIN("created_at") AS "created_at"
  FROM "discipline_records"
  GROUP BY "created_at"::date, "title"
)
INSERT INTO "discipline_records" (
  "user_id",
  "title",
  "description",
  "points",
  "type",
  "status",
  "recorded_by",
  "created_at",
  "updated_at"
)
SELECT
  attendance."user_id",
  sessions."title",
  'Good',
  1,
  'positive',
  'active',
  sessions."recorded_by",
  sessions."created_at",
  NOW()
FROM discipline_sessions sessions
JOIN "attendance_records" attendance
  ON attendance."session_date" = sessions."session_date"
 AND LOWER(attendance."status") = 'present'
WHERE NOT EXISTS (
  SELECT 1
  FROM "discipline_records" existing
  WHERE existing."user_id" = attendance."user_id"
    AND existing."title" = sessions."title"
    AND existing."created_at"::date = sessions."session_date"
);
