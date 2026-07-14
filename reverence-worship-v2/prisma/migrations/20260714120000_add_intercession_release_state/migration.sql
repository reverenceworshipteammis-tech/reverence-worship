ALTER TABLE "form_submissions"
ADD COLUMN IF NOT EXISTS "is_released" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "released_at" TIMESTAMP(3);

INSERT INTO "features" ("page_id", "name", "label", "description", "created_at", "updated_at")
SELECT "pages"."id", feature_data."name", feature_data."label", feature_data."description", NOW(), NOW()
FROM "pages"
CROSS JOIN (
  VALUES
    ('manage-forms', 'Manage Forms', 'Open and manage the Intercession form list.'),
    ('publish-forms', 'Publish Forms', 'Publish or unpublish spiritual forms.'),
    ('view-results', 'View Form Results', 'Review form responses and member results.'),
    ('view-reports', 'View Form Reports', 'Open Intercession participation reports.')
) AS feature_data("name", "label", "description")
WHERE "pages"."name" = 'intercession'
ON CONFLICT ("page_id", "name") DO NOTHING;
