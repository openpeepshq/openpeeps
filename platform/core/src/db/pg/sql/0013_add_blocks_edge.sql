CREATE TABLE "blocks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "blocks_from_idx" ON "blocks" USING btree ("from_id");--> statement-breakpoint
CREATE INDEX "blocks_to_idx" ON "blocks" USING btree ("to_id");--> statement-breakpoint
CREATE UNIQUE INDEX "blocks_from_to_unique" ON "blocks" USING btree ("from_id","to_id");
