-- Presence and timeliness are independent: a late member is still present.
-- Preserve the existing on_time=false value while normalizing the status.
UPDATE "attendance_records"
SET "status" = 'present'
WHERE LOWER("status") = 'late';
