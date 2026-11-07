-- Deduplicate existing has_role edges before constraining: keep the oldest
-- edge per (profile, role), drop the rest. uuidv7 ids are time-ordered.
DELETE FROM "has_role" a USING "has_role" b
WHERE a."from_id" = b."from_id"
  AND a."to_id" = b."to_id"
  AND a."id" > b."id";
--> statement-breakpoint
CREATE UNIQUE INDEX "has_role_from_to_unique" ON "has_role" USING btree ("from_id","to_id");
