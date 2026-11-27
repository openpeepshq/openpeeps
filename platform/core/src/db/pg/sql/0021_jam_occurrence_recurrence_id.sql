ALTER TABLE "jam_events" ADD COLUMN "recurrence_id" text;--> statement-breakpoint
CREATE INDEX "jam_events_post_recurrence_idx" ON "jam_events" USING btree ("post_id", "recurrence_id");--> statement-breakpoint
UPDATE "jam_events"
SET "recurrence_id" = "body"->>'recurrenceId'
WHERE "body" ? 'recurrenceId'
  AND "body"->>'recurrenceId' IS NOT NULL;--> statement-breakpoint
ALTER TABLE "analytics_daily_totals" ADD COLUMN "jam_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "analytics_daily_totals" ADD COLUMN "jam_unique_attendees" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "analytics_daily_totals" ADD COLUMN "jam_peak_concurrent" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "analytics_daily_totals" ADD COLUMN "jam_recordings_completed" integer DEFAULT 0 NOT NULL;
