UPDATE "features"
SET "description" = CASE "name"
    WHEN 'update' THEN 'Update member-visible and confidential probation details.'
    WHEN 'complete' THEN 'Request administrator approval to complete probation.'
    WHEN 'terminate' THEN 'Request administrator approval to terminate probation.'
    ELSE "description"
  END,
  "updated_at" = CURRENT_TIMESTAMP
WHERE "page_id" = (SELECT "id" FROM "pages" WHERE "name" = 'probation')
  AND "name" IN ('update', 'complete', 'terminate');
