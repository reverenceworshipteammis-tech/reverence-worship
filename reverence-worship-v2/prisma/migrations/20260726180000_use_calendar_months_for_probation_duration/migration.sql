INSERT INTO "system_settings" ("key", "value", "group", "updated_at")
VALUES ('probation_default_duration_months', '4'::jsonb, 'probation', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE
SET "value" = EXCLUDED."value",
    "group" = EXCLUDED."group",
    "updated_at" = CURRENT_TIMESTAMP;

DELETE FROM "system_settings"
WHERE "key" = 'probation_default_duration_days';
