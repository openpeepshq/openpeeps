CREATE TABLE "analytics_daily_clicks" (
	"day" date NOT NULL,
	"kind" text NOT NULL,
	"target" text NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "analytics_daily_clicks_day_kind_target_pk" PRIMARY KEY("day","kind","target")
);
--> statement-breakpoint
CREATE INDEX "analytics_daily_clicks_day_kind_idx" ON "analytics_daily_clicks" USING btree ("day","kind");