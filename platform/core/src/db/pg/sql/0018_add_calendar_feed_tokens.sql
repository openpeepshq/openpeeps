CREATE TABLE "calendar_feed_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "profile_id" text NOT NULL REFERENCES "profiles"("id"),
  "token_hash" varchar(64) NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "calendar_feed_tokens_profile_idx" ON "calendar_feed_tokens" USING btree ("profile_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_feed_tokens_token_hash_unique" ON "calendar_feed_tokens" USING btree ("token_hash");
