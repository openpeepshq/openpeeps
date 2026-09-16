ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "last_activity_at" timestamp with time zone;--> statement-breakpoint
UPDATE "posts" SET "last_activity_at" = "created_at" WHERE "last_activity_at" IS NULL;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "last_activity_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "last_activity_at" SET NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_last_activity_id_idx" ON "posts" USING btree ("last_activity_at","id");
