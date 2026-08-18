-- Deduplicate before unique (from_id, to_id); keep oldest row per pair.
DELETE FROM "post_seen" a
USING "post_seen" b
WHERE a.from_id = b.from_id
  AND a.to_id = b.to_id
  AND a.id > b.id;
--> statement-breakpoint
CREATE UNIQUE INDEX "post_seen_from_to_unique" ON "post_seen" USING btree ("from_id","to_id");
