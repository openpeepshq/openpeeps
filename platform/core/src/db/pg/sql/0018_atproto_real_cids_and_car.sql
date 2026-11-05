DROP INDEX IF EXISTS "at_records_cid_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "at_records_did_cid" ON "at_records" USING btree ("did","cid");
--> statement-breakpoint
ALTER TABLE "at_repo_commits" ADD COLUMN IF NOT EXISTS "prev" text;
--> statement-breakpoint
ALTER TABLE "at_repo_commits" ADD COLUMN IF NOT EXISTS "car" bytea;
