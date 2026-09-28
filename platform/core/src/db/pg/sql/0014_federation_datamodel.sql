ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "uri" text;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "inbox_url" text;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "shared_inbox_url" text;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "public_key_pem" text;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "private_key_pem" text;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "key_id" text;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "fetched_at" timestamp with time zone;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "profiles_uri_unique" ON "profiles" USING btree ("uri");
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "uri" text;
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "in_reply_to_uri" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "posts_uri_unique" ON "posts" USING btree ("uri");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_in_reply_to_uri_idx" ON "posts" USING btree ("in_reply_to_uri");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ap_activities" (
	"uri" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"actor_uri" text NOT NULL,
	"object_uri" text,
	"direction" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
  IF to_regclass('public.reactions') IS NOT NULL THEN
    INSERT INTO "entries" ("id", "from_id", "to_id", "body", "created_at", "updated_at")
    SELECT
      r."id",
      r."from_id",
      r."to_id",
      jsonb_build_object(
        'type', 'reaction',
        'data', CASE
          WHEN COALESCE(r."body", '{}'::jsonb) ? 'reaction'
            THEN COALESCE(r."body", '{}'::jsonb)
          ELSE jsonb_build_object('reaction', '👍')
        END
      ),
      r."created_at",
      r."updated_at"
    FROM "reactions" r
    WHERE NOT EXISTS (
      SELECT 1 FROM "entries" e WHERE e."id" = r."id"
    );
  END IF;
END $$;
--> statement-breakpoint
DROP TABLE IF EXISTS "reactions";
