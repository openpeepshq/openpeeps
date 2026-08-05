CREATE TABLE "analytics_daily_activity_heatmap" (
	"id" uuid PRIMARY KEY NOT NULL,
	"day" date NOT NULL,
	"dow" integer NOT NULL,
	"hour" integer NOT NULL,
	"activity_count" integer DEFAULT 0 NOT NULL,
	"compiled_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_daily_by_group" (
	"id" uuid PRIMARY KEY NOT NULL,
	"day" date NOT NULL,
	"group_id" text NOT NULL,
	"posts" integer DEFAULT 0 NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"comments" integer DEFAULT 0 NOT NULL,
	"unique_viewers" integer DEFAULT 0 NOT NULL,
	"compiled_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_daily_signups_by_channel" (
	"id" uuid PRIMARY KEY NOT NULL,
	"day" date NOT NULL,
	"channel" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"compiled_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_daily_totals" (
	"day" date PRIMARY KEY NOT NULL,
	"new_members" integer DEFAULT 0 NOT NULL,
	"active_members" integer DEFAULT 0 NOT NULL,
	"posts" integer DEFAULT 0 NOT NULL,
	"replies" integer DEFAULT 0 NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"reposts" integer DEFAULT 0 NOT NULL,
	"bookmarks" integer DEFAULT 0 NOT NULL,
	"comments" integer DEFAULT 0 NOT NULL,
	"dms" integer DEFAULT 0 NOT NULL,
	"unique_viewers" integer DEFAULT 0 NOT NULL,
	"view_events" integer DEFAULT 0 NOT NULL,
	"jam_sessions" integer DEFAULT 0 NOT NULL,
	"jam_participants" integer DEFAULT 0 NOT NULL,
	"compiled_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_post_views_daily" (
	"id" uuid PRIMARY KEY NOT NULL,
	"day" date NOT NULL,
	"post_id" text NOT NULL,
	"unique_viewers" integer DEFAULT 0 NOT NULL,
	"view_events" integer DEFAULT 0 NOT NULL,
	"compiled_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_report_deliveries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"recipients" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_retention_cohorts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cohort_week" date NOT NULL,
	"cohort_size" integer DEFAULT 0 NOT NULL,
	"rates" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"compiled_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_heatmap_day_dow_hour" ON "analytics_daily_activity_heatmap" USING btree ("day","dow","hour");--> statement-breakpoint
CREATE INDEX "analytics_heatmap_day_idx" ON "analytics_daily_activity_heatmap" USING btree ("day");--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_daily_by_group_day_group" ON "analytics_daily_by_group" USING btree ("day","group_id");--> statement-breakpoint
CREATE INDEX "analytics_daily_by_group_day_idx" ON "analytics_daily_by_group" USING btree ("day");--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_signups_day_channel" ON "analytics_daily_signups_by_channel" USING btree ("day","channel");--> statement-breakpoint
CREATE INDEX "analytics_signups_day_idx" ON "analytics_daily_signups_by_channel" USING btree ("day");--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_post_views_day_post" ON "analytics_post_views_daily" USING btree ("day","post_id");--> statement-breakpoint
CREATE INDEX "analytics_post_views_day_idx" ON "analytics_post_views_daily" USING btree ("day");--> statement-breakpoint
CREATE INDEX "analytics_post_views_post_idx" ON "analytics_post_views_daily" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "analytics_report_deliveries_period_idx" ON "analytics_report_deliveries" USING btree ("period_start");--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_retention_cohort_week" ON "analytics_retention_cohorts" USING btree ("cohort_week");
