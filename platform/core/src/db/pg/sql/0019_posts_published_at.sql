ALTER TABLE "posts" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
-- One-shot backfill of pre-existing rows only: posts created after this
-- migration rely on every write path (createPost non-draft, publishPost) to
-- set published_at, so do not re-run this or turn it into a rolling default.
UPDATE "posts" SET "published_at" = "created_at" WHERE "published_at" IS NULL;--> statement-breakpoint
CREATE INDEX "posts_creator_published_idx" ON "posts" USING btree ("creator_id","published_at");