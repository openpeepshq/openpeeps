CREATE TABLE "ai_report_schedules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"report_id" uuid NOT NULL,
	"cron" text NOT NULL,
	"next_run" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_reports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_profile_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"html_body" text DEFAULT '' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_knowledge" (
	"id" uuid PRIMARY KEY NOT NULL,
	"doc_id" uuid NOT NULL,
	"chunk_id" text NOT NULL,
	"content" text NOT NULL,
	"embedding" halfvec(2560),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "embedding_spaces" (
	"id" uuid PRIMARY KEY NOT NULL,
	"model" text NOT NULL,
	"instruction" text NOT NULL,
	"dimension" integer NOT NULL,
	"space_scope" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jam_analyses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"jam_id" text NOT NULL,
	"recording_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"html_body" text DEFAULT '' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jam_transcripts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"jam_id" text NOT NULL,
	"recording_id" text NOT NULL,
	"segments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"embedding" halfvec(2560),
	"indexed_content_hash" text,
	"producer_outcome" text,
	"space_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_base_documents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"filename" text NOT NULL,
	"body" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_enrichments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"space_id" uuid,
	"enrichments" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topic_catalogs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"space_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"model_label" text NOT NULL,
	"created_by" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topic_centroids" (
	"id" uuid PRIMARY KEY NOT NULL,
	"catalog_id" uuid NOT NULL,
	"topic_id" integer NOT NULL,
	"label" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"embedding" halfvec(2560) NOT NULL,
	"num_docs" integer DEFAULT 0 NOT NULL,
	"score" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "embedding" halfvec(2560);--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "indexed_content_hash" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "producer_outcome" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "space_id" uuid;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "embedding" halfvec(2560);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "indexed_content_hash" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "producer_outcome" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "space_id" uuid;--> statement-breakpoint
CREATE INDEX "ai_report_schedules_report_idx" ON "ai_report_schedules" USING btree ("report_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_reports_slug_unique" ON "ai_reports" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "community_knowledge_doc_idx" ON "community_knowledge" USING btree ("doc_id");--> statement-breakpoint
CREATE UNIQUE INDEX "community_knowledge_doc_chunk_unique" ON "community_knowledge" USING btree ("doc_id","chunk_id");--> statement-breakpoint
CREATE INDEX "community_knowledge_embedding_cosine_idx" ON "community_knowledge" USING hnsw ("embedding" halfvec_cosine_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "embedding_spaces_one_active_scope" ON "embedding_spaces" USING btree ("space_scope") WHERE "embedding_spaces"."is_active" = true;--> statement-breakpoint
CREATE INDEX "jam_analyses_jam_idx" ON "jam_analyses" USING btree ("jam_id");--> statement-breakpoint
CREATE INDEX "jam_transcripts_jam_idx" ON "jam_transcripts" USING btree ("jam_id");--> statement-breakpoint
CREATE UNIQUE INDEX "jam_transcripts_recording_unique" ON "jam_transcripts" USING btree ("recording_id");--> statement-breakpoint
CREATE INDEX "jam_transcripts_embedding_cosine_idx" ON "jam_transcripts" USING hnsw ("embedding" halfvec_cosine_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_base_documents_slug_unique" ON "knowledge_base_documents" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "post_enrichments_post_unique" ON "post_enrichments" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "topic_catalogs_space_idx" ON "topic_catalogs" USING btree ("space_id");--> statement-breakpoint
CREATE UNIQUE INDEX "topic_catalogs_one_active" ON "topic_catalogs" USING btree ("is_active") WHERE "topic_catalogs"."is_active" = true;--> statement-breakpoint
CREATE INDEX "topic_centroids_catalog_idx" ON "topic_centroids" USING btree ("catalog_id");--> statement-breakpoint
CREATE INDEX "topic_centroids_embedding_cosine_idx" ON "topic_centroids" USING hnsw ("embedding" halfvec_cosine_ops);--> statement-breakpoint
CREATE INDEX "posts_embedding_cosine_idx" ON "posts" USING hnsw ("embedding" halfvec_cosine_ops);--> statement-breakpoint
CREATE INDEX "profiles_embedding_cosine_idx" ON "profiles" USING hnsw ("embedding" halfvec_cosine_ops);