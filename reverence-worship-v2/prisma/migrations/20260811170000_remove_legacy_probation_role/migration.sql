DELETE FROM "roles" role
WHERE role."name" = 'probation'
  AND NOT EXISTS (
    SELECT 1 FROM "role_user" assignment WHERE assignment."role_id" = role."id"
  )
  AND NOT EXISTS (
    SELECT 1 FROM "role_page_features" permission WHERE permission."role_id" = role."id"
  );
