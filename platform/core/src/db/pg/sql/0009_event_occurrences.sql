CREATE TABLE IF NOT EXISTS "event_occurrences" (
	"id" uuid PRIMARY KEY NOT NULL,
	"post_id" uuid NOT NULL,
	"recurrence_id" timestamp with time zone NOT NULL,
	"start" timestamp with time zone NOT NULL,
	"end" timestamp with time zone,
	"cancelled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "event_occurrences_post_recurrence" ON "event_occurrences" USING btree ("post_id","recurrence_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_occurrences_start_idx" ON "event_occurrences" USING btree ("start");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_occurrences_post_idx" ON "event_occurrences" USING btree ("post_id");
--> statement-breakpoint
INSERT INTO "event_occurrences" ("id", "post_id", "recurrence_id", "start", "end", "cancelled")
SELECT gen_random_uuid(), "id",
  (body->>'start')::timestamptz,
  (body->>'start')::timestamptz,
  NULLIF(body->>'end', '')::timestamptz,
  false
FROM "posts"
WHERE "type" = 'event'
  AND "deleted_at" IS NULL
  AND body->>'start' IS NOT NULL
ON CONFLICT ("post_id", "recurrence_id") DO NOTHING;