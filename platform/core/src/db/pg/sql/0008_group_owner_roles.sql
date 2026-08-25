-- Rename group membership role admin → owner and split a true admin cap set.
UPDATE "user_groups"
SET "body" = jsonb_set(
  COALESCE("body", '{}'::jsonb),
  '{roles}',
  (
    SELECT COALESCE(jsonb_agg(to_jsonb(role)), '[]'::jsonb)
    FROM (
      SELECT DISTINCT CASE WHEN elem = 'admin' THEN 'owner' ELSE elem END AS role
      FROM jsonb_array_elements_text(COALESCE("body"->'roles', '[]'::jsonb)) AS elem
    ) renamed
  )
)
WHERE COALESCE("body"->'roles', '[]'::jsonb) ? 'admin';
--> statement-breakpoint
UPDATE "groups"
SET "body" = jsonb_set(
  "body" #- '{capabilities,admin}',
  '{capabilities,owner}',
  COALESCE("body"->'capabilities'->'admin', '{"add":["core-posts-*","core-groups-*"]}'::jsonb)
)
WHERE ("body"->'capabilities') ? 'admin'
  AND NOT (("body"->'capabilities') ? 'owner');
--> statement-breakpoint
UPDATE "groups"
SET "body" = jsonb_set(
  COALESCE("body", '{}'::jsonb),
  '{capabilities,admin}',
  '{"add":["core-posts-*","core-groups-read","core-groups-update","core-groups-join","core-groups-leave","core-groups-addMember","core-groups-removeMember","core-groups-changeMemberRole"]}'::jsonb
)
WHERE NOT (COALESCE("body"->'capabilities', '{}'::jsonb) ? 'admin');
