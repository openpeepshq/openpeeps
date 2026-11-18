CREATE TABLE "at_blobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cid" text NOT NULL,
	"did" text NOT NULL,
	"media_id" text NOT NULL,
	"mime_type" text,
	"body" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "at_records" (
	"id" uuid PRIMARY KEY NOT NULL,
	"did" text NOT NULL,
	"collection" text NOT NULL,
	"rkey" text NOT NULL,
	"cid" text NOT NULL,
	"rev" text NOT NULL,
	"record" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"post_id" text,
	"profile_id" text,
	"follow_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "at_repo_commits" (
	"id" uuid PRIMARY KEY NOT NULL,
	"did" text NOT NULL,
	"rev" text NOT NULL,
	"commit_cid" text NOT NULL,
	"prev" text,
	"car" "bytea",
	"snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "at_uri" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "cid" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "did" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "at_handle" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "pds_endpoint" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "at_signing_public_key" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "at_signing_private_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "at_blobs_cid_unique" ON "at_blobs" USING btree ("cid");--> statement-breakpoint
CREATE INDEX "at_blobs_did_idx" ON "at_blobs" USING btree ("did");--> statement-breakpoint
CREATE INDEX "at_blobs_media_id_idx" ON "at_blobs" USING btree ("media_id");--> statement-breakpoint
CREATE UNIQUE INDEX "at_records_did_collection_rkey" ON "at_records" USING btree ("did","collection","rkey");--> statement-breakpoint
CREATE INDEX "at_records_did_idx" ON "at_records" USING btree ("did");--> statement-breakpoint
CREATE UNIQUE INDEX "at_records_did_cid" ON "at_records" USING btree ("did","cid");--> statement-breakpoint
CREATE INDEX "at_records_post_idx" ON "at_records" USING btree ("post_id");--> statement-breakpoint
CREATE UNIQUE INDEX "at_repo_commits_did_rev" ON "at_repo_commits" USING btree ("did","rev");--> statement-breakpoint
CREATE INDEX "at_repo_commits_did_idx" ON "at_repo_commits" USING btree ("did");--> statement-breakpoint
CREATE UNIQUE INDEX "posts_at_uri_unique" ON "posts" USING btree ("at_uri");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_did_unique" ON "profiles" USING btree ("did");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_at_handle_unique" ON "profiles" USING btree ("at_handle");