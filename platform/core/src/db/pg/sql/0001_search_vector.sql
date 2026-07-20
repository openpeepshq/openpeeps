CREATE OR REPLACE FUNCTION openpeeps_profiles_search_vector(
  p_handle text,
  p_body jsonb
) RETURNS tsvector
LANGUAGE sql
STABLE
AS $$
  SELECT to_tsvector('english', trim(
    coalesce(p_handle, '') || ' ' ||
    coalesce(p_body->>'displayName', '') || ' ' ||
    coalesce(p_body->>'bio', '') || ' ' ||
    coalesce(p_body->'location'->>'text', '') || ' ' ||
    coalesce((
      SELECT string_agg(f->>'value', ' ')
      FROM jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(p_body->'fields') = 'array' THEN p_body->'fields'
          ELSE '[]'::jsonb
        END
      ) AS f
    ), '')
  ));
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION openpeeps_groups_search_vector(
  p_handle text,
  p_body jsonb
) RETURNS tsvector
LANGUAGE sql
STABLE
AS $$
  SELECT to_tsvector('english', trim(
    coalesce(p_handle, '') || ' ' ||
    coalesce(p_body->>'displayName', '') || ' ' ||
    coalesce(p_body->>'description', '') || ' ' ||
    coalesce(p_body->>'rules', '')
  ));
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION openpeeps_posts_search_vector(p_body jsonb) RETURNS tsvector
LANGUAGE sql
STABLE
AS $$
  SELECT to_tsvector('english', trim(
    coalesce(p_body->>'content', '') || ' ' ||
    coalesce(p_body->>'name', '') || ' ' ||
    coalesce(p_body->'physicalLocation'->>'text', '') || ' ' ||
    coalesce(p_body->>'url', '') || ' ' ||
    coalesce((
      SELECT string_agg(o->>'content', ' ')
      FROM jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(p_body->'options') = 'array' THEN p_body->'options'
          ELSE '[]'::jsonb
        END
      ) AS o
    ), '') || ' ' ||
    coalesce((
      SELECT string_agg(
        coalesce(a->>'description', '') || ' ' || coalesce(a->>'filename', ''),
        ' '
      )
      FROM jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(p_body->'attachments') = 'array' THEN p_body->'attachments'
          ELSE '[]'::jsonb
        END
      ) AS a
    ), '')
  ));
$$;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "search_vector" "tsvector";--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "search_vector" "tsvector";--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "search_vector" "tsvector";--> statement-breakpoint
UPDATE "profiles"
SET "search_vector" = openpeeps_profiles_search_vector("handle", "body");--> statement-breakpoint
UPDATE "groups"
SET "search_vector" = openpeeps_groups_search_vector("handle", "body");--> statement-breakpoint
UPDATE "posts" SET "search_vector" = openpeeps_posts_search_vector("body");--> statement-breakpoint
CREATE OR REPLACE FUNCTION openpeeps_profiles_search_vector_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := openpeeps_profiles_search_vector(NEW.handle, NEW.body);
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION openpeeps_groups_search_vector_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := openpeeps_groups_search_vector(NEW.handle, NEW.body);
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION openpeeps_posts_search_vector_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := openpeeps_posts_search_vector(NEW.body);
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "profiles_search_vector_update"
BEFORE INSERT OR UPDATE OF "handle", "body" ON "profiles"
FOR EACH ROW
EXECUTE FUNCTION openpeeps_profiles_search_vector_trigger();--> statement-breakpoint
CREATE TRIGGER "groups_search_vector_update"
BEFORE INSERT OR UPDATE OF "handle", "body" ON "groups"
FOR EACH ROW
EXECUTE FUNCTION openpeeps_groups_search_vector_trigger();--> statement-breakpoint
CREATE TRIGGER "posts_search_vector_update"
BEFORE INSERT OR UPDATE OF "body" ON "posts"
FOR EACH ROW
EXECUTE FUNCTION openpeeps_posts_search_vector_trigger();--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "search_vector" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "groups" ALTER COLUMN "search_vector" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "search_vector" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "profiles_search_vector_idx" ON "profiles" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "groups_search_vector_idx" ON "groups" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "posts_search_vector_idx" ON "posts" USING gin ("search_vector");
