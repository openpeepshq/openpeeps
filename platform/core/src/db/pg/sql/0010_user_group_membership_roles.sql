-- Backfill user_groups.roles from pre-roles `capabilities` (Arango-era edges).
-- Memberships without roles fail private-group canReadPost while unseen SQL
-- still counts them by edge existence.
UPDATE "user_groups"
SET "body" = jsonb_set(
  COALESCE("body", '{}'::jsonb) - 'capabilities',
  '{roles}',
  CASE
    WHEN COALESCE("body"->'capabilities', '[]'::jsonb) ? '*'
      THEN '["owner"]'::jsonb
    ELSE '["member"]'::jsonb
  END
)
WHERE COALESCE("body"->'roles', '[]'::jsonb) = '[]'::jsonb
   OR "body"->'roles' IS NULL
   OR jsonb_typeof("body"->'roles') = 'null';
