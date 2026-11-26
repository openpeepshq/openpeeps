CREATE TABLE "profile_seen" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_profile_views_daily" (
	"id" uuid PRIMARY KEY NOT NULL,
	"day" date NOT NULL,
	"profile_id" text NOT NULL,
	"unique_viewers" integer DEFAULT 0 NOT NULL,
	"view_events" integer DEFAULT 0 NOT NULL,
	"compiled_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "profile_seen_from_idx" ON "profile_seen" USING btree ("from_id");--> statement-breakpoint
CREATE INDEX "profile_seen_to_idx" ON "profile_seen" USING btree ("to_id");--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_profile_views_day_profile" ON "analytics_profile_views_daily" USING btree ("day","profile_id");--> statement-breakpoint
CREATE INDEX "analytics_profile_views_day_idx" ON "analytics_profile_views_daily" USING btree ("day");--> statement-breakpoint
CREATE INDEX "analytics_profile_views_profile_idx" ON "analytics_profile_views_daily" USING btree ("profile_id");
