ALTER TABLE "posts" ADD COLUMN "highlighted_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "posts_highlighted_at_idx" ON "posts" USING btree ("highlighted_at","id") WHERE "posts"."highlighted";
