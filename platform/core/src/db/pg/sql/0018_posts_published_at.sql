ALTER TABLE "posts" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
UPDATE "posts" SET "published_at" = "created_at" WHERE "published_at" IS NULL;--> statement-breakpoint
CREATE INDEX "posts_creator_published_idx" ON "posts" USING btree ("creator_id","published_at");
