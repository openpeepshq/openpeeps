CREATE TABLE "access_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"email_validated" boolean DEFAULT false NOT NULL,
	"guest" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "configs" (
	"key" text PRIMARY KEY NOT NULL,
	"body" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "data_migrations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY NOT NULL,
	"handle" text NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "hashtags" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "i18n" (
	"id" uuid PRIMARY KEY NOT NULL,
	"locale" text NOT NULL,
	"namespace" text NOT NULL,
	"body" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "invite_links" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "jam_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "media_attachments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"visibility" text NOT NULL,
	"creator_id" text NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "processing_stats" (
	"id" uuid PRIMARY KEY NOT NULL,
	"filetype" text NOT NULL,
	"filesize" text NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "profile_settings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"handle" text NOT NULL,
	"activity_pub_domain" text,
	"type" text NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "account_to_push_subscription" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audience" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "controls" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "created_report" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "has_read" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "has_role" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "has_seen" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invite_link_creators" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invite_link_redeemers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "is_reported_object" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "is_reported_profile" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jam_recordings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mentions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_groups" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_hashtags" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_seen" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_access_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reply_to" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repost" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requests_follow" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_groups" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_email_unique" ON "accounts" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "groups_handle_unique" ON "groups" USING btree ("handle");--> statement-breakpoint
CREATE UNIQUE INDEX "hashtags_name_unique" ON "hashtags" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "i18n_locale_namespace" ON "i18n" USING btree ("locale","namespace");--> statement-breakpoint
CREATE UNIQUE INDEX "invite_links_slug_unique" ON "invite_links" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "jam_events_post_idx" ON "jam_events" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "notifications_profile_idx" ON "notifications" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "posts_type_idx" ON "posts" USING btree ("type");--> statement-breakpoint
CREATE INDEX "posts_visibility_idx" ON "posts" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "posts_creator_idx" ON "posts" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "processing_stats_filetype_idx" ON "processing_stats" USING btree ("filetype");--> statement-breakpoint
CREATE INDEX "processing_stats_filetype_size_idx" ON "processing_stats" USING btree ("filetype","filesize");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_settings_profile_unique" ON "profile_settings" USING btree ("profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_handle_domain_unique" ON "profiles" USING btree ("handle","activity_pub_domain");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_key_unique" ON "roles" USING btree ("key");--> statement-breakpoint
CREATE INDEX "account_to_push_subscription_from_idx" ON "account_to_push_subscription" USING btree ("from_id");--> statement-breakpoint
CREATE INDEX "account_to_push_subscription_to_idx" ON "account_to_push_subscription" USING btree ("to_id");--> statement-breakpoint
CREATE INDEX "audience_from_idx" ON "audience" USING btree ("from_id");--> statement-breakpoint
CREATE INDEX "audience_to_idx" ON "audience" USING btree ("to_id");--> statement-breakpoint
CREATE INDEX "bookmarks_from_idx" ON "bookmarks" USING btree ("from_id");--> statement-breakpoint
CREATE INDEX "bookmarks_to_idx" ON "bookmarks" USING btree ("to_id");--> statement-breakpoint
CREATE INDEX "controls_from_idx" ON "controls" USING btree ("from_id");--> statement-breakpoint
CREATE INDEX "controls_to_idx" ON "controls" USING btree ("to_id");--> statement-breakpoint
CREATE INDEX "created_report_from_idx" ON "created_report" USING btree ("from_id");--> statement-breakpoint
CREATE INDEX "created_report_to_idx" ON "created_report" USING btree ("to_id");--> statement-breakpoint
CREATE INDEX "entries_from_idx" ON "entries" USING btree ("from_id");--> statement-breakpoint
CREATE INDEX "entries_to_idx" ON "entries" USING btree ("to_id");--> statement-breakpoint
CREATE INDEX "follows_from_idx" ON "follows" USING btree ("from_id");--> statement-breakpoint
CREATE INDEX "follows_to_idx" ON "follows" USING btree ("to_id");--> statement-breakpoint
CREATE UNIQUE INDEX "follows_from_to_unique" ON "follows" USING btree ("from_id","to_id");--> statement-breakpoint
CREATE INDEX "has_read_from_idx" ON "has_read" USING btree ("from_id");--> statement-breakpoint
CREATE INDEX "has_read_to_idx" ON "has_read" USING btree ("to_id");--> statement-breakpoint
CREATE INDEX "has_role_from_idx" ON "has_role" USING btree ("from_id");--> statement-breakpoint
CREATE INDEX "has_role_to_idx" ON "has_role" USING btree ("to_id");--> statement-breakpoint
CREATE INDEX "has_seen_from_idx" ON "has_seen" USING btree ("from_id");--> statement-breakpoint
CREATE INDEX "has_seen_to_idx" ON "has_seen" USING btree ("to_id");--> statement-breakpoint
CREATE INDEX "invite_link_creators_from_idx" ON "invite_link_creators" USING btree ("from_id");--> statement-breakpoint
CREATE INDEX "invite_link_creators_to_idx" ON "invite_link_creators" USING btree ("to_id");--> statement-breakpoint
CREATE INDEX "invite_link_redeemers_from_idx" ON "invite_link_redeemers" USING btree ("from_id");--> statement-breakpoint
CREATE INDEX "invite_link_redeemers_to_idx" ON "invite_link_redeemers" USING btree ("to_id");--> statement-breakpoint
CREATE INDEX "is_reported_object_from_idx" ON "is_reported_object" USING btree ("from_id");--> statement-breakpoint
CREATE INDEX "is_reported_object_to_idx" ON "is_reported_object" USING btree ("to_id");--> statement-breakpoint
CREATE INDEX "is_reported_profile_from_idx" ON "is_reported_profile" USING btree ("from_id");--> statement-breakpoint
CREATE INDEX "is_reported_profile_to_idx" ON "is_reported_profile" USING btree ("to_id");--> statement-breakpoint
CREATE INDEX "jam_recordings_from_idx" ON "jam_recordings" USING btree ("from_id");--> statement-breakpoint
CREATE INDEX "jam_recordings_to_idx" ON "jam_recordings" USING btree ("to_id");--> statement-breakpoint
CREATE INDEX "mentions_from_idx" ON "mentions" USING btree ("from_id");--> statement-breakpoint
CREATE INDEX "mentions_to_idx" ON "mentions" USING btree ("to_id");--> statement-breakpoint
CREATE INDEX "post_groups_from_idx" ON "post_groups" USING btree ("from_id");--> statement-breakpoint
CREATE INDEX "post_groups_to_idx" ON "post_groups" USING btree ("to_id");--> statement-breakpoint
CREATE INDEX "post_hashtags_from_idx" ON "post_hashtags" USING btree ("from_id");--> statement-breakpoint
CREATE INDEX "post_hashtags_to_idx" ON "post_hashtags" USING btree ("to_id");--> statement-breakpoint
CREATE INDEX "post_seen_from_idx" ON "post_seen" USING btree ("from_id");--> statement-breakpoint
CREATE INDEX "post_seen_to_idx" ON "post_seen" USING btree ("to_id");--> statement-breakpoint
CREATE INDEX "profile_access_tokens_from_idx" ON "profile_access_tokens" USING btree ("from_id");--> statement-breakpoint
CREATE INDEX "profile_access_tokens_to_idx" ON "profile_access_tokens" USING btree ("to_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_access_tokens_from_to_unique" ON "profile_access_tokens" USING btree ("from_id","to_id");--> statement-breakpoint
CREATE INDEX "reactions_from_idx" ON "reactions" USING btree ("from_id");--> statement-breakpoint
CREATE INDEX "reactions_to_idx" ON "reactions" USING btree ("to_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reactions_from_to_unique" ON "reactions" USING btree ("from_id","to_id");--> statement-breakpoint
CREATE INDEX "reply_to_from_idx" ON "reply_to" USING btree ("from_id");--> statement-breakpoint
CREATE INDEX "reply_to_to_idx" ON "reply_to" USING btree ("to_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reply_to_from_to_unique" ON "reply_to" USING btree ("from_id","to_id");--> statement-breakpoint
CREATE INDEX "repost_from_idx" ON "repost" USING btree ("from_id");--> statement-breakpoint
CREATE INDEX "repost_to_idx" ON "repost" USING btree ("to_id");--> statement-breakpoint
CREATE UNIQUE INDEX "repost_from_to_unique" ON "repost" USING btree ("from_id","to_id");--> statement-breakpoint
CREATE INDEX "requests_follow_from_idx" ON "requests_follow" USING btree ("from_id");--> statement-breakpoint
CREATE INDEX "requests_follow_to_idx" ON "requests_follow" USING btree ("to_id");--> statement-breakpoint
CREATE INDEX "user_groups_from_idx" ON "user_groups" USING btree ("from_id");--> statement-breakpoint
CREATE INDEX "user_groups_to_idx" ON "user_groups" USING btree ("to_id");