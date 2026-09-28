CREATE TABLE "profile_hashtags" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "profile_hashtags_from_idx" ON "profile_hashtags" USING btree ("from_id");--> statement-breakpoint
CREATE INDEX "profile_hashtags_to_idx" ON "profile_hashtags" USING btree ("to_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_hashtags_from_to_unique" ON "profile_hashtags" USING btree ("from_id","to_id");