UPDATE "posts"
SET "visibility" = 'group', "updated_at" = now()
WHERE "visibility" <> 'group'
  AND "id"::text IN (SELECT "from_id" FROM "post_groups");
